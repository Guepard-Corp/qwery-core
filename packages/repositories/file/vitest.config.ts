import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', '**/*.test.ts', '**/__tests__/**'],
      thresholds: {
        statements: 98,
        branches: 73,
        functions: 97,
        lines: 99,
      },
    },
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 120000,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
