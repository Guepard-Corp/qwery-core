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
  noExternal: [
    '@qwery/domain',
    '@qwery/repository-in-memory',
    '@qwery/ai-agents',
  ],
});

