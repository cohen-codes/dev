import {
  AppBuildContext,
  AppBuildResult,
  AppContext,
  Application,
  ApplicationInstance,
  DeployFn,
} from '@teambit/application';
import findRoot from 'find-root';
import { CAPSULE_ARTIFACTS_DIR } from '@teambit/builder';
import { existsSync } from 'fs';
import { compact } from 'lodash';
import { Port } from '@teambit/toolbox.network.get-port';
import WorkspaceAspect, { Workspace } from '@teambit/workspace';
import { join } from 'path';
import getVite from '@teambit/vite.esm-packages.vite';
import type { InlineConfig, AnymatchPattern, ConfigEnv } from 'vite';
import { createSsrServer } from './server';
import type { ViteReactAppOptions } from './vite-react-app-type.js';

export class ViteReact implements Application {
  constructor(
    /**
     * name of the application.
     */
    readonly name: string = 'react-vite',

    /**
     * default port for the dev server and preview.
     */
    readonly portRange: [number, number] = [3000, 3200],

    /**
     * entries to include.
     */
    readonly serverRoot: string = 'server.app-root',

    /**
     * vit config. overrides default react config.
     */
    readonly viteConfigPath: string = 'vite.config.mjs',

    /**
     * use true to ignite vit in SSR mode.
     */
    readonly ssr: boolean = false,
    
    /**
     * name of the artifact.
     */
    readonly artifactName: string = 'app-bundle',

    /**
     * filename of the server.
     */
    readonly serverFilename: string = 'server',

    /**
     * the complication output dir to use.
     * change according to your env.
     * defaults to: `dist`
     */
    readonly compileOutputDir = 'dist',

    /**
     * build config for the vite build of the server side code.
     * used for both the express server, and the ssr.
     * defaults to cjs.
     */
    readonly viteServerBuildConfigPath: string = 'vite-server.config.js',

    /**
     * deploy function.
     */
    readonly deploy?: DeployFn,

    /**
     * peer dependencies to alias from the app component dependencies.
     */
    readonly peers: string[] = [],

    /**
     * instance of vite. 
     * uses the any type annotation to avoid type issues between versions. can be either a promise or a value.
     * @type typeof Vite
     */
    readonly vite: Promise<typeof import('vite')> = getVite()
  ) {}

  readonly defaultPeers = ['react', 'react-dom', 'graphql', 'react-router', 'react-router-dom', '@apollo/client'];

  /**
   * run the dev server for a given context.
   * can run in both pwa or ssr modes.
   */
  async run(context: AppContext): Promise<ApplicationInstance> {
    const vite = await this.vite;
    const workspace = context.getAspect<Workspace>(WorkspaceAspect.id);
    const [fromPort, toPort] = this.portRange;
    const port = Number.isNaN(context.port)
      ? await Port.getPort(fromPort, toPort)
      : context.port;

    const rootComponentDir = context.hostRootDir!;
    const appId = context.appComponent.id;
    const isInWorkspace = await workspace.hasId(appId);
    const componentDir = isInWorkspace 
      ? workspace?.componentDir(context.appComponent.id) as string
      : rootComponentDir;
    // const publicDir = join(componentDir, this.compileOutputDir);
    const publicDir = componentDir;
    const peers = this.peers.length ? this.peers : this.defaultPeers;
    const mode = 'development';
    const userConfig = await this.loadViteConfig({
      mode,
      command: 'serve'
    }, componentDir, this.viteConfigPath);
    // TODO remove any after merging PR.
    const env = await this.getEnvFile(mode, componentDir, context.envVariables as any);
    const viteConfig = await this.computeConfig(componentDir, peers, rootComponentDir, userConfig, workspace, env);
    const devServer = await vite.createServer(viteConfig);

    if (this.ssr) {
      const server = await createSsrServer({
        publicDir,
        indexHtmlPath: join(componentDir, 'index.html'),
        serverPath: join(componentDir, this.serverRoot),
        serverEntryFile: join(componentDir, this.serverRoot),
        dev: true,
        viteServer: devServer,
      });

      server.listen(port);
      console.log(`🚀 ${this.name} app is listening on port ${port}`)

      return {
        appName: this.name,
        port
      };
    }

    await devServer.listen(port);
    devServer.printUrls();

    return {
      appName: this.name,
      port
    };
  }

  async getEnvFile(mode: string, rootDir: string, overrides?: Record<string, string>) {
    const vite = await this.vite;
    const dotenv = vite.loadEnv(mode, rootDir);
    return {
      ...overrides,
      ...dotenv 
    }
  }

  private findViteConfig(componentDir: string, configPath?: string): string {
    const searchStrings = [
      join(componentDir, configPath || this.viteConfigPath), 
      join(componentDir, 'vite.config.mjs'),
      join(componentDir, 'vite-config')
    ];

    return searchStrings.find((searchStr) => {
      return existsSync(searchStr);
    })
  }

