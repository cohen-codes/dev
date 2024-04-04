import { createDocsTemplate } from '@teambit/docs.docs-template';

// eslint-disable-next-line react/prop-types
export function DocsProvider({ children }) {
  return children;
}

export default createDocsTemplate(DocsProvider);
