import { defineConfig, devices } from "@playwright/test";

// Chrome and Safari engines are both acceptance targets (brief: "every demo working in Chrome and Safari").
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // the home page's boot sequence is skipped in tests (localStorage noboot=1); it is tested on its own
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
    storageState: { cookies: [], origins: [{ origin: "http://localhost:4321", localStorage: [{ name: "noboot", value: "1" }] }] },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: "npx astro preview --port 4321 --ignore-lock", url: "http://localhost:4321", reuseExistingServer: !process.env.CI },
});
