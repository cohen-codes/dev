import { ReactEnv } from '@teambit/react.react-env';
import type { ReactEnvInterface } from '@teambit/react.react-env';
import { ReactPreview } from '@teambit/preview.react-preview';
import { ESLintLinter, EslintTask } from '@teambit/defender.eslint-linter';
import { Pipeline } from '@teambit/builder';
import { EnvHandler } from '@teambit/envs';
import { Preview } from '@teambit/preview';
import {
  TypescriptTask,
  resolveTypes,
} from '@teambit/typescript.typescript-compiler';
import typescript from 'typescript';
import { ESLint as ESLintLib } from 'eslint';

export class MyReactEnv extends ReactEnv implements ReactEnvInterface {
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

  name = 'react-18';

  icon = 'https://static.bit.dev/extensions-icons/react.svg';

  preview(): EnvHandler<Preview> {
    return ReactPreview.from({
      docsTemplate: this.previewDocsTemplate,
      mounter: this.previewMounter,
    });
  }

  linter() {
    return ESLintLinter.from({
      tsconfig: this.tsconfigPath,
      eslint: ESLintLib,
      configPath: this.eslintConfigPath,
      // resolve all plugins from the react environment.
      pluginsPath: __dirname,
      extensions: this.eslintExtensions,
    });
  }

  build() {
    return Pipeline.from([
      TypescriptTask.from({
        tsconfig: this.tsconfigPath,
        types: this.types,
        typescript,
      }),
      EslintTask.from({
        tsconfig: this.tsconfigPath,
        eslint: ESLintLib,
        configPath: this.eslintConfigPath,
        // resolve all plugins from the react environment.
        pluginsPath: __dirname,
        extensions: this.eslintExtensions,
      }),
    ]);
  }
}

export default new MyReactEnv();
