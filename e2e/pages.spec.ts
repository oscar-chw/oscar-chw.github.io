import { test, expect } from "@playwright/test";
import { localPyodide } from "./pyodide";

test("primary navigation reaches every section", async ({ page }) => {
  await page.goto("/");
  for (const [name, path] of [["Work", "/projects/"], ["Demos", "/demos/"], ["About", "/about/"], ["CV", "/cv/"]]) {
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("seven grouped project pages exist and every write-up follows the problem → limits structure", async ({ page }) => {
  await page.goto("/projects/");
  const links = page.locator('main a[href*="/projects/"]');
  const hrefs = [...new Set(await links.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname)))].filter((h) => h !== "/projects/");
  expect(hrefs.length).toBe(7);
  for (const h of hrefs) {
    await page.goto(h);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // every write-up (a page, or each part of a grouped page) opens with the problem and closes with its limits
    const problems = await page.locator("main").getByRole("heading", { name: /^the problem$/i }).count();
    const limits = await page.locator("main").getByRole("heading", { name: /^limits$/i }).count();
    const parts = await page.locator("main .part ~ * h3, main .body > h2").count();   // headings present at all
    expect(parts).toBeGreaterThan(0);
    expect(problems).toBeGreaterThan(0);
    expect(limits).toBe(problems);
  }
});

test("old project URLs land on their section of the group page", async ({ page }) => {
  for (const [old, group] of [["factor-lab", "ai-quant-research-system"], ["pokemon-tcg-ai", "competitions"], ["studyflow", "coursework"]]) {
    await page.goto(`/projects/${old}/`);
    await expect(page).toHaveURL(new RegExp(`/projects/${group}/#${old}$`));
    await expect(page.locator(`#${old}`)).toBeAttached();
  }
});

test("theme toggle switches and persists across pages", async ({ page }) => {
  await page.goto("/about/");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /theme/i }).click();
  const after = await html.getAttribute("data-theme");
  expect(after).not.toBe(before);
  await page.goto("/projects/");
  await expect(html).toHaveAttribute("data-theme", after!);
});

test("skip link is the first tab stop and focus is visible", async ({ page, browserName }) => {
  await page.goto("/about/");
  // Safari only tabs to links with Option held.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skip = page.getByRole("link", { name: /skip to content/i });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
});

test("about shows the photo and both confirmed minors", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByRole("img", { name: /oscar/i })).toBeVisible();
  await expect(page.locator("main")).toContainText("Minors in Data Analytics and Informatics, and Business");
});

test("cv page offers the phone-free PDF", async ({ page }) => {
  await page.goto("/cv/");
  const link = page.getByRole("link", { name: /download/i });
  await expect(link).toHaveAttribute("href", /Oscar_Choi_CV\.pdf$/);
  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
});

test("card has both QR codes and prints on one page", async ({ page }) => {
  await page.goto("/card/");
  await expect(page.getByRole("img", { name: /QR.*oscar-chw\.github\.io/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR.*linkedin/i })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
});

test("unknown paths get the 404 page", async ({ page }) => {
  const res = await page.goto("/no-such-page/");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /home/i }).first()).toBeVisible();
});

test("command palette: / opens it, typing filters, Enter navigates, Escape closes", async ({ page }) => {
  await page.goto("/about/");
  await page.keyboard.press("/");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.keyboard.type("fatqat");
  await expect(dialog.getByRole("option").filter({ visible: true })).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/fatqat-gpu-backend\/$/);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
});

test("typing in the top bar opens the console; commands answer, unknown ones say so", async ({ page }) => {
  await localPyodide(page);
  await page.goto("/projects/");
  await page.locator("[data-term]").click();
  await page.keyboard.type("whoami");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".pq")).toHaveValue(/whoami$/);
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".po")).toContainText("open to work");
  await dialog.locator(".pq").fill(["rm", "-rf", "/"].join(" "));
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".po")).toContainText("blocked by guard.py", { timeout: 30_000 });
  await dialog.locator(".pq").fill("git status");
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".po")).toContainText("guard.py allows it");
  await page.keyboard.press("ArrowUp");
  await expect(dialog.locator(".pq")).toHaveValue("git status");
  await page.keyboard.press("Control+c");
  await expect(dialog.locator(".pq")).toHaveValue("");
  await dialog.locator(".pq").fill("xyzzy");
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".po")).toContainText("command not found");
  await dialog.locator(".pq").fill("cd compet");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/competitions\/$/);
});

