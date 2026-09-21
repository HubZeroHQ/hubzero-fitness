import { defineConfig } from '@playwright/test'

const PORT = 3100

// Runs the real production build (server + built site) against a throwaway SQLite database.
// Uses the Chrome already installed on the machine, so no browser download is needed.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/e2e/start-server.mjs',
    url: `http://localhost:${PORT}/api/me`,
    // /api/me answers 401 when signed out, which is fine: it proves the server is up.
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT_API: String(PORT) },
    gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 },
  },
})
