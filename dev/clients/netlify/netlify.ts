import type { Logger } from '@teambit/logger';
import type {
  NetlifyDeployRes,
  NetlifyUploadIndexRes,
} from './types/deploy-site';
import type { NetlifyCreateSiteOpts } from './types/create-site';
import type { NetlifyGetSiteResponse } from './types/get-site';
import { createWriteStream, readFileSync } from 'fs';
import { join, normalize } from 'path';
import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import archiver from 'archiver';
import { Agent } from 'https';
import { scanDirectoryAsync } from './utils/scan-directory';
import { AsyncQueue } from './queue';

const queue = new AsyncQueue(5, 1000, false);

export type NetlifyOptions = {
  userAgent?: string;
  scheme?: string;
  host?: string;
  pathPrefix?: string;
  agent?: string;
  globalParams?: any;
};

export class NetlifyAPI {
  constructor(readonly accessToken: string, readonly opts: NetlifyOptions) {}

  readonly API = `${this.opts.scheme || 'https'}://${
    this.opts.host || 'api.netlify.com'
  }${this.opts.pathPrefix || '/api/v1'}`;

  private instance = axios.create({
    baseURL: this.API,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      'User-Agent': this.opts.userAgent || 'bit/netlify-client',
    },
    httpsAgent: new Agent({
      keepAlive: true,
    }),
  });

  private async getSiteById(id: string) {
    try {
      const res = await this.instance.get(`/sites/${id}`);
      return res.data as NetlifyGetSiteResponse;
    } catch (e) {
      return null;
    }
  }

  private async getSiteByName(name: string) {
    const netlifyUrl = name.includes('.') ? name : `${name}.netlify.app`;
    try {
      const res = await this.instance.get(`/sites/${netlifyUrl}`);
      return res.data as NetlifyGetSiteResponse;
    } catch (e) {
      return null;
    }
  }

  private async createSite(opts: NetlifyCreateSiteOpts, team?: string) {
    const url = team ? `/${team}/sites` : '/sites';

    const res = await this.instance.post(url, opts).catch((e: AxiosError) => {
      const hint =
        e.code === 'ERR_BAD_REQUEST'
          ? 'The token provided may not have permissions to create sites in this team or account.'
          : '';

      throw new Error(
        `Failed to create site (${opts.name}): ${e.message} ${
          e.code ? `- ${e.code}` : ''
        } \n${hint}`
      );
    });
    return res.data as NetlifyGetSiteResponse;
  }

  private async uploadFile(
    id: string,
    file: string,
    dir: string,
    maxRetries = 3,
    logger?: Logger
  ) {
    let retries = 0;

    logger?.console(`Uploading file ${file}`);

    while (retries < maxRetries) {
      try {
        const content = readFileSync(join(dir, file));

        const res = await this.instance.put(
          `/deploys/${id}/files${file}`,
          content,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          }
        );

        return res.data as NetlifyUploadIndexRes;
      } catch (error) {
        logger?.console(
          `Failed to upload file ${file} - retrying (${
            retries + 1
          }/${maxRetries})`
        );
        retries += 1;

        if (retries === maxRetries) {
          throw error;
        }
      }
    }
  }

  /**
   * Get a site by id or name. If the site does not exist, create it.
   * @param id
   * @param name
   * @param opts
   * @returns
   */
  async getOrCreateSite(
    id?: string,
    name?: string,
    team?: string,
    opts?: NetlifyCreateSiteOpts
  ) {
    if (!id && !name) {
      throw new Error('Either id or name must be provided');
    }

    const site = id
      ? await this.getSiteById(id)
      : await this.getSiteByName(name as string);

    if (!site) {
      if (!opts) {
        throw new Error('Site not found');
      }
      return this.createSite(opts, team);
    }

    return site;
  }

  /**
   * Deploy a directory to a site
   * @param id {string} - Site id
   * @param dir {string} - Directory to deploy
   * @returns
   * @example
   * const site = await netlify.getOrCreateSite("my-site-id");
   * const deploy = await netlify.deploy(site.id, "./dist");
   */
  async deploy(id: string, dir: string, message?: string, logger?: Logger) {
    const files = await scanDirectoryAsync(dir);

    const filesIndex = files.map((file) => {
      const hash = crypto.createHash('sha1');
      const fileContent = readFileSync(file);
      hash.update(fileContent);
      const hashDigest = hash.digest('hex');
      const normalizedPath = normalize(file.replace(dir, '')).replace(
        /\\/g,
        '/'
      );
      return {
        path: normalizedPath,
        hash: hashDigest,
      };
    });

    const fileObject = {};
    for (const file of filesIndex) {
      fileObject[file.path] = file.hash;
    }

    const deployUrl = message
      ? `${this.API}/sites/${id}/deploys?title="${message}"`
      : `${this.API}/sites/${id}/deploys`;

    // upload file index
    const uploadIndexRes = await this.instance
      .post(deployUrl, {
        files: fileObject,
      })
      .catch((e) => {
        throw new Error(`Failed to upload file index: ${e.message}`);
      });

    const uploadIndexData = uploadIndexRes.data as NetlifyUploadIndexRes;

    const longProcess = logger?.createLongProcessLogger(
      'Uploading files',
      uploadIndexData.required.length
    );

    function cleanPath(path: string) {
      // if it ends with index.html, and is not the root index.html, remove the index.html
      if (path.endsWith('index.html') && path !== 'index.html') {
        return path.replace('/index.html', '');
      }

      return path;
    }

    const uploadedFiles: string[] = [];

    for (const sha of uploadIndexData.required) {
      queue.addTask(async () => {
        const file = filesIndex.find((file) => file.hash === sha);
        if (!file) {
          longProcess?.logProgress(`${sha} not found`);
          return;
        }
        await this.uploadFile(uploadIndexData.id, file.path, dir);
        uploadedFiles.push(file.path);
        longProcess?.logProgress(cleanPath(file.path));
      });
    }

    queue.startProcessing();

    if (uploadIndexData.required.length > 0) {
      await queue.waitUntilAllFinished();
    }

    longProcess?.end();
    logger?.console(
      `Uploaded ${uploadedFiles.length}/${files.length} files! (skipped ${
        files.length - uploadedFiles.length
      })`
    );

    // get deploy by id
    const deployRes = await this.instance.get(
      `/sites/${id}/deploys/${uploadIndexData.id}`
    );

    const deployData = deployRes.data as NetlifyDeployRes;
    return deployData;
  }

  async deployAsZip(id: string, dir: string, message?: string) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = createWriteStream('output.zip');

    archive.pipe(output);

    archive.directory(dir, false);

    // wait for 'close' event
    await new Promise(async (resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      await archive.finalize();
    });

    const res = await this.instance.post(
      `/sites/${id}/deploys?title="${message}"`,
      output,
      {
        headers: {
          'Content-Type': 'application/zip',
        },
      }
    );

    return res.data as NetlifyDeployRes;
  }
}
