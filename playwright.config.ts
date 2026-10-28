import { defineConfig, devices } from '@playwright/test';

// Serves the built site with its Pages Functions and the built docs on Workers static
// assets, so run `npm run build:site` and `npm run build:docs` first.
const sitePort = 8788;
const docsPort = 8789;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    {
      name: 'site',
      testDir: 'tests',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${sitePort}` },
    },
    {
      name: 'docs',
      testDir: 'docs/tests',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${docsPort}` },
    },
  ],
  webServer: [
    {
      command: `npx wrangler pages dev dist --port ${sitePort}`,
      url: `http://localhost:${sitePort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // The local workerd can lag the deploy compatibility date; static assets do not care.
      command: `npx wrangler dev -c docs/wrangler.jsonc --port ${docsPort} --compatibility-date 2026-10-01`,
      url: `http://localhost:${docsPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
