import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173/';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL, browserName: 'chromium' },
  webServer: {
    command: process.env.PLAYWRIGHT_SERVER_COMMAND ?? 'npm run dev -- --port 4173 --strictPort',
    url: baseURL,
    env: { VITE_OPEN_BROWSER: 'false' },
    reuseExistingServer: !process.env.CI,
  },
});
