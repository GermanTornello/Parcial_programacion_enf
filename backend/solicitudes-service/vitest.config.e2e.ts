import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Levantar la MongoDB en memoria y la app puede tardar más que los 10 s por defecto
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
