import {test,expect} from '@playwright/test';

test('policy runs visitor scores, excludes illegal moves, and abstains when all are masked',async({page})=>{
  await page.goto('/demos/#policy');const p=page.locator('[data-panel="policy"]'),input=p.getByRole('textbox',{name:'Action scores JSON'});
  await expect(input).toBeVisible();
  await input.fill(JSON.stringify([{action:'A',score:2,legal:true},{action:'B',score:100,legal:false},{action:'C',score:0,legal:true}]));
  await p.getByRole('button',{name:'Compute policy',exact:true}).click();
  await expect(p.locator('.card').nth(0)).toContainText('88%');await expect(p.locator('.card').nth(1)).toContainText('masked');
  await p.locator('.card').nth(0).click();await p.locator('.card').nth(2).click();
  await expect(p.locator('.policy-state')).toContainText('No legal moves');await expect(p.locator('.card.best')).toHaveCount(0);
  await p.getByRole('button',{name:'Load invalid example',exact:true}).click();await p.getByRole('button',{name:'Compute policy',exact:true}).click();
  await expect(p.locator('.we-status')).toContainText('score');await expect(p.locator('.card')).toHaveCount(0);
  await p.getByRole('button',{name:'Load correct example',exact:true}).click();await p.getByRole('button',{name:'Compute policy',exact:true}).click();
  await expect(p.locator('.card')).toHaveCount(8);
});

test('gate reports empirical sample risk and exposes evaluation failures from edited labels',async({page})=>{
  await page.goto('/demos/#gate');const p=page.locator('[data-panel="gate"]'),input=p.getByRole('textbox',{name:'Labelled actions JSON'});
  await expect(input).toBeVisible();
  await input.fill(JSON.stringify({calibration:[{risk:0.1,breaks:false},{risk:0.9,breaks:true}],evaluation:[{risk:0.1,breaks:true},{risk:0.95,breaks:true}]}));
  await p.getByRole('button',{name:'Calibrate and evaluate',exact:true}).click();
  await expect(p.locator('.gate-summary')).toContainText('1 of 2');
  await expect(p.locator('.gate-inspect')).toContainText('breaks a rule');
  await expect(p.locator('[data-stage]')).toContainText('not a conformal guarantee');
  await p.getByRole('button',{name:'Load invalid example',exact:true}).click();await p.getByRole('button',{name:'Calibrate and evaluate',exact:true}).click();
  await expect(p.locator('.we-status')).toContainText('risk');await expect(p.locator('.gate-summary')).toHaveCount(0);
});

test('timetable accepts a custom interval, names a clash, validates times and permits removal',async({page})=>{
  await page.setViewportSize({width:375,height:844});await page.goto('/demos/#timetable');const p=page.locator('[data-panel="timetable"]');
  const name=p.getByRole('textbox',{name:'Section name'});await expect(name).toBeVisible();
  await name.fill('My seminar');await p.getByLabel('Day', {exact:true}).selectOption('0');
  await p.getByLabel('Start time',{exact:true}).fill('09:00');await p.getByLabel('End time',{exact:true}).fill('10:00');
  await p.getByRole('button',{name:'Add section',exact:true}).click();await expect(p.locator('.tt-agenda')).toContainText('My seminar');
  await name.fill('Overlapping meeting');await p.getByLabel('Start time',{exact:true}).fill('09:30');await p.getByLabel('End time',{exact:true}).fill('10:30');
  await p.getByRole('button',{name:'Add section',exact:true}).click();await expect(p.locator('.tt-message')).toContainText('clashes with My seminar');
  await p.getByLabel('Start time',{exact:true}).fill('11:00');await p.getByLabel('End time',{exact:true}).fill('10:00');
  await p.getByRole('button',{name:'Add section',exact:true}).click();await expect(p.locator('.tt-message')).toContainText('after');
  await p.getByRole('button',{name:'Remove My seminar',exact:true}).click();await expect(p.locator('.tt-agenda')).not.toContainText('My seminar');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
