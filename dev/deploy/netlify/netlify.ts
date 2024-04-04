import { NetlifyAPI } from '@cohen-codes/dev.clients.netlify';
import { Capsule } from '@teambit/isolator';
import { AppDeployContext } from '@teambit/application';
import { Logger } from '@teambit/logger';
import { join } from 'path';
import crypto from 'crypto';
import { NetlifyError } from './exceptions/netlify';

export type NetlifyOptions = {
  /**
   * Your Netlify authentication token.
   * You can generate one in Netlify's 'User settings' page.
   * @see https://app.netlify.com/user/applications#personal-access-tokens
   */
  accessToken: string;
  /**
   * Your Netlify team slug (this can be modified in Netlify's 'Team settings')
   * @see https://app.netlify.com/user/applications#personal-access-tokens
   */
  team: string;
  /**
   * Your Netlify production site name. Your app will be deployed to this location whenever you tag your app component.
   * The site will have the following url: https://YOUR_SITE_NAME.netlify.app/
   */
  productionSiteName?: string;
  /**
   * Your Netlify staging site name. If this name is not provided, the sitename will be generated from the lane id (if exists) and the hash of the component ID.
   * The site will have the following url: https://YOUR_SITE_NAME.netlify.app/
   */
  stagingSiteName?: string;
  /**
   * Skip deploys if it's on a lane
   * @default false
   */
  skipLaneDeployments?: boolean;
  /**
   * Password for lane deploys
   * @default 123456
   */
  password?: string;
  /**
   * If set to true, the deployer will use the default `__redirects` file instead of the one provided by the component (if exists).
   * @default false
   * @see https://docs.netlify.com/routing/redirects/
   */
  useDefaultRedirectsForSPA?: boolean;
  /* Skip all deploys */
  skipDeployment?: boolean;
};

export type DeployContext = {
  publicDir?: string;
  metadata?: Record<string, any>;
} & AppDeployContext;

export class Netlify {
  constructor(readonly options: NetlifyOptions) {}

  readonly redirectsFilename = '_redirects';

  static deploy(options: NetlifyOptions) {
    const netlify = new Netlify(options);
    return async (deployContext: DeployContext): Promise<void> => {
      await netlify.deploy(deployContext);
    };
  }

  private async deploy(context: DeployContext): Promise<void> {
    const { capsule, pipeName, laneId } = context;
    const logger = new Logger(`netlify-${capsule.component.id.toString()}`);

    const publicDir = this.getPublicDir(context);

    if (this.options.skipDeployment) {
      logger.console(
        'Skipping deploy to Netlify because skipDeployment is set to true.'
      );
      return;
    }

    if (this.options.skipLaneDeployments && laneId) {
      logger.console(
        'Skipping deploy to Netlify because it is on a lane. You can disable this behavior by setting skipLaneDeploys to false.'
      );

      return;
    }

    if (!publicDir) throw new NetlifyError('public dir was not defined');
    if (!this.options.accessToken)
      throw new NetlifyError('Access token for Netlify was not provided');

    this.setRedirects(capsule, publicDir);
    this.setTomlFile(capsule, publicDir);
    this.setHeaders(capsule, publicDir);

    if (pipeName === 'tag' && !this.options.productionSiteName) {
      logger.console(
        'No production site name was provided. Skipping deploy to Netlify.'
      );
      return;
    }

    const site = await this.getOrCreateSite(capsule, pipeName, laneId);

    if (!site) throw new NetlifyError('could not find or create a site');

    try {
      const res = await this.netlifyClient.deploy(
        site.id,
        capsule.fs.getPath(publicDir),
        this.getMessage(),
        logger
      );

      logger.console(`Deployed ${site.name} to ${res.ssl_url}`);
    } catch (error: any) {
      throw new NetlifyError(
        `failed to deploy to Netlify ${JSON.stringify(error, null, 2)}`
      );
    }
  }

