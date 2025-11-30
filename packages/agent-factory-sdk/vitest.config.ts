import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 120000, // 2 minutes for container startup
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
