import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  platform: 'node',
  dts: false,
  external: ['react', 'react-dom', 'react/jsx-runtime', '@opentui/core', '@opentui/react'],
});
