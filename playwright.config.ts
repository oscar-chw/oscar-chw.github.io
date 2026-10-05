import { defineConfig, devices } from "@playwright/test";

// Chrome and Safari engines are both acceptance targets (brief: "every demo working in Chrome and Safari").
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:4321", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: "npx astro preview --port 4321 --ignore-lock", url: "http://localhost:4321", reuseExistingServer: !process.env.CI },
});
