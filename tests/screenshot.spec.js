const { test } = require('@playwright/test');

// Not a smoke test — produces the demo-state screenshot used in rehearsal
// materials. Run with: npx playwright test tests/screenshot.spec.js
test('capture demo state', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();
  await page.getByTestId('translate-m-1').click();
  await page.getByTestId('entities-m-3').click();
  await page.getByTestId('entity-chip-m-3-1').click();
  await page.getByTestId('entities-m-4').click();
  await page.getByTestId('summarize-btn').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'demo-state.png', fullPage: false });
});
