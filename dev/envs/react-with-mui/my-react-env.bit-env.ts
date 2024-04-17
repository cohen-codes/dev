import { React18 } from '@cohen-codes/dev.envs.react-18';
import { ReactPreview } from '@teambit/preview.react-preview';
import { EnvHandler } from '@teambit/envs';
import { Preview } from '@teambit/preview';

export class ReactMui extends React18 {
  /**
   * name of the environment. used for friendly mentions across bit.
   */
  name = 'reactMui';

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

  protected previewMounter = require.resolve('./preview/mounter');

  protected previewDocsTemplate = require.resolve('./preview/docs');
}

export default new ReactMui();
