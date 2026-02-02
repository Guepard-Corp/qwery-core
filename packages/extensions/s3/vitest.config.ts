import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@qwery/extensions-sdk': path.resolve(
        __dirname,
        '../extensions-sdk/src',
      ),
    },
  },
});
