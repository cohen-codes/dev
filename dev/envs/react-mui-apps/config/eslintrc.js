
module.exports = {
  extends: [require.resolve('@bitdev/react.eslint.eslint-config-bit-react')],
  ignorePatterns: ['*.ts', '*.tsx'],
  settings: {
    'mdx/code-blocks': true,
    jest: {
      version: 29,
    },
    react: {
      version: '18.0',
    },
  },
  rules: {},
};
