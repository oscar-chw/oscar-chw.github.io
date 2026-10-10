import { test, expect, type Page } from "@playwright/test";

// W05 showcase: the flagship case study and the Lab experiment it opens. Each test states one claim the page makes.
const ulps = async (page: Page, method: string) => {
  const t = await page.locator(`[data-panel="compensated"] .cp-row[data-method="${method}"] .cp-err`).innerText();
  return t === "all digits lost" ? Infinity : Number(t.replace(/ ulp$/, ""));
};

test("FatQat case study: problem, a labelled build-computed result, the tradeoff, evidence, and one click to the live experiment", async ({ page }) => {
  await page.goto("/projects/fatqat-gpu-backend/");
  const cs = page.locator("#engineering");
  await expect(cs.getByText("BUILD-COMPUTED")).toBeVisible();
  await expect(cs.locator(".pv-row.kahan .pv-err")).toHaveText(/^\d\.\d\d ulp$/);
  await expect(cs.locator("#the-tradeoff dt")).toHaveText(["chose", "over", "because", "cost"]);
  await expect(cs.locator(".cs-ev a").first()).toHaveAttribute("href", /github\.com\/oscar-chw\/fatqat-cuda/);
  await cs.getByTestId("open-live").click();
  await expect(page).toHaveURL(/\/demos\/#compensated$/);
  await expect(page.locator('[data-panel="compensated"] .cp-row')).toHaveCount(3);
});

test("compensated products: on nearly cancelling inputs plain loses its digits and Kahan's algorithm stays within 2 ulp", async ({ page }) => {
  await page.goto("/demos/#compensated");
  const panel = page.locator('[data-panel="compensated"]');
  await expect(panel.locator(".cp-row")).toHaveCount(3);
  expect(await ulps(page, "kahan")).toBeLessThanOrEqual(2);
  expect(await ulps(page, "plain")).toBeGreaterThan(1e6);
  await expect(panel.getByTestId("cp-result")).toContainText("Plain products kept about 0 of 16 digits");
});

test("compensated products: the visitor's own inputs are computed, an invalid one is named, and reset restores the start", async ({ page }) => {
  await page.goto("/demos/#compensated");
  const panel = page.locator('[data-panel="compensated"]'), a = panel.getByRole("textbox", { name: "a", exact: true });
  const start = await a.inputValue();
  await a.fill("3"); await panel.getByRole("textbox", { name: "b", exact: true }).fill("4");
  await panel.getByRole("textbox", { name: "c", exact: true }).fill("2"); await panel.getByRole("textbox", { name: "d", exact: true }).fill("5");
  await panel.getByRole("textbox", { name: "d", exact: true }).press("Enter");
  await expect(panel.locator('.cp-row[data-method="exact"] .cp-num')).toHaveText("2.0000000000000000");
  await a.fill("abc"); await a.press("Enter");
  await expect(panel.getByRole("alert")).toContainText("a must be a number");
  await expect(a).toHaveAttribute("aria-invalid", "true");
  await panel.getByRole("button", { name: "reset" }).click();
  await expect(a).toHaveValue(start);
  await expect(panel.locator(".cp-err-msg")).toBeEmpty();
});

test("compensated products: typical inputs and a live 2,000-case sweep", async ({ page }) => {
  await page.goto("/demos/#compensated");
  const panel = page.locator('[data-panel="compensated"]');
  await panel.getByRole("radio", { name: "typical amplitudes" }).click();
  expect(await ulps(page, "kahan")).toBeLessThanOrEqual(2);
  await panel.getByRole("button", { name: "run 2,000 cases" }).click();
  const sweep = panel.getByTestId("cp-sweep");
  await expect(sweep).toContainText("2,000 typical amplitudes cases");
  const worst = Number(await sweep.locator(".ro dd").nth(3).innerText());
  expect(worst).toBeLessThanOrEqual(2);
});

test("the Lab leads back to the case study it came from", async ({ page }) => {
  await page.goto("/demos/#compensated");
  await expect(page.locator('[data-panel="compensated"] a', { hasText: "the project" })).toHaveAttribute("href", /\/projects\/fatqat-gpu-backend\/#engineering$/);
});
