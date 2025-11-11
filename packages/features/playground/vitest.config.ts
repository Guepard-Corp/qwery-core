import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./vitest.setup.ts'],
  },
});
