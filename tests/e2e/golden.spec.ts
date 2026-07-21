import { expect, test, type Page } from "@playwright/test";

/**
 * Golden-path e2e: drives the simplified five-act evaluator proof through the
 * complete deterministic loop and verifies the surfaces judges touch.
 */

const actButton = (page: Page, index1Based: number) =>
  page.locator('ol[aria-label="Demo acts"] button').nth(index1Based - 1);

async function runAction(page: Page, actIndex1Based: number) {
  await actButton(page, actIndex1Based).click();
  await page.locator("button.btn-green").click();
}

async function liveState(page: Page): Promise<string> {
  return (await page.locator('section[aria-label="Golden case live state"]').innerText()).replace(/\s+/g, " ");
}

test.beforeEach(async ({ page }) => {
  await page.goto("demo/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("golden loop via five-act evaluator proof (deterministic)", async ({ page }) => {
  await expect(page.getByText("The complete proof in five acts.")).toBeVisible();
  expect(await liveState(page)).toContain("DRAFT");
  expect(await liveState(page)).toContain("65.5");
  expect(await liveState(page)).toContain("SUSPECTED");

  await runAction(page, 2);
  expect(await liveState(page)).toContain("AWAITING_EXPERT");
  await expect(page.getByText(/downy_mildew 0\.62/)).toBeVisible();
  await expect(page.getByText(/nutrient_n 0\.27/)).toBeVisible();

  await runAction(page, 3);
  expect(await liveState(page)).toContain("EXPERT_CONFIRMED");
  expect(await liveState(page)).toContain("71.5");
  expect(await liveState(page)).toContain("VERIFIED");

  await runAction(page, 4);
  await expect(page.locator("section", { hasText: "Action log" })).toContainText(/Mission M-\d+/);
  expect(await liveState(page)).toContain("ADVISORY_ISSUED");

  await runAction(page, 5);
  expect(await liveState(page)).toContain("IMPROVING");

  await expect(page.getByText("5 of 5 proof acts complete")).toBeVisible();

  await page.getByRole("button", { name: /Reset proof/ }).click();
  expect(await liveState(page)).toContain("DRAFT");
  expect(await liveState(page)).toContain("65.5");
});

test("command centre renders executive metrics, risk map and provenance", async ({ page }) => {
  await page.goto("command-centre/");
  await expect(page.getByText(/Simulated prototype dataset/).first()).toBeVisible();
  await expect(page.getByText("Live operational geography").first()).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();
  await expect(page.getByText(/Natural Earth/).first()).toBeVisible();
  await expect(page.getByText(/What needs action now/).first()).toBeVisible();
});

test("case detail shows timeline and advisory lock", async ({ page }) => {
  await page.goto("cases/C-2609/");
  await expect(page.getByText("C-2609").first()).toBeVisible();
  await expect(page.getByText(/LOCKED/).first()).toBeVisible();
});

test("integrations page tells the truth", async ({ page }) => {
  await page.goto("integrations/");
  await expect(page.getByText(/No adapter on this page is live/).first()).toBeVisible();
  await expect(page.getByText(/RajSSO/).first()).toBeVisible();
  await expect(page.getByText(/AGMARKNET/).first()).toBeVisible();
});

test.describe("responsive smoke", () => {
  for (const width of [1440, 1024, 768, 390]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["command-centre/", "field/scan/", "cases/", "outbreaks/"]) {
        await page.goto(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} overflows at ${width}px`).toBeLessThanOrEqual(1);
      }
    });
  }
});
