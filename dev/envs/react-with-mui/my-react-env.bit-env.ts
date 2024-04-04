import { ReactEnv, ReactEnvInterface } from '@bitdev/react.react-env';
import { Compiler } from '@teambit/compiler';
import { VitestTester, VitestTask } from '@teambit/vite.vitest-tester';
import { StarterList, TemplateList } from '@teambit/generator';
import {
  ReactViteTemplate,
  ReactWebpackTemplate,
  ReactComponentTemplate,
  ReactEnvTemplate,
  ReactHookTemplate,
  ReactJSComponentTemplate,
  ThemeTemplate,
} from '@bitdev/react.generators.react-templates';
import { ReactWorkspaceStarter } from '@bitdev/react.generators.react-starters';
// import { ReactAppType } from '@teambit/react.apps.react-app-types';
import { TypeScriptExtractor } from '@teambit/typescript';
import { ReactPreview } from '@teambit/preview.react-preview';
import { EnvHandler } from '@teambit/envs';
import {
  TypescriptCompiler,
  // resolveTypes,
  TypescriptTask,
  TypescriptConfigWriter,
  resolveTypes,
  GLOBAL_TYPES_DIR,
} from '@teambit/typescript.typescript-compiler';
import {
  ESLintLinter,
  EslintConfigWriter,
  EslintTask,
} from '@teambit/defender.eslint-linter';
import { ESLint as ESLintLib } from 'eslint';
// import { AppTypeList } from '@teambit/application';
import {
  PrettierConfigWriter,
  PrettierFormatter,
} from '@teambit/defender.prettier-formatter';
import typescript from 'typescript';
import { Tester } from '@teambit/tester';
import { Pipeline, CAPSULE_ARTIFACTS_DIR } from '@teambit/builder';
import { Preview } from '@teambit/preview';
import { SchemaExtractor } from '@teambit/schema';
import { ConfigWriterList } from '@teambit/workspace-config-files';
import { PackageGenerator } from '@teambit/pkg';
import { NativeCompileCache } from '@teambit/toolbox.performance.v8-cache';
import findRoot from 'find-root';

// Disable v8-caching because it breaks ESM loaders
NativeCompileCache.uninstall();
// import webpackTransformer from './config/webpack.config';

export class ReactMui extends ReactEnv implements ReactEnvInterface {
  /**
   * name of the environment. used for friendly mentions across bit.
   */
  name = 'react';

  /**
   * icon for the env. use this to build a more friendly env.
   * uses react by default.
   */
  icon = 'https://static.bit.dev/extensions-icons/react.svg';

  /**
   * create an instance of a Bit Component Compiler.
   * Learn more: https://bit.dev/reference/compiling/set-up-compiler
   */
  compiler(): EnvHandler<Compiler> {
    return TypescriptCompiler.from({
      esm: true,
      tsconfig: this.tsconfigPath,
      types: this.types,
      typescript,
    });
  }

  /**
   * create an instance of the Bit Tester plugin.
   * learn more: https://bit.dev/reference/testing/set-up-tester
   */
  tester(): EnvHandler<Tester> {
    return VitestTester.from({
      config: require.resolve('./config/vitest.config.mjs'),
    });
    // return JestTester.from({
    //   // jest: require.resolve('jest'),
    //   config: this.jestConfigPath,
    // });
  }

  preview(): EnvHandler<Preview> {
    return ReactPreview.from({
      docsTemplate: this.previewDocsTemplate,
      mounter: this.previewMounter,
      hostDependencies: [
        '@teambit/mdx.ui.mdx-scope-context',
        '@mdx-js/react',
        'react',
        'react-dom',
        '@cohen-codes/design.theme.theme-provider',
        '@cohen-codes/design.theme.light-theme',
        '@cohen-codes/design.theme.dark-theme',
        '@cohen-codes/design.theme.theme-toggle',
        '@mui/material',
        '@mui/icons-material',
        '@mui/lab',
      ],
    });
  }

  /**
   * returns an instance of the default TypeScript extractor.
   * used by default for type inference for both JS and TS.
   */
  schemaExtractor(): EnvHandler<SchemaExtractor> {
    return TypeScriptExtractor.from({
      tsconfig: this.tsconfigPath,
    });
  }

  /**
   * add a Bit Linter plugin.
   * learn more: https://bit.dev/reference/testing/set-up-tester
   */
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

  /**
   * create a formatter instance.
   * learn more: https://bit.dev/reference/formatting/set-up-formatter
   */
  formatter() {
    return PrettierFormatter.from({
      configPath: this.prettierConfigPath,
    });
  }

  /**
   * Add your build pipeline.
   * learn more: https://bit.dev/docs/react-env/build-pipelines
   */
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
      VitestTask.from({
        config: require.resolve('./config/vitest.config.mjs'),
      }),
      // JestTask.from({
      //   config: this.jestConfigPath,
      // }),
    ]);
  }

  /**
   * add build tasks to execute upon [snap](https://bit.dev/docs/snaps).
   * use the snap pipeline for staging and test deployments
   */
  snap() {
    return Pipeline.from([]);
  }

  /**
   * add build tasks to execute upon [tag](https://bit.dev/docs/tags).
   * use the tag pipeline for deployments, or other tasks required for
   * publishing a semantic version for a component.
   */
  tag() {
    return Pipeline.from([]);
  }

  workspaceConfig(): ConfigWriterList {
    return ConfigWriterList.from([
      TypescriptConfigWriter.from({
        tsconfig: this.tsconfigPath,
        types: this.types,
      }),
      EslintConfigWriter.from({
        configPath: this.eslintConfigPath,
        tsconfig: this.tsconfigPath,
      }),
      PrettierConfigWriter.from({
        configPath: this.prettierConfigPath,
      }),
    ]);
  }

  /**
   * a list of starters for new projects. this helps create a quick and
   * standardized
   */
  starters() {
    return StarterList.from([ReactWorkspaceStarter.from()]);
  }

  /**
   * set a list of component templates to use across your
   * workspaces. new workspaces would be set to include
   * your envs by default.
   */
  generators() {
    return TemplateList.from([
      ReactComponentTemplate.from(),
      ReactViteTemplate.from(),
      ReactHookTemplate.from(),
      ReactWebpackTemplate.from(),
      ReactJSComponentTemplate.from(),
      ReactEnvTemplate.from(),
      ThemeTemplate.from(),
    ]);
  }

  // apps(): EnvHandler<AppTypeList> {
  //   return AppTypeList.from([
  //     ReactSsrType.from(),
  //     ViteReactType.from(),
  //     ReactAppType.from(),
  //   ]);
  // }

  /**
   * configure and control the packaging process of components.
   */
  package() {
    return PackageGenerator.from({
      packageJson: this.packageJson,
      npmIgnore: this.npmIgnore,
    });
  }

  protected tsconfigPath = require.resolve('./config/tsconfig.json');

  protected tsTypesPath = './types';

  protected get types() {
    const packagePath = require.resolve(
      '@teambit/typescript.typescript-compiler'
    );
    const packageRoot = findRoot(packagePath);

    return [
      ...resolveTypes(__dirname, [this.tsTypesPath]),
      ...resolveTypes(packageRoot, [GLOBAL_TYPES_DIR]),
    ];
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

  /**
   * Default npm ignore paths.
   * Will ignore the "artifacts" directory by default.
   */
  npmIgnore = [`${CAPSULE_ARTIFACTS_DIR}/`, '.vitest'];

  /**
   * Default package.json modifications.
   */
  packageJson = {
    type: 'module',
    main: 'dist/{main}.js',
    types: '{main}.ts',
  };
}

export default new ReactMui();
