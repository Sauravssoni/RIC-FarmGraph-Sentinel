import { expect, test } from "@playwright/test";

/**
 * Production-subpath asset checks — run only in E2E_SUBPATH mode
 * (npm run e2e:subpath), where the site is served exclusively under
 * /<repo>/ like a GitHub Pages project site.
 *
 * These assert the URLs Next.js does NOT auto-prefix (manifest, icons,
 * service worker, ONNX model, wasm runtime, labels) all resolve under the
 * deployed base path. The full suite (golden + task002) also runs in this
 * mode, covering routes and the real ONNX screening flow end-to-end.
 */
const SUBPATH = process.env.E2E_SUBPATH ?? "";

test.skip(!SUBPATH, "subpath asset checks require E2E_SUBPATH mode");

test("manifest link is base-path-prefixed and manifest resolves icons", async ({ page }) => {
  await page.goto("command-centre/");
  const href = await page.getAttribute('link[rel="manifest"]', "href");
  expect(href, "manifest link must carry the base path").toBe(`${SUBPATH}/manifest.webmanifest`);

  const res = await page.request.get(`${SUBPATH}/manifest.webmanifest`);
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  // Relative start_url/icons in the manifest resolve against the manifest URL.
  expect(manifest.start_url).toBe("./command-centre/");
  for (const icon of manifest.icons) {
    const iconRes = await page.request.get(`${SUBPATH}/${icon.src}`);
    expect(iconRes.ok(), `icon ${icon.src} must load under base path`).toBeTruthy();
  }
});

test("service worker script is served under the base path", async ({ page }) => {
  await page.goto("command-centre/");
  const res = await page.request.get(`${SUBPATH}/sw.js`);
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toContain("fgr-shell-v2");
  // The SW must derive its base from its own URL — no hardcoded root routes.
  expect(body).not.toContain('"/command-centre/"');
});

test("ONNX model, wasm runtime and labels all load under the base path", async ({ page }) => {
  await page.goto("command-centre/");
  for (const asset of [
    "/models/mobilenetv2-7.onnx",
    "/models/imagenet_classes.txt",
    "/ort/ort-wasm-simd.wasm",
  ]) {
    const res = await page.request.get(`${SUBPATH}${asset}`);
    expect(res.ok(), `${asset} must load under base path`).toBeTruthy();
  }
});

test("no root-absolute asset requests leak outside the base path", async ({ page }) => {
  const leaks: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin === "http://127.0.0.1:4173" && !url.pathname.startsWith(`${SUBPATH}/`)) {
      leaks.push(url.pathname);
    }
  });
  await page.goto("command-centre/");
  await page.waitForLoadState("networkidle");
  await page.goto("field/scan/");
  await page.waitForLoadState("networkidle");
  expect(leaks, `requests escaped the base path: ${leaks.join(", ")}`).toEqual([]);
});
