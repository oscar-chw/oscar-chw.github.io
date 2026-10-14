// Upstream reduced reproduction: https://github.com/microsoft/playwright/issues/42637
// Diagnostic only. A crash or interrupted transition is a failure, never a pass.
import { webkit } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const result = { playwright: require('@playwright/test/package.json').version, browser: '', crashed: false, completedCycles: 0, error: null };
const browser = await webkit.launch();
result.browser = browser.version();
const page = await browser.newPage();
page.on('crash', () => { result.crashed = true; });
try {
  await page.setContent('<style>div { transition: filter 0.1s; } .dim { filter: brightness(0.95); }</style>' + '<div>hello</div>'.repeat(10));
  for (let i = 0; i < 100; i++) {
    await page.evaluate(async () => {
      const divs = [...document.querySelectorAll('div')];
      for (const dim of [true, false]) {
        const settled = Promise.all(divs.map(div => new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Filter transition did not finish within 5s')), 5000);
          div.addEventListener('transitionend', () => { clearTimeout(timer); resolve(); }, { once: true });
        })));
        divs.forEach(div => div.classList.toggle('dim', dim));
        await settled;
      }
    });
    result.completedCycles++;
  }
} catch (error) {
  result.error = String(error);
} finally {
  await browser.close();
  writeFileSync('diagnostics/filter-probe.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
if (result.crashed || result.error || result.completedCycles !== 100) process.exitCode = 1;
