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

// W05 node 38: the same standard across the remaining surfaces.
const INLINE = ["gatedbuild", "guard", "search", "lookahead", "factors", "marketmaking", "candles", "point-in-time", "lostupdates", "compensated", "qubits", "imc", "policy", "gate", "multitest", "dna", "timetable", "options"];

test("every Lab experiment offers a reset, and the shared reset replays the experiment from its start", async ({ page }) => {
  for (const id of INLINE) {
    await page.goto(`/demos/#${id}`);
    const panel = page.locator(`[data-panel="${id}"]`);
    await expect(panel.locator("[data-controls] button").filter({ hasText: /reset|start over|replay/i }).first(), id).toBeVisible();
  }
  await page.goto("/demos/#multitest");                    // a shared-reset experiment: change it, reset, compare
  const panel = page.locator('[data-panel="multitest"]'), dd = panel.locator(".ro dd").first();
  const start = await dd.innerText();
  await panel.getByRole("slider", { name: "random formulas searched" }).fill("60");
  await expect(dd).not.toHaveText(start);
  await panel.locator("[data-reset]").click();
  await expect(dd).toHaveText(start);
});

test("the rank-IC and qubit experiments say what their result means", async ({ page }) => {
  await page.goto("/demos/#factors");
  const f = page.locator('[data-panel="factors"] .lab-result');
  await expect(f).toContainText("stays sealed");
  await page.locator('[data-panel="factors"]').getByRole("radio", { name: "open the chosen one" }).click();
  await expect(f).toContainText(/its one test score is -?\d\.\d{3}/);
  await page.goto("/demos/#qubits");
  const q = page.locator('[data-panel="qubits"] .lab-result');
  await expect(q).toContainText("8 amplitudes");
  await page.locator('[data-panel="qubits"]').getByRole("button", { name: "Bell state" }).click();
  await expect(q).toContainText("2 gates × 8 amplitudes = 16 amplitude updates");
});

for (const [slug, id] of [["qts-research-platform", "point-in-time"], ["ai-quant-research-system", "gatedbuild"]] as const) {
  test(`${slug}: case study with a labelled build-computed result and one click to its live experiment`, async ({ page }) => {
    await page.goto(`/projects/${slug}/`);
    const cs = page.locator("#engineering");
    await expect(cs.getByText("BUILD-COMPUTED")).toBeVisible();
    await expect(cs.locator("#the-tradeoff dt")).toHaveText(["chose", "over", "because", "cost"]);
    await cs.getByTestId("open-live").click();
    await expect(page).toHaveURL(new RegExp(`/demos/#${id}$`));
    await expect(page.locator(`[data-panel="${id}"] [data-controls] button, [data-panel="${id}"] [data-controls] input`).first()).toBeVisible();
  });
}

test("keyboard focus is visible on the nav's command input", async ({ page }) => {
  await page.goto("/projects/");
  await page.locator(".cmd").focus();
  await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
  const ring = await page.locator(".cmd").evaluate((el) => { const cs = getComputedStyle(el); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2; });
  expect(ring).toBe(true);
});

test("no meaningful Lab text is under 14 px", async ({ page }) => {
  for (const id of ["compensated", "gatedbuild", "factors"]) {
    await page.goto(`/demos/#${id}`);
    await page.locator(`[data-panel="${id}"] [data-controls] button`).first().waitFor();
    const small = await page.locator(".lab").evaluate((root) => [...root.querySelectorAll("*")].filter((el) => {
      if (el.closest("svg, canvas, [aria-hidden=true], [hidden]")) return false;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 2);
      return own && el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 14;
    }).map((el) => `${el.className}: ${(el.textContent ?? "").trim().slice(0, 30)}`));
    expect(small, id).toEqual([]);
  }
});