  async loadViteConfig(config: ConfigEnv, componentDir: string, path: string) {
    const vite = await this.vite;
    const configPath = this.findViteConfig(componentDir, path);
    const exists = existsSync(configPath);
    if (!exists) return {};
    const viteConfig = await vite.loadConfigFromFile(config, configPath)
    return viteConfig?.config;
  }

  private async computeConfig(root: string, peers: string[] = [], rootDir: string, config: InlineConfig = {}, workspace?: Workspace, envVars: Record<string, string> = {}): Promise<InlineConfig> {
    const vite = await this.vite;
    const components = workspace ? await workspace.list() : [];
    const packageList = compact(
      components.map((c) => workspace?.componentPackageName(c))
    );
    const ignored: AnymatchPattern[] = packageList.map(
      (p) => `!**/node_modules/${p}/**`
    );
    const alias = peers.reduce((acc, peer) => {
      let filepath = '';
      try {
        filepath = require.resolve(peer, { paths: [rootDir] });
        acc[peer] = findRoot(filepath);
        return acc;
        } catch (err) {
        return acc;
      }
    }, {});

    return vite.mergeConfig(config, {
      configFile: false,
      root,
      define: {
        'process.env': JSON.stringify({ ...envVars }),
      },
      cacheDir: join(root, 'node_modules', '.vite'),
      optimizeDeps: { exclude: packageList },
      server: {
        middlewareMode: this.ssr,
        watch: { ignored },
      },
      resolve: {
        mainFields: ['module', 'source', 'main', 'jsnext:main', 'jsnext'],
        alias,
      },
      appType: this.ssr ? 'custom' : undefined,
    });
  }

  private async computeBuildClientConfig(root: string, config: InlineConfig = {}): Promise<InlineConfig> {
    const vite = await this.vite;

    return vite.mergeConfig(config, {
      configFile: false,
      root,
      build: {
        emptyOutDir: false,
        outDir: join(root, this.outputDir),
        chunkSizeWarningLimit: 1000
      },
    });
  }

  private async computeBuildConfig(
    root: string,
    input: string,
    outputFilename: string,
    config: InlineConfig = {}
  ): Promise<InlineConfig> {
    const vite = await this.vite;
    const outDir = join(root, this.outputDir);
    return vite.mergeConfig(config, {
      configFile: false,
      root,
      resolve: {
        mainFields: ['main', 'module', 'jsnext:main', 'jsnext'],
        extensions: ['.js', '.mjs', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      },
      build: {
        emptyOutDir: false,
        commonjsOptions: {
          ignoreDynamicRequires: true,
        },
        rollupOptions: {
          input,
          output: {
            entryFileNames: `${outputFilename}.js`,
            chunkFileNames: `${outputFilename}-chunk.js`,
            format: 'cjs',
          },
        },
        ssr: this.ssr,
        outDir,
      }
    });
  }

  private get outputDir() {
    return join(CAPSULE_ARTIFACTS_DIR, this.artifactName);
  }

  /**
   * app build.
   * building three entries, one for the server
   */
  async build(context: AppBuildContext): Promise<AppBuildResult> {
    const vite = await this.vite;
    const root = context.capsule.path;
    const config = await this.loadViteConfig({
      mode: 'production',
      command: 'build'
    }, root, this.viteConfigPath);

    const serverConfig = await this.loadViteConfig({
      mode: 'production',
      command: 'build'
    }, root, this.viteServerBuildConfigPath);

    // client build
    const viteConfig = await this.computeBuildClientConfig(root, config);
    // (ssr-only) server build
    const viteSsrConfig = this.ssr ? await this.computeBuildConfig(
      root,
      join(root, this.serverRoot),
      'server-ssr',
      config
    ) : undefined;
    // (ssr-only) runner build
    const ssrRunner = this.ssr ? await this.computeBuildConfig(
      root,
      require.resolve('./server-runner'),
      this.serverFilename,
      serverConfig
    ) : undefined;

    await Promise.all(
      [viteConfig, viteSsrConfig, ssrRunner]
        .filter(Boolean)
        .map(async (vConfig) => vite.build(vConfig))
    );

    return {
      artifacts: [
        {
          name: this.artifactName,
          globPatterns: [this.outputDir],
        },
      ],
      metadata: {
        publicDir: this.outputDir
      }
    };
  }

  static from(options: ViteReactAppOptions) {
    return new ViteReact(
      options.name,
      options.defaultPort,
      options.serverRoot,
      options.viteConfigPath,
      options.ssr,
      options.artifactName,
      options.serverFilename,
      options.compileOutputDir,
      options.viteServerBuildConfigPath,
      options.deploy,
      options.vite
    );
  }
}
