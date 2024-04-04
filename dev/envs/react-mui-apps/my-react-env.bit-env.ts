import { ReactEnv } from '@bitdev/react.react-env';
import type { ReactEnvInterface } from '@teambit/react.react-env';
// import { PrerenderTask } from '@cohen-codes/dev.tasks.prerender';
import { AppTypeList } from '@teambit/application';
import { EnvHandler } from '@teambit/envs';
import { ReactAppType } from '@teambit/react.apps.react-app-types';
import { resolveTypes } from '@teambit/typescript.typescript-compiler';

export class ReactMuiApps extends ReactEnv implements ReactEnvInterface {
  protected tsconfigPath = require.resolve('./config/tsconfig.json');

  protected tsTypesPath = './types';

  protected get types() {
    return [...resolveTypes(__dirname, [this.tsTypesPath])];
  }

  protected jestConfigPath = require.resolve('./config/jest.config');

  protected eslintConfigPath = require.resolve('./config/eslintrc.js');

  protected eslintExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

  protected prettierConfigPath = require.resolve('./config/prettier.config.js');

  protected prettierExtensions = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
    '.json',
    '.css',
    '.scss',
    '.md',
    '.mdx',
    '.html',
    '.yml',
    '.yaml',
  ];

  protected previewMounter = require.resolve('./preview/mounter');

  protected previewDocsTemplate = require.resolve('./preview/docs');

  name = 'react-mui-apps';

  icon = 'https://static.bit.dev/extensions-icons/react.svg';

  apps(): EnvHandler<AppTypeList> {
    return AppTypeList.from([ReactAppType.from({})]);
  }
}

export default new ReactMuiApps();
