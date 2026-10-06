import { test, expect } from "@playwright/test";
import { localPyodide } from "./pyodide";

// Every demo page states its data source ([data-testid=data-source]) and has instructions.
const DEMOS = [
  ["/demos/fourier/", /photo|path/i],
  ["/demos/order-book/", /synthetic/i],
  ["/demos/reconciliation/", /synthetic/i],
  ["/demos/harbour/", /synthetic/i],
] as const;

test("the lab covers every project and links all four full demos", async ({ page }) => {
  await page.goto("/projects/");
  const projects = await page.locator('main a[href*="/projects/"]').evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).pathname.split("/").filter(Boolean).pop()))].filter((s) => s !== "projects"));
  expect(projects.length).toBe(6);
  await page.goto("/demos/");
  for (const slug of projects) await expect(page.locator(`[data-panel] a[href*="/projects/${slug}/"]`).first()).toBeAttached();
  for (const [href] of DEMOS) await expect(page.locator(`[data-panel] a.launch[href$="${href}"]`).first()).toBeAttached();
});

test("lab: deep links open an experiment; the arrow keys walk the rail", async ({ page }) => {
  await page.goto("/demos/#asof");
  await expect(page.locator('[data-panel="asof"]')).toBeVisible();
  await expect(page.locator('[data-panel="guard"]')).toBeHidden();
  await page.locator(".tree [role=listbox]").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-panel="lostupdates"]')).toBeVisible();
  await expect(page).toHaveURL(/#lostupdates$/);
});

test("lab: the real guard.py blocks a home-directory wipe with its reason and allows git status", async ({ page }) => {
  await localPyodide(page);
  const py: string[] = [];
  page.on("request", (r) => { if (/pyodide/.test(r.url())) py.push(r.url()); });
  await page.goto("/demos/#guard");
  await page.waitForTimeout(1000);
  expect(py).toEqual([]);                      // opening the Lab downloads no Python
  const input = page.locator(".gt-in");
  await input.focus();
  await expect(page.locator(".gt-status")).toContainText("real guard loaded", { timeout: 30_000 });
  await input.fill(["rm", "-rf", "~"].join(" ")); await input.press("Enter");
  const last = page.locator(".gt-log li").last();
  await expect(last).toContainText("blocked");
  await expect(last.locator(".w")).not.toHaveText("");
  await input.fill("git status"); await input.press("Enter");
  await expect(page.locator(".gt-log li").last()).toContainText("allowed");
  // shell keys: up recalls history, Ctrl+K kills to the end without opening the site console
  await input.press("ArrowUp"); await expect(input).toHaveValue("git status");
  await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(0, 0));   // cursor to the start (Home does not do this on macOS)
  await input.press("Control+k");
  await expect(input).toHaveValue("");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
});

test("lab: the Bell state preset gives 0.500 on |00⟩ and |11⟩", async ({ page }) => {
  await page.goto("/demos/#qubits");
  const panel = page.locator('[data-panel="qubits"]');
  await panel.getByRole("radio", { name: "2", exact: true }).click();
  await panel.getByRole("button", { name: "Bell state" }).click();
  await expect(panel.locator(".amp b").nth(0)).toHaveText("0.500");
  await expect(panel.locator(".amp b").nth(3)).toHaveText("0.500");
});

test("lab: the timetable refuses a clash and names it", async ({ page }) => {
  await page.goto("/demos/#timetable");
  const panel = page.locator('[data-panel="timetable"]');
  await panel.getByRole("button", { name: "CSCI 3100 · A" }).click();
  await panel.getByRole("button", { name: "STAT 2005 · A" }).click();
  await expect(panel.locator(".lab-note.mono")).toContainText("clashes with CSCI 3100");
});

test("lab: peeking at today's return reveals the leaky backtest", async ({ page }) => {
  await page.goto("/demos/#lookahead");
  const panel = page.locator('[data-panel="lookahead"]');
  await expect(panel.locator(".ro dd").nth(1)).toHaveText("hidden");
  await panel.getByRole("radio", { name: "yes" }).click();
  await expect(panel.locator(".ro dd").nth(1)).toHaveText(/%$/);
});

