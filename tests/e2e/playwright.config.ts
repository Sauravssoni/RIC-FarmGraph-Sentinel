import { defineConfig } from "@playwright/test";

/**
 * E2E against the static export (apps/web/out) served by python http.server.
 * Uses the system Chromium — no Playwright browser download required.
 */
export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: {
      // Local sandboxes use system Chromium via CHROMIUM_PATH (or the common
      // /usr/bin/chromium); CI uses the Playwright-downloaded browser.
      ...(process.env.PLAYWRIGHT_NO_EXECUTABLE_PATH
        ? {}
        : { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory ../../apps/web/out",
    url: "http://127.0.0.1:4173/command-centre/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
