import { ApplicationType, Application, DeployFn } from "@teambit/application";
import { Workspace } from '@teambit/workspace';
import { EnvContext } from '@teambit/envs';
import { ViteReact } from "./vite-react";

export type ViteReactAppOptions = {
  /**
   * name of the app.
   */
  name?: string;

  /**
   * port range to use.
   */
  defaultPort?: [number, number]

  /**
   * target filename for the bundle.
   */
  filename?: string;

  /**
   * name of the public contents directory.
   * default to 'public'.
   */
  publicDir?: string;

  /**
   * define whether to use ssr.
   */
  ssr?: boolean;

  /**
   * config to inject to vite.
   */
  viteConfigPath?: string,

  /**
   * name of the artifact.
   * defaults to: `app-target`
   */
  artifactName?: string,

  /**
   * root for the server.
   * defaults to: `server`
   */
  serverRoot?: string,

  /**
   * name of the server file to output.
   */
  serverFilename?: string,

  /**
   * the complication output dir to use.
   * change according to your env.
   * defaults to: `dist`
   */
  compileOutputDir?: string,
  
  /**
   * build config for the vite build of the server side code.
   * used for both the express server, and the ssr.
   * target defaults to cjs.
   */
  viteServerBuildConfigPath?: string,

  /**
   * deploy function.
   */
  deploy?: DeployFn;

  /**
   * instance of vite. 
   * uses the any type annotation to avoid type issues between versions. can be either a promise or a value.
   * @type typeof Vite
   */
  vite?: any;
};

export class ViteReactType implements ApplicationType<ViteReactAppOptions> {
  name = 'react-vite';

  constructor(
    private workspace?: Workspace
  ) {}
  
  /**
   * create an instance of a vite app.
   */
  createApp(options: ViteReactAppOptions): Application {
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

  /**
   * create a new definition of the vite app type.
   * use this for to configure this app type on your env.
   */
  static from() {
    return (context: EnvContext) => {
      // TODO: fix properly in bit
      try {
        const workspace: Workspace = context.getAspect('teambit.workspace/workspace');
        return new ViteReactType(workspace);
      } catch (err) {
        return new ViteReactType();
      }
    };
  }
}
