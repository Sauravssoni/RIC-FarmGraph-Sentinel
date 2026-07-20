import { defineConfig } from "@playwright/test";

/**
 * E2E against the static export (apps/web/out) served by python http.server.
 * Uses the system Chromium — no Playwright browser download required.
 *
 * Two modes:
 *  - default:           site served at http://127.0.0.1:4173/
 *  - E2E_SUBPATH=/repo: site served ONLY under http://127.0.0.1:4173/<repo>/
 *    (GitHub Pages project-site shape; serve root prepared by
 *    tests/e2e/prepare-subpath.mjs). Nothing is served at the domain root in
 *    this mode, so any root-absolute asset regression fails loudly.
 * Specs navigate with relative paths so the same suite runs in both modes.
 */
const SUBPATH = process.env.E2E_SUBPATH ?? ""; // e.g. "/RIC-FarmGraph-Sentinel"
const SERVE_DIR = SUBPATH ? "." : "../../apps/web/out";

export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:4173${SUBPATH}/`,
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
    command: `python3 -m http.server 4173 --bind 127.0.0.1 --directory ${SERVE_DIR}`,
    url: `http://127.0.0.1:4173${SUBPATH}/command-centre/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
