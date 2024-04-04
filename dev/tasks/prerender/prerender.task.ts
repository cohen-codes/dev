import type {
  BuildTask,
  BuildContext,
  BuiltTaskResult,
  ComponentResult,
  TaskHandler,
  TaskLocation,
} from '@teambit/builder';
import { Capsule } from '@teambit/isolator';
import type { EnvContext } from '@teambit/envs';
import type { Logger } from '@teambit/logger';
import {
  inject,
  InjectedHtmlElement,
} from '@teambit/html.modules.inject-html-element';
import { Route } from '@teambit/community.tasks.generate-app-routes';
import path, { dirname } from 'path';
import fs, { readFileSync } from 'fs';
import { platform } from 'os';
import { execSync, spawn, spawnSync } from 'child_process';
import { globSync } from 'glob';
import { prerenderer } from './puppeteer';

export type PrerenderTaskOptions = {
  name?: string;
  /**
   * Function that takes the HTML and route and transforms it.
   * This is useful for injecting scripts, styles, etc.
   * @param route - the route that was rendered
   * @param html - the HTML that was rendered
   * @param injectElement - a function that takes an HTML element and injects it into the HTML
   */
  postProcess?: (renderedRoute: {
    route: string;
    html: string;
    /**
     * Injects an HTML element into the rendered HTML.
     */
    injectHtml: (element: InjectedHtmlElement) => string;
  }) => string;
  routes?: Route[];
};
export class PrerenderTask implements BuildTask {
  constructor(
    readonly aspectId: string,
    readonly logger: Logger,
    private options: PrerenderTaskOptions
  ) {}

  readonly name = 'Prerender';

  dependencies = ['teambit.harmony/application:build_application'];

  location?: TaskLocation | undefined = 'end';

  /**
   * check if the current OS is supported by Playwright
   * @returns boolean
   */
  private isSupportedOS(): boolean {
    const currentPlatform = platform();
    switch (currentPlatform) {
      case 'win32':
        return true;
      case 'darwin':
        return true;
      case 'linux':
        // eslint-disable-next-line no-case-declarations
        const aptGetPath = spawnSync('which', ['apt-get']);
        return aptGetPath.stdout.toString().trim() !== '';
      default:
        return false;
    }
  }

