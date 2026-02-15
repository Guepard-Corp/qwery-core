import * as path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      exclude: [
        'src/load-browser-driver.ts',
        '**/*.test.ts',
        '**/__tests__/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 87,
      },
    },
    environment: 'node',
  },
  resolve: {
    alias: {
      '@qwery/extensions-loader': path.resolve(__dirname, './src'),
    },
  },
});