test("lab: an illegal move gets no probability", async ({ page }) => {
  await page.goto("/demos/#policy");
  await page.locator('[data-panel="policy"] .card').first().click();
  await expect(page.locator('[data-panel="policy"] .card').first()).toContainText("masked");
});

for (const [path, source] of DEMOS) {
  test(`${path} states its data source and has instructions`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId("data-source")).toContainText(source);
    await expect(page.getByTestId("instructions")).toBeVisible();
  });
}

test("fourier: more circles draw the portrait more accurately", async ({ page }) => {
  await page.goto("/demos/fourier/");
  const slider = page.getByTestId("fourier-circles");
  const err = page.getByTestId("fourier-error");
  await slider.fill("10");
  await expect(err).toHaveAttribute("data-value", /\d/);
  const coarse = Number(await err.getAttribute("data-value"));
  await slider.fill("400");
  await expect(err).not.toHaveAttribute("data-value", String(coarse));
  const fine = Number(await err.getAttribute("data-value"));
  expect(fine).toBeLessThan(coarse);
});

test("fourier: a path drawn by hand is redrawn by circles", async ({ page }) => {
  await page.goto("/demos/fourier/");
  await page.getByTestId("fourier-draw").click();
  const canvas = page.getByTestId("fourier-canvas");
  const b = (await canvas.boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
  await page.mouse.down();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    await page.mouse.move(b.x + b.width * (0.5 + 0.2 * Math.cos(a)), b.y + b.height * (0.5 + 0.2 * Math.sin(a)));
  }
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-state", "playing");
  await expect(page.getByTestId("fourier-error")).toHaveAttribute("data-source", "drawn");
});

test("order-book replay: play advances the tape and the book stays uncrossed", async ({ page }) => {
  await page.goto("/demos/order-book/");
  const step = page.getByTestId("replay-step");
  const s0 = Number(await step.textContent());
  await page.getByTestId("replay-play").click();
  await expect.poll(async () => Number(await step.textContent()), { timeout: 5000 }).toBeGreaterThan(s0);
  const bid = Number(await page.getByTestId("best-bid").textContent());
  const ask = Number(await page.getByTestId("best-ask").textContent());
  expect(bid).toBeLessThan(ask);
});

test("reconciliation: both series are drawn from the measured file", async ({ page }) => {
  await page.goto("/demos/reconciliation/");
  await expect(page.getByTestId("series-inmemory")).toBeVisible();
  await expect(page.getByTestId("series-streaming")).toBeVisible();
  await page.getByTestId("recon-play").click();
  await expect.poll(async () => Number(await page.getByTestId("recon-progress").getAttribute("data-value")), { timeout: 8000 }).toBeGreaterThan(0);
});

test("harbour demo page renders the interactive harbour", async ({ page }) => {
  await page.goto("/demos/harbour/");
  await expect(page.getByTestId("harbour").locator("canvas").first()).toBeVisible();
});

test("fourier: the drawing animation can be paused", async ({ page }) => {
  await page.goto("/demos/fourier/");
  const canvas = page.getByTestId("fourier-canvas");
  await expect(canvas).toHaveAttribute("data-state", "playing");
  await page.getByTestId("fourier-pause").click();
  await expect(page.getByTestId("fourier-pause")).toHaveAttribute("aria-pressed", "true");
  const a = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(600);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(a);
  await page.getByTestId("fourier-pause").click();
  await page.waitForTimeout(600);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(a);
});

test("fourier: your own photo is traced in the browser and never sent anywhere", async ({ page }) => {
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#000"/><circle cx="80" cy="80" r="50" fill="#fff"/><rect x="30" y="20" width="30" height="30" fill="#fff"/></svg>')).png().toBuffer();
  await page.goto("/demos/fourier/");
  await expect(page.getByTestId("privacy-note")).toContainText("never uploaded");
  await expect(page.getByTestId("fourier-error")).toHaveAttribute("data-value", /\d/);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.getByTestId("fourier-upload").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("fourier-error")).toHaveAttribute("data-source", "photo", { timeout: 10000 });
  expect(requests).toEqual([]);                       // nothing at all left the page while tracing
});

