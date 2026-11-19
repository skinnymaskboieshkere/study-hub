import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 5200);

/**
 * End-to-end tests (SPEC §8, stage 5) against the built app on a temporary copy of
 * e2e/fixtures/vault. Locally they use the installed Chrome; CI installs Chromium.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: "ru-RU",
    timezoneId: "Europe/Kyiv",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
        viewport: { width: 1360, height: 900 },
      },
    },
  ],
  webServer: {
    command: "node e2e/server.mjs",
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { E2E_PORT: String(port) },
  },
});
