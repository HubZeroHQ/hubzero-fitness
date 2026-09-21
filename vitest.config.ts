import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so unit tests don't load the Figma dev plugins.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