test("Enter pressed in the top bar while the console is still loading still runs the command", async ({ page }) => {
  await page.route(/\/console\.js$/, async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
  await page.goto("/projects/");
  await page.locator("[data-term]").click();
  await page.keyboard.type("whoami");
  await page.keyboard.press("Enter");                     // before console.js has arrived
  await expect(page.getByRole("dialog", { name: "Command palette" }).locator(".po")).toContainText("open to work", { timeout: 8000 });
});

test("a slow guard verdict never overwrites the output of a later command", async ({ page }) => {
  await localPyodide(page);
  await page.route(/\/lab\/guard\.py$/, async (r) => { await new Promise((res) => setTimeout(res, 2000)); await r.continue(); });
  await page.goto("/projects/");
  await page.locator("[data-term]").click();
  await page.keyboard.type("git push --force origin main");
  await page.keyboard.press("Enter");
  const q = page.locator(".palette .pq"), out = page.locator(".palette .po");
  await q.fill("whoami"); await q.press("Enter");
  await expect(out).toContainText("open to work");
  await page.waitForTimeout(3500);                               // the verdict has arrived by now
  await expect(out).toContainText("open to work");
});

test("the piano never takes letters typed into a text field", async ({ page }) => {
  await page.goto("/about/");
  const piano = page.locator(".hob").filter({ hasText: "piano" }).first();
  await piano.scrollIntoViewIfNeeded();
  await piano.hover();
  await page.locator("[data-term]").focus();
  await page.keyboard.type("harbour");
  await expect(page.locator(".palette .pq")).toHaveValue("harbour");
});

test("Escape closes an open definition without moving the pointer, and the pointer can rest on it", async ({ page }) => {
  await page.goto("/projects/ai-quant-research-system/");
  const term = page.locator(".def").first(), pop = term.locator(".pop");
  await term.scrollIntoViewIfNeeded();
  await term.hover();
  await expect(pop).toBeVisible();
  const box = (await pop.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await expect(pop).toBeVisible();                               // hoverable (WCAG 1.4.13)
  await page.keyboard.press("Escape");
  await expect(pop).toBeHidden();                                // dismissible
});

test("if the console's code fails to load once, the next keystroke tries again", async ({ page }) => {
  let fails = 1;
  await page.route(/\/console\.js$/, (r) => (fails-- > 0 ? r.abort() : r.continue()));
  await page.goto("/projects/");
  await page.locator("[data-term]").click();
  await page.keyboard.type("w");                                  // this load fails
  await page.waitForTimeout(400);
  await page.keyboard.type("hoami");                              // the next keystroke loads it again
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".palette .pq")).toHaveValue("whoami");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Command palette" }).locator(".po")).toContainText("open to work", { timeout: 8000 });
});

test("one object: hovering a project row turns the pinned object into that project", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const rows = page.locator("[data-work-object] [data-row]");
  await rows.nth(2).scrollIntoViewIfNeeded();
  await rows.nth(3).hover();
  await expect(rows.nth(3)).toHaveAttribute("aria-current", "true");
  await expect(page.locator('[data-work-object] [data-state="3"]')).toHaveAttribute("data-active", "");
  await expect(page.locator('[data-work-object] [data-state="0"]')).not.toHaveAttribute("data-active", "");
});

test("background music: off until asked for, toggles from the nav, and is remembered across pages", async ({ page }) => {
  await page.route(/https:\/\/(www\.)?youtube(-nocookie)?\.com\//, (r) => r.abort());   // never contact YouTube from tests
  await page.goto("/about/");
  const btn = page.locator("[data-music-toggle]"), html = page.locator("html");
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(html).not.toHaveAttribute("data-music", "");          // nothing plays on arrival
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(btn).toHaveAttribute("aria-label", "Mute background music");
  await expect(html).toHaveAttribute("data-music", "");
  await page.goto("/projects/");                                     // a new page: remembered, waits for a gesture
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(html).not.toHaveAttribute("data-music", "");
  await page.keyboard.press("Shift");
  await expect(html).toHaveAttribute("data-music", "");
  await btn.click();                                                 // mute
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(html).not.toHaveAttribute("data-music", "");
  await page.reload();
  await page.keyboard.press("Shift");
  await page.waitForTimeout(500);
  await expect(html).not.toHaveAttribute("data-music", "");          // muted stays muted
});

test("music panel: hover shows the tracks and the volume; a YouTube track plays in a visible, credited mini-player", async ({ page }) => {
  await page.route(/https:\/\/(www\.)?youtube(-nocookie)?\.com\//, (r) => r.abort());   // never contact YouTube from tests
  await page.goto("/about/");
  const btn = page.locator("[data-music-toggle]"), pop = page.locator(".mus-pop");
  await btn.hover();
  await expect(pop).toBeVisible();
  await expect(pop.getByRole("radio")).toHaveCount(2);
  await expect(pop.getByRole("radio", { name: /unlasting/ })).toBeChecked();         // the default
  await expect(pop.locator("[data-mus-now]")).toContainText("off");
  await pop.getByLabel("Music volume").fill("30");
  await expect(pop.locator("[data-mus-vol-out]")).toHaveText("30%");
  await pop.getByText("Rosalina's Observatory").click();
  await btn.click();
  const mini = page.locator(".ytmini");
  await expect(mini).toBeVisible();
  await expect(mini.locator("iframe")).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\/K6jn04Qb0J4\?/);
  await expect(mini.getByRole("link")).toContainText("Erik C 'Piano Man'");
  await btn.hover();
  await expect(pop.locator("[data-mus-now]")).toContainText("Rosalina's Observatory");
  await mini.getByRole("button", { name: "Close the player" }).click();
  await expect(mini).toHaveCount(0);
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await page.reload();                                               // the choices are remembered
  await btn.hover();
  await expect(pop.getByLabel("Music volume")).toHaveValue("30");
  await expect(pop.getByRole("radio", { name: /Rosalina/ })).toBeChecked();
});