  /*
   * the public directory may be defined in context.publicDir or in context.metadata.publicDir
   */
  private getPublicDir(context: DeployContext): string | undefined {
    if (context.publicDir) return context.publicDir;
    if (context.metadata?.publicDir) return context.metadata.publicDir;
    return undefined;
  }

  private async getOrCreateSite(
    capsule: Capsule,
    pipeName: AppDeployContext['pipeName'],
    laneId?: AppDeployContext['laneId']
  ) {
    const name = this.generateSiteName(capsule, pipeName, laneId);
    try {
      return this.netlifyClient.getOrCreateSite(
        undefined, // we don't use the site ID
        name,
        this.options.team,
        {
          name,
          password: laneId ? this.options.password || '123456' : undefined,
        }
      );
    } catch (err: any) {
      throw new NetlifyError(
        `Failed to get or create site ${name} from Netlify ${JSON.stringify(
          err,
          null,
          2
        )}`
      );
    }
  }

  private generateSiteName(
    capsule: Capsule,
    pipeName: AppDeployContext['pipeName'],
    laneId?: AppDeployContext['laneId']
  ): string {
    const { productionSiteName, stagingSiteName } = this.options;
    if (productionSiteName && pipeName === 'tag') {
      return productionSiteName;
    }
    if (pipeName === 'snap' && (stagingSiteName || laneId)) {
      if (stagingSiteName) return stagingSiteName;

      return `staging-${this.replaceDisallowedChars(
        laneId?.name as string
      )}-${this.generateComponentSha(capsule)}`;
    }
    const name = capsule.component.id
      .toStringWithoutVersion()
      .replace(/\./g, '-')
      .replace(new RegExp('/', 'g'), '-')
      .replace('@', '-');
    return laneId
      ? `${name}-${this.replaceDisallowedChars(laneId.name)}`
      : name;
  }

  private replaceDisallowedChars(input: string): string {
    return input.replace(
      // eslint-disable-next-line no-useless-escape
      /[\s,@.#\$%\^&\*\(\)\[\]{}<>\?\\\/\+\=;:'"!@#$%^&*]+/g,
      '-'
    );
  }

  private generateComponentSha(capsule: Capsule): string {
    return crypto
      .createHash('sha1')
      .update(capsule.component.id.toStringWithoutVersion())
      .digest('hex')
      .substring(0, 7);
  }

  private setRedirects(capsule: Capsule, publicDir: string): void {
    const defaultRedirectsFilename = this.redirectsFilename;

    if (this.options.useDefaultRedirectsForSPA) {
      capsule.fs.writeFileSync(
        join(publicDir, this.redirectsFilename),
        '/*    /index.html   200'
      );
    } else if (capsule.fs.existsSync(defaultRedirectsFilename)) {
      const fileContent = capsule.fs.readFileSync(
        defaultRedirectsFilename,
        'utf-8'
      );

      capsule.fs.writeFileSync(
        join(publicDir, this.redirectsFilename),
        fileContent
      );
    }
  }

  private setTomlFile(capsule: Capsule, publicDir: string): void {
    const tomlFile = 'netlify.toml';

    if (capsule.fs.existsSync(tomlFile)) {
      const fileContent = capsule.fs.readFileSync(tomlFile, 'utf-8');
      capsule.fs.writeFileSync(join(publicDir, tomlFile), fileContent);
    }
  }

  private setHeaders(capsule: Capsule, publicDir: string): void {
    const headersFile = '_headers';

    if (capsule.fs.existsSync(headersFile)) {
      const fileContent = capsule.fs.readFileSync(headersFile, 'utf-8');
      capsule.fs.writeFileSync(join(publicDir, headersFile), fileContent);
    }
  }

  private getMessage() {
    const messageIndex = process.argv.findIndex(
      (arg) => arg === '--message' || arg === '-m'
    );

    if (messageIndex === -1) return 'Bit component deploy';
    return process.argv[messageIndex + 1];
  }

  private get netlifyClient() {
    const { accessToken } = this.options;
    return new NetlifyAPI(accessToken, {
      userAgent: 'bit/netlify',
    });
  }
}