  private async installPlaywright(capsule: Capsule): Promise<void> {
    this.logger.console('OS supported by Playwright, installing using NPX...');
    return new Promise((resolve, reject) => {
      const childInstall = spawn(
        '/bin/sh',
        ['-c', 'npx playwright install --with-deps chromium'],
        {
          shell: false,
          stdio: 'pipe',
          cwd: capsule.path,
        }
      );
      childInstall.stdout.on('data', (data) => {
        this.logger.console(data.toString());
      });
      childInstall.stderr.on('data', (data) => {
        this.logger.console(data.toString());
      });
      childInstall.on('error', (error) => {
        this.logger.console(`Error: ${error.message}`);
        reject(error);
      });
      childInstall.on('close', (code) => {
        if (code !== 0) {
          this.logger.console(`Process exited with code ${code}`);
          reject(new Error(`Process exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }

  private async installDependencies(): Promise<void> {
    // Update repositories
    const repositories = [
      'http://dl-cdn.alpinelinux.org/alpine/edge/main',
      'http://dl-cdn.alpinelinux.org/alpine/edge/community',
      'http://dl-cdn.alpinelinux.org/alpine/edge/testing',
      'http://dl-cdn.alpinelinux.org/alpine/v3.12/main',
    ];
    for (const repo of repositories) {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('echo', [repo, '>>', '/etc/apk/repositories'], {
          stdio: 'inherit',
          shell: '/bin/sh',
        });
        child.on('exit', (code) => (code === 0 ? resolve() : reject()));
      });
    }
    // Upgrade all installed packages
    await new Promise<void>((resolve, reject) => {
      const child = spawn('apk', ['upgrade', '-U', '-a'], {
        stdio: 'inherit',
        shell: '/bin/sh',
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject()));
    });
    // Install packages
    const packages = [
      'libstdc++',
      'chromium',
      'harfbuzz',
      'nss',
      'freetype',
      'ttf-freefont',
      'font-noto-emoji',
      'wqy-zenhei',
      'tini',
    ];
    for (const pkg of packages) {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('apk', ['add', pkg], {
          stdio: 'inherit',
          shell: '/bin/sh',
        });
        child.on('exit', (code) => (code === 0 ? resolve() : reject()));
      });
    }
    // Clean up
    await new Promise<void>((resolve, reject) => {
      const child = spawn('rm', ['-rf', '/var/cache/*'], {
        stdio: 'inherit',
        shell: '/bin/sh',
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject()));
    });
    await new Promise<void>((resolve, reject) => {
      const child = spawn('mkdir', ['/var/cache/apk'], {
        stdio: 'inherit',
        shell: '/bin/sh',
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject()));
    });
    // Set environment variables
    process.env.CHROME_BIN = '/usr/bin/chromium-browser';
    process.env.CHROME_PATH = '/usr/lib/chromium/';
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
  }

  async preBuild(context: BuildContext): Promise<void> {
    const whoami = execSync('whoami').toString().trim();
    if (whoami !== 'root') {
      this.logger.consoleWarning(
        `You are running as ${whoami}. This task may require root privileges.`
      );
    }
    const isSupported = this.isSupportedOS();

    await Promise.all(
      context.capsuleNetwork.seedersCapsules.map(async (capsule) => {
        this.logger.console(
          `Installing Playwright for ${capsule.component.id}`
        );
        if (isSupported) {
          try {
            await this.installPlaywright(capsule)
              .then(() => {
                this.logger.consoleSuccess('Playwright installed successfully');
              })
              .catch((error) => {
                this.logger.consoleFailure(
                  `Error executing command: ${error.message}`
                );
                throw error;
              });
          } catch (error: any) {
            this.logger.consoleFailure(`Unexpected error: ${error.message}`);
          }
        } else {
          this.logger.consoleWarning(
            `Your OS is not directly supported by Playwright, trying to install the dependencies using APK...`
          );
          try {
            await this.installDependencies();
          } catch (error: any) {
            this.logger.consoleFailure(
              `Error installing dependencies: ${error.message}`
            );
            throw error;
          }
        }
      })
    );
  }

  async execute(context: BuildContext): Promise<BuiltTaskResult> {
    const componentsResults: ComponentResult[] = [];
    const capsules = context.capsuleNetwork.seedersCapsules;
    const generatedFiles: string[] = [];

    await Promise.all(
      capsules.map(async (capsule) => {
        const prerender = capsule.component.id.name;
        const capsuleDir = capsule.path;
        const errors = [];
        const publicFolderIndex = globSync('**/public/index.html', {
          cwd: capsuleDir,
          absolute: true,
          ignore: ['**/node_modules/**'],
        })[0];
        if (!publicFolderIndex) {
          return { component: capsule.component, errors };
        }
        const routes =
          this.options.routes ||
          (JSON.parse(
            readFileSync(path.join(capsuleDir, 'dist', 'routes.json'), 'utf-8')
          ) as Route[]);
        const paths = routes.map((route) => route.path) as string[];
        this.logger.console(`Routes for ${prerender}: ${routes.length}`);
        const publicFolder = publicFolderIndex.replace('index.html', '');
        const isSupported = this.isSupportedOS();
        const results = await prerenderer(
          paths,
          publicFolder,
          this.logger,
          isSupported
        );
        this.logger.console(
          `Prerendered ${prerender} to ${publicFolder} with ${results.length} routes`
        );
        // write the results to the component's folder
        results.forEach((result) => {
          const filePath = path.join(publicFolder, result.route, 'index.html');
          if (!fs.existsSync(dirname(filePath))) {
            fs.mkdirSync(dirname(filePath), { recursive: true });
          }
          let newHtml: string | null = null;
          if (this.options.postProcess) {
            newHtml = this.options.postProcess({
              route: result.route,
              html: result.html,
              injectHtml: (element: InjectedHtmlElement) =>
                inject(result.html, element),
            });
          }
          fs.writeFileSync(filePath, newHtml || result.html);
          // set the path as a relative path to the component's root
          generatedFiles.push(
            path.relative(path.join(capsuleDir, 'artifacts', 'apps'), filePath)
          );
          this.logger.info(`Wrote ${filePath}`);
        });
        componentsResults.push({ component: capsule.component, errors });
        return { component: capsule.component, errors };
      })
    );

    return {
      artifacts: [
        {
          generatedBy: this.aspectId,
          name: this.name,
          globPatterns: ['**/public/**/*.html', '!**/node_modules/**'],
        },
      ],
      /**
       * report back which components were processed,
       * as well as any additional data regarding the execution of this build task
       */
      componentsResults,
    };
  }

  static from(options: PrerenderTaskOptions): TaskHandler {
    /**
     * the task name is used to identify the task in the pipeline
     * it can also be used to replace the task or remove it from the pipeline
     */
    const name = options.name || this.name;
    const handler = (context: EnvContext) => {
      /* the env that registered this task */
      const envId = context.envId.toString();
      /* use the logger aspect */
      const logger = context.createLogger(`${envId}:${this.name}`);
      return new PrerenderTask(envId, logger, options);
    };
    return { name, handler };
  }
}
