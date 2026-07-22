import { devices, expect, test } from "@playwright/test";

/**
 * Browser-level mobile/PWA proof. This is stronger than a responsive screenshot:
 * Chromium uses a Pixel-class device profile, waits for the production service
 * worker to control the page, then disables the network and reloads from cache.
 * The same spec runs at domain root and under the GitHub Pages project subpath.
 */

test.describe("mobile offline PWA release proof", () => {
  test.use({ ...devices["Pixel 7"] });

  test("installs a valid manifest and reloads the command centre fully offline", async ({ page, context }, testInfo) => {
    await page.goto("command-centre/");
    await expect(page.getByRole("heading", { name: "Crop-health operations command centre" })).toBeVisible();

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (!link) throw new Error("manifest link missing");
      const response = await fetch(link.href);
      if (!response.ok) throw new Error(`manifest fetch failed: ${response.status}`);
      return response.json() as Promise<{
        name: string;
        start_url: string;
        display: string;
        icons: Array<{ src: string; sizes: string }>;
      }>;
    });

    expect(manifest.name).toBe("FarmGraph Rakshak");
    expect(manifest.start_url).toBe("./command-centre/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((icon) => icon.sizes === "192x192")).toBeTruthy();
    expect(manifest.icons.some((icon) => icon.sizes === "512x512")).toBeTruthy();

    await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) throw new Error("service workers unavailable");
      await navigator.serviceWorker.ready;
    });

    // A controlled online reload lets the network-first navigation be retained
    // in the service worker runtime cache before the hard offline proof.
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await expect(page.getByText("Standalone deterministic demo").first()).toBeVisible();

    const onlineWidth = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(onlineWidth).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("pixel7-online-command-centre.png"), fullPage: true });

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Crop-health operations command centre" })).toBeVisible();
    await expect(page.getByText("Standalone deterministic demo").first()).toBeVisible();
    await expect(page.getByText("What needs action now").first()).toBeVisible();

    const offlineState = await page.evaluate(() => ({
      browserOnline: navigator.onLine,
      controlled: Boolean(navigator.serviceWorker.controller),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(offlineState.browserOnline).toBeFalsy();
    expect(offlineState.controlled).toBeTruthy();
    expect(offlineState.overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("pixel7-offline-command-centre.png"), fullPage: true });
  });
});
