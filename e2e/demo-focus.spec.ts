import { test, expect, type Locator } from "@playwright/test";
import benchmark from "../sources/fatqat-cuda/portfolio-demo-2026-10-14.json" with { type: "json" };

type RecordedRow = typeof benchmark.rows[number];

async function selectRecordedRow(panel: Locator, row: RecordedRow) {
  await panel.getByRole("radiogroup", { name: "qubits", exact: true }).getByRole("radio", { name: String(row.qubits), exact: true }).click();
  await panel.getByRole("radio", { name: row.output === "observable" ? "observable" : "full state", exact: true }).click();
  await panel.getByRole("radio", { name: row.mode, exact: true }).click();
}

async function expectRecordedRow(panel: Locator, row: RecordedRow) {
  const fmt = (n: number) => n >= 100 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2);
  await expect(panel.locator(".fb-value").nth(0)).toContainText(`${fmt(row.cpu_median_ms)} ms`);
  await expect(panel.locator(".fb-value").nth(1)).toContainText(`${fmt(row.gpu_median_ms)} ms`);
  await expect(panel.locator(".ro dd")).toHaveText(`${row.speedup.toFixed(2)}×`);
  await expect(panel.getByRole("link", { name: `recorded source (${row.mode}) ↗` })).toHaveAttribute("href", benchmark.sources.find((s) => s.mode === row.mode)!.url);
  const bars = await panel.locator(".fb-bar").evaluateAll((es) => es.map((e) => e.getBoundingClientRect().width));
  expect(bars[0] / bars[1]).toBeCloseTo(row.speedup, 0);
}

// Keep every adjacent transition from the original same-panel loop. A new case
// first establishes the preceding row, then changes the same mounted panel.
for (const [index, row] of benchmark.rows.entries()) {
  test(`recorded benchmark transition ${index}: ${row.mode}/${row.output}/${row.qubits}`, async ({ page }) => {
    await page.goto("/demos/#fatqat-bench");
    const panel = page.locator('[data-panel="fatqat-bench"]');
    await expect(panel.locator(".fb-tag")).toContainText(/precomputed.*historical/i);
    expect(await panel.locator("[data-stage]").evaluate((e) => getComputedStyle(e, "::after").content)).toMatch(/recorded/i);
    if (index > 0) {
      await selectRecordedRow(panel, benchmark.rows[index - 1]);
      await expectRecordedRow(panel, benchmark.rows[index - 1]);
    }
    await selectRecordedRow(panel, row);
    await expectRecordedRow(panel, row);
  });
}

