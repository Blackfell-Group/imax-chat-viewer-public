const { test, expect } = require('@playwright/test');
const { promoteThread: promote } = require('./promote');

// Internal review, 7 Aug: no confirmation on copy; the export popup is too
// small and not resizable; no way to reorder threads in the tray; the side
// panels only close, they don't resize.


test('copying the export confirms it happened', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await promote(page, 't-1001');

  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-modal')).toBeVisible();
  await page.getByTestId('export-copy').click();

  // The defect was silence — the officer could not tell copy from no-op.
  await expect(page.locator('.mat-mdc-snack-bar-label').last()).toContainText(/Copied/i);

  // And it really did copy, not just claim to.
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('GOLD COPY');
  expect(clip).toContain('t-1001');
});

test('the export dialog is large and maximizes', async ({ page }) => {
  await page.goto('/');
  await promote(page, 't-1001');
  await page.getByTestId('export-btn').click();

  const modal = page.getByTestId('export-modal');
  const before = await modal.boundingBox();
  // Was min(600px, 90vw); a full verdicted transcript needs more than that.
  expect(before.width).toBeGreaterThan(700);

  await page.getByTestId('export-maximize').click();
  await page.waitForTimeout(150);
  const after = await modal.boundingBox();
  expect(after.width).toBeGreaterThan(before.width);
  expect(after.width).toBeGreaterThan(page.viewportSize().width * 0.9);
});

test('gold threads reorder by drag, and the export follows the new order', async ({ page }) => {
  await page.goto('/');
  await promote(page, 't-1001');
  await promote(page, 't-1002');

  const cards = page.getByTestId('gold-tray').locator('[data-testid^="thread-gold-"]');
  await expect(cards).toHaveCount(2);
  expect(await cards.first().getAttribute('data-testid')).toBe('thread-gold-t-1001');

  // Export order before the move.
  await page.getByTestId('export-btn').click();
  const before = await page.getByTestId('export-text').inputValue();
  expect(before.indexOf('t-1001')).toBeLessThan(before.indexOf('t-1002'));
  await page.getByTestId('export-modal').getByText('Close').click();

  // Drag the second card above the first.
  const source = page.getByTestId('thread-gold-t-1002').locator('.drag-handle');
  const targetBox = await page.getByTestId('thread-gold-t-1001').boundingBox();
  // Two moves before the drop: the CDK needs one to enter the drag state and
  // another to register the position, and a single jump intermittently lands
  // before the drop list has picked the item up.
  await source.hover();
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 40, { steps: 8 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 2, { steps: 12 });
  await page.mouse.up();

  await expect
    .poll(async () => cards.first().getAttribute('data-testid'), { timeout: 5000 })
    .toBe('thread-gold-t-1002');

  // The order IS the product: the export must follow it.
  await page.getByTestId('export-btn').click();
  const after = await page.getByTestId('export-text').inputValue();
  expect(after.indexOf('t-1002')).toBeLessThan(after.indexOf('t-1001'));
});

test('both side panels resize by dragging, and double-click restores', async ({ page }) => {
  await page.goto('/');

  const nav = page.getByTestId('nav-panel');
  const startWidth = (await nav.boundingBox()).width;

  const handle = page.getByTestId('nav-resize');
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 160, hb.y + hb.height / 2, { steps: 10 });
  await page.mouse.up();

  const widened = (await nav.boundingBox()).width;
  expect(widened).toBeGreaterThan(startWidth + 100);

  // Double-click restores the default. Compared against the width the panel
  // actually started at rather than the literal 312, because boundingBox()
  // includes the 1px border and style.width does not.
  await handle.dblclick();
  expect((await nav.boundingBox()).width).toBeCloseTo(startWidth, 0);

  // Gold copy resizes from its left edge, so dragging left widens it.
  const gold = page.getByTestId('goldcopy-panel');
  const goldStart = (await gold.boundingBox()).width;
  const gh = await page.getByTestId('goldcopy-resize').boundingBox();
  await page.mouse.move(gh.x + gh.width / 2, gh.y + gh.height / 2);
  await page.mouse.down();
  await page.mouse.move(gh.x - 140, gh.y + gh.height / 2, { steps: 10 });
  await page.mouse.up();
  expect((await gold.boundingBox()).width).toBeGreaterThan(goldStart + 80);
});
