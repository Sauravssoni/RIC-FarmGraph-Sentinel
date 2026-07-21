import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /connected-release\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "cd apps/api && uvicorn app.main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/api/v1/health",
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        FGR_PERSIST: "memory",
        FGR_RATE_LIMIT: "100000",
      },
    },
    {
      command: "npm run dev --workspace apps/web",
      url: "http://127.0.0.1:3000/release-proof/",
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000",
      },
    },
  ],
});
