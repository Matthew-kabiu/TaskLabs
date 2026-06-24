import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'react',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'dist'],
    testTimeout: 15000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@convex': path.resolve(__dirname, '../backend/convex'),
    },
  },
});
