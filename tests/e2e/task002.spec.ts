import { expect, test } from "@playwright/test";

/**
 * Task 002 e2e: Judge Mode negative path (live adversarial checks) plus the
 * new Task 002 surfaces — digital twins, KVK support, learning flywheel, and
 * the public-data connector card. Client-side guard checks execute real code
 * in the browser; server checks must degrade honestly when no API is running.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("judge mode: client-side adversarial checks repel attacks live", async ({ page }) => {
  await page.getByRole("tab", { name: /Negative path/ }).click();
  await expect(page.getByText("Negative path — adversarial checks")).toBeVisible();

  const runBtn = page.getByRole("button", { name: "▶ Run check" });

  // 0 — blurred, under-lit photo → pixel gate rejects
  await runBtn.nth(0).click();
  await expect(page.getByText(/Rejected ✓ score/).first()).toBeVisible({ timeout: 15_000 });

  // 1 — adversarial duplicate → SHA-256 duplicate detection
  await runBtn.nth(1).click();
  await expect(page.getByText(/Duplicate detected ✓/).first()).toBeVisible({ timeout: 15_000 });

  // 2 — non-image file → rejected
  await runBtn.nth(2).click();
  await expect(page.getByText(/Rejected ✓ Format/).first()).toBeVisible({ timeout: 15_000 });

  // 3 — corrupt payload → decode failure caught
  await runBtn.nth(3).click();
  await expect(page.getByText(/Rejected ✓ reason=DECODE_FAILED/).first()).toBeVisible({ timeout: 15_000 });

  // 4 — downy pattern on cumin → crop-support abstention
  await runBtn.nth(4).click();
  await expect(page.getByText(/Abstained ✓ top pattern/).first()).toBeVisible({ timeout: 15_000 });

  // 5 — non-plant frame → vegetation abstention
  await runBtn.nth(5).click();
  await expect(page.getByText(/Abstained ✓ vegetation coverage/).first()).toBeVisible({ timeout: 15_000 });

  // 6–8 — server guards: no API in this environment → honest fallback, never a fabricated pass
  await runBtn.nth(6).click();
  await expect(page.getByText(/API not running — this guard is server-side/).first()).toBeVisible({ timeout: 15_000 });
});

test("digital twins index + golden twin with scenario simulator", async ({ page }) => {
  // Drive the golden case to AWAITING_EXPERT first (same flow as golden.spec)
  // so the expert-confirm scenario has a queued case to act on.
  const stepPill = (i: number) => page.locator('ol[aria-label="Steps"] button').nth(i - 1);
  const runAction = async (i: number) => { await stepPill(i).click(); await page.locator("button.btn-green").click(); };
  await runAction(3);
  await runAction(4);
  await runAction(5);
  await expect(page.locator("section", { hasText: "Golden case live state" })).toContainText("AWAITING_EXPERT");

  await page.goto("/digital-twins/");
  await expect(page.locator("main, body").getByText(/RJ-DEMO-PLOT-118/).first()).toBeVisible();

  await page.goto("/digital-twins/RJ-DEMO-PLOT-118/");
  await expect(page.getByText(/Suspected issue/).first()).toBeVisible();
  // scenario simulator: expert confirmation raises the cluster score 65.5 → 71.5
  await expect(page.getByRole("button", { name: /Expert confirms/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /Expert confirms/i }).first().click();
  await expect(page.getByText(/not a biological prediction/i).first()).toBeVisible();
  await expect(page.getByText(/65\.5 \(SUSPECTED\) → 71\.5 \(VERIFIED\)/).first()).toBeVisible();
});

test("support page lists sourced KVK directory", async ({ page }) => {
  await page.goto("/support/");
  await expect(page.getByText(/KVK Jodhpur-I/).first()).toBeVisible();
  await expect(page.getByText(/ICAR-CAZRI/).first()).toBeVisible();
  await expect(page.getByText(/source/i).first()).toBeVisible();
});

test("learning flywheel page shows lifecycle and honesty note", async ({ page }) => {
  await page.goto("/learning/");
  await expect(page.getByText(/CHAMPION/).first()).toBeVisible();
  await expect(page.getByText(/CANDIDATE/).first()).toBeVisible();
  await expect(page.getByText(/auto-trained/).first()).toBeVisible();
});

test("field scan runs REAL in-browser ONNX screening (MobileNetV2, bundled)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/field/scan/");
  // consent → details
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Next/ }).click();
  // details: pick a symptom, continue
  await page.locator('[role="radiogroup"] label').first().click();
  await page.getByRole("button", { name: /Next/ }).click();
  // capture: synthesise a downy-like leaf image in-page and upload it
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 384;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3e6b2f";
    ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = "#d8dcc8";
    for (let y = 0; y < 384; y++) for (let x = 0; x < 512; x++) if ((x + y) % 5 === 0) ctx.fillRect(x, y, 1, 1);
    return c.toDataURL("image/png");
  });
  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "leaf.png", mimeType: "image/png", buffer });
  // pixel-quality stage must pass, then inference runs (pixfeat + ONNX screening)
  await expect(page.getByRole("button", { name: "▶ Analyse pixels" })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "▶ Analyse pixels" }).click();
  await expect(page.getByText(/EDGE_MODEL screening ran in-browser/).first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/Top label:/).first()).toBeVisible();
});

test("integrations page shows cached public-data snapshot", async ({ page }) => {
  await page.goto("/integrations/");
  await expect(page.getByText("Public-data connector — cached snapshot")).toBeVisible();
  await expect(page.getByText(/CACHED · fetched/).first()).toBeVisible();
  await expect(page.getByText("LIVE_FETCHED").first()).toBeVisible();
  await expect(page.getByText("KEY_REQUIRED").first()).toBeVisible();
});
