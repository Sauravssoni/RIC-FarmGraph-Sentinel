import { expect, test } from "@playwright/test";

/**
 * Task 003 (WS2) — Judge Mode Government Infrastructure chapter.
 * Runs fully degraded (standalone static export, no API): every panel must
 * still render the honest adapter states from bundled artefacts.
 */

test("government infrastructure chapter — 12 steps, honest states, fully degraded", async ({ page }) => {
  await page.goto("demo/");
  await page.getByRole("tab", { name: /Government infrastructure/i }).click();

  // step pill navigation renders 12 steps
  const pills = page.locator('ol[aria-label="Government infrastructure steps"] button');
  await expect(pills).toHaveCount(12);

  // Step 1: posture — exact states, nothing live
  await expect(page.getByText(/nothing claimed live/i).first()).toBeVisible();
  await expect(page.getByText("IMD_IP_WHITELIST_REQUIRED").first()).toBeVisible();
  await expect(page.getByText("MANDI_CREDENTIALS_REQUIRED").first()).toBeVisible();

  // Step 2: genuine whitelist evidence
  await pills.nth(1).click();
  await expect(page.getByText(/HTTP 401/).first()).toBeVisible();
  await expect(page.getByText(/needs to be whitelisted/i).first()).toBeVisible();
  await expect(page.getByText(/imd-whitelist-evidence\.json/).first()).toBeVisible();

  // Step 3: SAMPLE-labelled district contract
  await pills.nth(2).click();
  await expect(page.getByText(/SAMPLE SHAPE/).first()).toBeVisible();
  await expect(page.getByText(/India Meteorological Department/).first()).toBeVisible();

  // Step 4: explainable score movement, SIMULATED multiplier 0
  await pills.nth(3).click();
  await expect(page.getByText(/Weather suitability: 0\.4 → 0\.6/).first()).toBeVisible();
  await expect(page.getByText(/SIMULATED multiplier/).first()).toBeVisible();

  // Step 7: mandi quotes from the real mirror
  await pills.nth(6).click();
  await expect(page.getByText(/Jodhpur \(Grain\)/).first()).toBeVisible();
  await expect(page.getByText(/₹2460\/quintal/).first()).toBeVisible();

  // Step 8: referral lifecycle + SLA
  await pills.nth(7).click();
  await expect(page.getByText(/READY_TO_SHARE/).first()).toBeVisible();
  await expect(page.getByText(/kvk-referral-pack\/v1/).first()).toBeVisible();

  // Step 12: degraded-truth close
  await pills.nth(11).click();
  await expect(page.getByText(/No adapter in this prototype is live unless its state chip says LIVE/).first()).toBeVisible();
  await expect(page.getByText(/docs\/integrations\/imd\.md/).first()).toBeVisible();

  // progress reflects visited steps
  await expect(page.getByText(/of 12 steps viewed/).first()).toBeVisible();
});
