import { defineConfig } from 'vitest/config';

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
});
