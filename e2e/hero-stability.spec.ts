import { test, expect } from '@playwright/test';

for (const width of [320, 375, 390, 768, 1280]) {
  test(`hero actions stay in place through valid animated text states at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:844});
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const name = document.querySelector<HTMLElement>('[data-scramble]')!;
      const typed = document.querySelector<HTMLElement>('[data-type]')!;
      const cta = document.querySelector<HTMLElement>('.hero .cta')!;
      const target = name.dataset.text!;
      const phrases: string[] = JSON.parse(typed.dataset.type!);
      const prefixes = new Set(phrases.flatMap(s => Array.from({length:s.length + 1}, (_, i) => s.slice(0, i))));
      // The scramble fixes its first letter on the first tick and preserves spaces.
      const names = [target, ...['W', 'M', '#'].map(glyph => [...target].map((c, i) => i === 0 || c === ' ' ? c : glyph).join(''))];
      const positions: number[] = [], overflows: number[] = [];
      for (const n of names) for (const phrase of prefixes) {
        name.textContent = n; typed.textContent = phrase;
        positions.push(cta.getBoundingClientRect().top);
        overflows.push(document.documentElement.scrollWidth - innerWidth);
      }
      name.textContent = target; typed.textContent = phrases[0];
      return {count:positions.length, drift:Math.max(...positions) - Math.min(...positions), overflow:Math.max(...overflows)};
    });
    expect(result.count).toBeGreaterThan(100);
    expect(result.drift).toBeLessThanOrEqual(1);
    expect(result.overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole('heading', {name:'Oscar Choi',exact:true})).toBeVisible();
  });
}