test("order-book replay: holding Step keeps stepping; a click steps once", async ({ page }) => {
  await page.goto("/demos/order-book/");
  const step = page.getByTestId("replay-step"), btn = page.getByTestId("replay-stepbtn");
  const s0 = Number(await step.textContent());
  await btn.click();
  await expect(step).toHaveText(String(s0 + 1));
  const box = (await btn.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1300); await page.mouse.up();
  const s1 = Number(await step.textContent());
  expect(s1 - (s0 + 1)).toBeGreaterThan(8);
  await page.waitForTimeout(400);
  expect(Number(await step.textContent())).toBe(s1);        // stops when released
});

test("lab: a gated build only moves when a gate passes; a planted bug sends task 4 back with evidence", async ({ page }) => {
  await page.goto("/demos/#gatedbuild");
  const panel = page.locator('[data-panel="gatedbuild"]'), rows = panel.locator(".gb-t");
  await expect(rows).toHaveCount(5);
  await panel.getByRole("button", { name: /the next task is done/ }).click();
  await expect(panel.locator(".gb-msg")).toContainText("a claim is not evidence");
  await expect(rows.nth(0)).toHaveClass(/ready/);
  await panel.getByRole("radio", { name: "has a bug" }).click();
  for (const i of [0, 1, 2]) await rows.nth(i).getByRole("button", { name: "run gate" }).click();
  await rows.nth(3).getByRole("button", { name: "run gate" }).click();
  await expect(rows.nth(3)).toHaveClass(/ready/);                       // back to pending, still the next to run
  await expect(rows.nth(3).locator(".gb-e")).toHaveCount(1);
  await expect(rows.nth(4).getByRole("button", { name: "run gate" })).toBeDisabled();
  await panel.getByRole("radio", { name: "correct" }).click();
  await rows.nth(3).getByRole("button", { name: "run gate" }).click();
  await expect(rows.nth(3)).toHaveClass(/done/);
  await expect(rows.nth(4)).toHaveClass(/ready/);
});

test("lab: the candle timing audit flags every read when candles are stamped at their open", async ({ page }) => {
  await page.goto("/demos/#candles");
  const panel = page.locator('[data-panel="candles"]');
  await expect(panel.locator(".ro")).toContainText("0 of");
  await panel.getByRole("radio", { name: "open" }).click();
  await expect(panel.locator(".ro")).toContainText(/(\d+) of \1 reads used a close not yet known/);
});

test("lab: the 3D option surface draws, turns with the keys, and its readout satisfies put–call parity", async ({ page }) => {
  await page.goto("/demos/#options");
  const panel = page.locator('[data-panel="options"]'), canvas = panel.locator("canvas.s3d");
  await expect(canvas).toBeVisible();
  const ink = () => canvas.evaluate((c: HTMLCanvasElement) => { const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n / (d.length / 4); });
  await expect.poll(ink).toBeGreaterThan(0.1);                 // a real surface, not an empty canvas
  await canvas.focus(); await page.keyboard.press("ArrowLeft");
  await expect(panel.locator(".ro")).toContainText("put–call parity");
  await expect(panel.locator(".ro")).toContainText(/= \de[+-]\d/);
  await panel.getByRole("radio", { name: "implied vol" }).click();
  await expect(panel.locator(".ro")).toContainText("ATM, 1y");
});

test("lab: lost updates — last-write-wins loses updates, compare-and-swap keeps them all", async ({ page }) => {
  await page.goto("/demos/#lostupdates");
  const panel = page.locator('[data-panel="lostupdates"]');
  await expect(panel.locator(".lu-big .bad b")).not.toHaveText("0");
  await panel.getByRole("radio", { name: "compare-and-swap" }).click();
  await expect(panel.locator(".lu-big .good b")).toHaveText("0");
  await expect(panel.locator(".lu-lane")).toHaveCount(6);       // the record plus five writers
});

test("lab: search answers from this site's own text, explains each score, and the links land on real sections", async ({ page }) => {
  await page.goto("/demos/#search");
  const panel = page.locator('[data-panel="search"]');
  await expect(panel.locator(".sr li").first()).toContainText("BM25");
  await panel.locator(".sr-in").fill("order book replay");
  const first = panel.locator(".sr li a").first();
  await expect(first).toContainText(/Point-in-time|order/i);
  const href = await first.getAttribute("href");
  await page.goto(href!);
  await expect(page.locator(`#${href!.split("#")[1]}`)).toBeAttached();
});
