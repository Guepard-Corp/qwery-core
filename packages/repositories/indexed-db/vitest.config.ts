import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 60000,
    hookTimeout: 120000,
    pool: 'vmThreads',
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