test("recorded benchmarks preserve chained input changes, explain scope and reset", async ({ page }) => {
  await page.goto("/demos/#fatqat-bench");
  const panel = page.locator('[data-panel="fatqat-bench"]');
  await expect(panel.locator(".fb-tag")).toContainText(/precomputed.*historical/i);
  expect(await panel.locator("[data-stage]").evaluate((e) => getComputedStyle(e, "::after").content)).toMatch(/recorded/i);
  const rowAt = (mode: string, output: string, qubits: number) => benchmark.rows.find((row) => row.mode === mode && row.output === output && row.qubits === qubits)!;
  await selectRecordedRow(panel, rowAt("plain", "full_state", 28));
  await expectRecordedRow(panel, rowAt("plain", "full_state", 28));
  await panel.getByRole("radio", { name: "26", exact: true }).click();
  await expectRecordedRow(panel, rowAt("plain", "full_state", 26));
  await panel.getByRole("radio", { name: "observable", exact: true }).click();
  await expectRecordedRow(panel, rowAt("plain", "observable", 26));
  await panel.getByRole("radio", { name: "compensated", exact: true }).click();
  await expectRecordedRow(panel, rowAt("compensated", "observable", 26));
  await panel.getByText("Measurement method and limits", { exact: true }).click();
  await expect(panel.locator(".fb-method")).toContainText(/not a confidence interval/);
  await expect(panel.locator(".fb-result")).toContainText(/own recorded CPU baseline/);
  await panel.getByRole("button", { name: "reset", exact: true }).click();
  await expect(panel.getByRole("radio", { name: "24", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(panel.getByRole("radio", { name: "observable", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(panel.getByRole("radio", { name: "compensated", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(panel.locator(".ro dd")).toHaveText("18.72×");
  await expectRecordedRow(panel, rowAt("compensated", "observable", 24));
});

test("mobile deep links reveal the chosen experiment and allow keyboard input", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demos/#fatqat-bench");
  const panel = page.locator('[data-panel="fatqat-bench"]');
  await expect(panel.getByRole("heading", { level: 2 })).toBeInViewport();
  const plain = panel.getByRole("radio", { name: "plain", exact: true });
  await plain.focus(); await page.keyboard.press("Space");
  await expect(plain).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { location.hash = "point-in-time"; });
  const asof = page.locator('[data-panel="point-in-time"]');
  await expect(asof.getByRole("heading", { level: 2 })).toBeInViewport();
  await asof.getByRole("region", { name: /version table/ }).focus();
  await expect(asof.getByRole("region", { name: /version table/ })).toBeFocused();
});

test("recorded and point-in-time radio groups support arrow keys and one tab stop", async ({ page }) => {
  await page.goto("/demos/#fatqat-bench");
  const panel = page.locator('[data-panel="fatqat-bench"]');
  const q = panel.getByRole("radiogroup", { name: "qubits", exact: true });
  await q.getByRole("radio", { name: "24", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(q.getByRole("radio", { name: "26", exact: true })).toBeFocused();
  await expect(q.getByRole("radio", { name: "26", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("End");
  await expect(q.getByRole("radio", { name: "28", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(q.getByRole("radio", { name: "24", exact: true })).toBeFocused();
  await expect(q.locator('[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await panel.getByRole("button", { name: "reset", exact: true }).click();
  await expect(q.getByRole("radio", { name: "24", exact: true })).toHaveAttribute("tabindex", "0");
  await expect(q.locator('[tabindex="0"]')).toHaveCount(1);
  await page.evaluate(() => { location.hash = "point-in-time"; });
  const asof = page.locator('[data-panel="point-in-time"]');
  await asof.getByRole("radio", { name: "as of cutoff", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(asof.getByRole("radio", { name: "latest available", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(asof.locator(".asof-status")).toContainText("5 use later information");
  await asof.getByRole("button", { name: "reset", exact: true }).click();
  await expect(asof.getByRole("radio", { name: "as of cutoff", exact: true })).toHaveAttribute("tabindex", "0");
});

test("loading failure has a truthful state and reload recovery", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const module = /\/_astro\/asof\.[\w-]+\.js(?:\?.*)?$/;
  await page.route(module, (route) => route.abort());
  await page.goto("/demos/#point-in-time");
  const panel = page.locator('[data-panel="point-in-time"]');
  const stage = panel.locator("[data-stage]");
  await expect(panel.getByRole("alert")).toContainText(/could not open/i);
  await expect(stage).toHaveAttribute("aria-busy", "false");
  expect(await stage.evaluate((e) => getComputedStyle(e, "::after").content)).toMatch(/unavailable/i);
  expect(errors).toEqual([]);
  await page.unroute(module);
  await Promise.all([
    page.waitForEvent("load"),
    panel.getByRole("button", { name: "Reload to retry", exact: true }).click(),
  ]);
  await expect(panel.getByRole("slider", { name: "read as of", exact: true })).toBeVisible();
  await expect(stage).toHaveAttribute("aria-busy", "false");
  expect(errors).toEqual([]);
});

test("search recovers after its corpus fails without unhandled promises", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/lab/corpus.json", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.goto("/demos/#search");
  const panel = page.locator('[data-panel="search"]');
  await expect(panel.getByRole("alert")).toContainText(/could not load/i);
  await expect(panel.locator(".sr a")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.unroute("**/lab/corpus.json");
  await panel.getByRole("button", { name: "Retry search index", exact: true }).click();
  await expect(panel.locator(".sr a").first()).toBeVisible();
  await panel.getByRole("searchbox", { name: "Search this website's write-ups", exact: true }).fill("GPU state vector");
  await expect(panel.locator(".sr a").first()).toContainText(/FatQat/i);
  expect(errors).toEqual([]);
});

test("point-in-time comparison makes future revisions explicit and resets", async ({ page }) => {
  await page.goto("/demos/#point-in-time");
  const panel = page.locator('[data-panel="point-in-time"]');
  const row = panel.locator("tr", { hasText: "close (Mon)" });
  await expect(row.locator("td").nth(1)).toHaveText("10");
  await panel.getByRole("radio", { name: "latest available", exact: true }).click();
  await expect(row.locator("td").nth(1)).toHaveText("10.4");
  await expect(row).toContainText(/future|later|leak/i);
  await panel.getByRole("button", { name: "late correction", exact: true }).click();
  await expect(panel.getByRole("slider", { name: "read as of", exact: true })).toHaveValue("4");
  await panel.getByRole("radio", { name: "as of cutoff", exact: true }).click();
  await expect(row.locator("td").nth(1)).toHaveText("10.4");
  await panel.getByRole("button", { name: "before data", exact: true }).click();
  await expect(row.locator("td").nth(1)).toHaveText("not known yet");
  await panel.getByRole("button", { name: "reset", exact: true }).click();
  await expect(panel.getByRole("slider", { name: "read as of", exact: true })).toHaveValue("1");
  await expect(panel.getByRole("radio", { name: "as of cutoff", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(row.locator("td").nth(1)).toHaveText("10");
});
