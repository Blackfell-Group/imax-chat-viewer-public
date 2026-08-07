const { test, expect } = require('@playwright/test');

// Day-6 chat viewer against the Angular build. The first two tests are the
// smoke-1 and smoke-3 flows verbatim (minus nothing — both are fully
// supported now); the rest cover the flash landing and the summary widget.

test('thread queue loads and Arabic message renders RTL', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();
  await expect(page.getByTestId('thread-t-1002')).toBeVisible();

  await page.getByTestId('thread-t-1001').click();
  const arabicMsg = page.getByTestId('msg-m-1');
  await expect(arabicMsg).toBeVisible();
  // RTL correctness: the Arabic message body must carry dir="rtl".
  await expect(arabicMsg.locator('p[dir="rtl"]')).toHaveCount(1);
});

test('message search accepts native-script and cross-language queries', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('thread-search').fill('مستودع');
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  const arabicHits = page.locator('[data-testid^="hit-"]');
  await expect(arabicHits.first()).toBeVisible();

  await page.getByTestId('hit-m-2').click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();
  await expect(page.getByTestId('msg-m-2')).toBeVisible();

  await page.getByTestId('thread-search').fill('bill of lading');
  const crossHit = page.getByTestId('hit-m-6');
  await expect(crossHit).toBeVisible();
  await expect(crossHit).toContainText('matched in EN translation');

  await page.getByTestId('thread-search').fill('склад');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  await page.getByTestId('thread-search').fill('warehouse');
  await expect(page.getByTestId('search-stats')).toContainText('threads');
});

test('search hit lands on the evidence with a flash', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-search').fill('مستودع');
  await page.getByTestId('hit-m-2').click();

  // The focused message carries the flash highlight on arrival…
  const target = page.getByTestId('msg-m-2');
  await expect(target).toHaveClass(/flash/);
  // …and it fades back out (1.8s timer).
  await expect(target).not.toHaveClass(/flash/, { timeout: 5000 });
});

test('summary widget renders on demand and collapses out of the way', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  await page.getByTestId('summarize-btn').click();
  const widget = page.getByTestId('summary-widget');
  await expect(widget).toBeVisible();
  await expect(widget).toContainText('Tripoli');
  await expect(widget).toContainText('EXECUTIVE SUMMARY · mock-summarize');

  // Toggle collapses the widget out of the way (density belongs to the
  // reader, not the tool).
  await page.getByTestId('summarize-btn').click();
  await expect(widget).toHaveCount(0);
});
