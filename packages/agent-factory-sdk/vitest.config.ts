import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
    },
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 180000,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
