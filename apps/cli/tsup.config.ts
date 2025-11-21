import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  treeshake: true,
  keepNames: true,
  platform: 'node',
  dts: false,
  external: ['react', 'react-dom'],
  noExternal: [
    '@qwery/domain',
    '@qwery/repository-in-memory',
    '@qwery/ai-agents',
    '@qwery/extensions-sdk',
    '@qwery/extension-postgresql',
  ],
});

