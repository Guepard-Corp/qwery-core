import pluginReact from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default [
  pluginReact.configs.flat.recommended,
  hooksPlugin.configs.flat.recommended,
];
