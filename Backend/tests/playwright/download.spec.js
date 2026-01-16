import { test, expect } from '@playwright/test';

test('Download Excel button works', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#downloadExcelBtn')
  ]);
  const path = await download.path();
  expect(path).not.toBeNull();
});
