import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
      'apps/web/hono/**/*.test.ts',
    ],
    exclude: ['dist/**/*', 'node_modules/**/*'],
    // Disable module caching to ensure fresh state in each test
    cache: false,
  },
});
