import { defineConfig } from 'vitest/config'

// Config séparée : le plugin React Router de vite.config.ts n'a rien à faire dans les tests.
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } })
