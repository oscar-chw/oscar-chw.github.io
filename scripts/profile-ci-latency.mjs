// Informational controls for the Linux-only CI failure. These observations never replace
// acceptance tests: the normal CI job, browser settings and deadlines remain unchanged.
import { chromium, webkit, devices } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { once } from 'node:events';

const base = process.env.PROFILE_BASE_URL ?? 'http://localhost:4340';
const out = resolve(process.env.PROFILE_OUT ?? 'ci-latency-report');
const report = { kind: 'diagnostic, not acceptance', revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), platform: process.platform, results: [] };
const types = { mjs: 'text/javascript', js: 'text/javascript', wasm: 'application/wasm', json: 'application/json', zip: 'application/zip' };
let server;
await mkdir(out, { recursive: true });

// This only starts and stops the preview process owned by this script. A supplied preview
// is reused untouched, so local diagnosis cannot stop another session's server.
if (!process.env.PROFILE_BASE_URL) {
  const pkg = JSON.parse(await readFile('node_modules/astro/package.json', 'utf8'));
  server = spawn(process.execPath, [resolve('node_modules/astro', pkg.bin.astro), 'preview', '--port', '4340', '--ignore-lock'], { stdio: ['ignore', 'inherit', 'inherit'] });
}

async function measure(page, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: 'visible' });
  const frames = await page.evaluate(() => new Promise(resolve => {
    const ticks = [], start = performance.now();
    const deadline = setTimeout(() => resolve({ elapsed: performance.now() - start, ticks, watchdog: true }), 2500);
    function tick(t) {
      ticks.push(t - start);
      if (t - start < 1000) requestAnimationFrame(tick);
      else { clearTimeout(deadline); resolve({ elapsed: t - start, ticks, watchdog: false }); }
    }
    requestAnimationFrame(tick);
  }));
  const clicks = [];
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    await target.click();
    clicks.push(performance.now() - start);
  }
  return { frames, clicks, state: await page.evaluate(() => ({ hidden: document.hidden, focus: document.hasFocus(), dpr: devicePixelRatio })) };
}

async function scenario(browser, engine, name, options, run) {
  const context = await browser.newContext({ ...devices[engine === 'webkit' ? 'Desktop Safari' : 'Desktop Chrome'], reducedMotion: options.reduced ? 'reduce' : 'no-preference', storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'noboot', value: '1' }] }] } });
  const record = { engine, name, traced: options.trace !== false };
  report.results.push(record);
  try {
    if (record.traced) await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    page.setDefaultTimeout(10000); // Diagnostic watchdog only; no acceptance timeout is changed.
    record.pageErrors = [];
    page.on('pageerror', e => record.pageErrors.push(e.message));
    Object.assign(record, await run(page));
  } catch (e) {
    record.error = e.message;
    process.exitCode = 1;
  } finally {
    if (record.traced) await context.tracing.stop({ path: resolve(out, `${engine}-${name}.zip`) });
    await context.close();
    await writeFile(resolve(out, 'profile.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(record));
  }
}

try {
  const deadline = Date.now() + 20000;
  for (;;) {
    try { if ((await fetch(base, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* preview can still be starting */ }
    if (Date.now() >= deadline) throw new Error(`Preview did not become ready at ${base}`);
    await new Promise(r => setTimeout(r, 100));
  }
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
    const browser = await type.launch();
    try {
      await scenario(browser, engine, 'plain-control', {}, async page => {
        await page.route(`${base}/__profile__/plain`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><button id="button">Click</button><output id="count">0</output><script>button.onclick=()=>count.textContent=Number(count.textContent)+1</script>' }));
        await page.goto(`${base}/__profile__/plain`);
        return { ...await measure(page, '#button'), finalCount: await page.locator('#count').innerText() };
      });
      const variants = [['qubits-traced', {}], ['qubits-untraced', { trace: false }], ['qubits-reduced-motion', { reduced: true }]];
      // These styles are applied only by this diagnostic browser to isolate rendering cost.
      // None is shipped in the site or used by the unchanged acceptance tests.
      if (engine === 'webkit') variants.push(
        ['qubits-no-backdrop', { css: '.glass { backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }' }],
        ['qubits-no-entrance', { css: '.exp.enter,.exp.enter .eh h2,.exp.enter .eh .path b,.exp.enter .hud::before { animation:none!important; }' }],
        ['qubits-no-cursor', { css: '.cur-ring,.cur-dot { display:none!important; }' }],
        ['qubits-composited-bar', { css: '.bar.glass { transform:translateZ(0); will-change:transform; }' }],
        ['qubits-no-shadows', { css: '.glass { box-shadow:none!important; }' }],
        ['qubits-no-grid', { css: 'body::before { display:none!important; }' }],
        ['qubits-no-paint-effects', { css: '*,*::before,*::after { box-shadow:none!important; filter:none!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important; background-image:none!important; animation:none!important; transition:none!important; }' }],
        ['qubits-system-font', { css: '* { font-family:Arial,sans-serif!important; }' }],
        ['qubits-no-shared-motion', { noMotion: true }],
        ['qubits-no-styles', { noStyles: true }],
      );
      for (const [name, options] of variants) {
        await scenario(browser, engine, name, options, async page => {
          let suppressedMotion = 0;
          if (options.noMotion) await page.route('**/_astro/Base.astro_astro_type_script_*.js', route => { suppressedMotion++; return route.fulfill({ contentType: 'text/javascript', body: '' }); });
          await page.goto(`${base}/demos/#qubits`);
          if (options.noStyles) {
            await page.locator('.qubit-status').waitFor({ state: 'visible' });
            await page.evaluate(() => { for (const sheet of document.styleSheets) sheet.disabled = true; });
            await page.addStyleTag({ content: '[hidden] {display:none!important}' });
          }
          if (options.css) await page.addStyleTag({ content: options.css });
          const timing = await measure(page, '[data-panel="qubits"] button:text-is("H")');
          if (options.noMotion && suppressedMotion !== 1) throw new Error('Shared motion isolation did not intercept exactly one bundle');
          return { ...timing, suppressedMotion, finalCount: await page.locator('.qubit-status').innerText() };
        });
      }
      await scenario(browser, engine, 'feed-cold-start', {}, async page => {
        const requests = [], start = Date.now();
        page.on('requestfinished', request => {
          const url = request.url();
          if (url.includes('pyodide') || url.includes('/lab/feed-')) requests.push({ path: new URL(url).pathname, completedAfterMs: Date.now() - start });
        });
        await page.route(/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\//, async route => {
          const file = new URL(route.request().url()).pathname.split('/').pop();
          await route.fulfill({ body: await readFile(`node_modules/pyodide/${file}`), contentType: types[file.split('.').pop()] ?? 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } });
        });
        await page.addInitScript(() => {
          window.__profileWasm = [];
          for (const name of ['compile', 'compileStreaming', 'instantiate', 'instantiateStreaming']) {
            const original = WebAssembly[name];
            WebAssembly[name] = function (...args) {
              const start = performance.now();
              return Reflect.apply(original, this, args).then(value => {
                window.__profileWasm.push({ operation: name, start, duration: performance.now() - start }); return value;
              }, error => { window.__profileWasm.push({ operation: name, start, duration: performance.now() - start, error: error.message }); throw error; });
            };
          }
        });
        await page.goto(`${base}/demos/#gatedbuild`);
        const clickedAt = Date.now();
        await page.getByRole('button', { name: 'Run all checks', exact: true }).click();
        const clickCompletedAt = Date.now();
        let deadlineError;
        try {
          await page.waitForFunction(() => /^(Accepted|Rejected|Unavailable)/.test(document.querySelector('.fg-verdict')?.textContent ?? ''), null, { timeout: 30000 });
        } catch (e) { deadlineError = e.message; process.exitCode = 1; }
        return { requests, clickMs: clickCompletedAt - clickedAt, verdictAfterClickMs: Date.now() - clickCompletedAt, verdict: await page.locator('.fg-verdict').innerText(), wasm: await page.evaluate(() => window.__profileWasm), deadlineError };
      });
    } finally { await browser.close(); }
  }
} finally {
  if (server && server.exitCode === null) { const closed = once(server, 'close'); server.kill('SIGTERM'); await closed; }
}
