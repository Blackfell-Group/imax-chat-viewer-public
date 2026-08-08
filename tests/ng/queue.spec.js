const { test, expect } = require('@playwright/test');

// The linguist's stack. AMENDED 1 Aug ×2 (hcd/one_output_model.md): queue
// rows carry no actions — done means promoted to gold (or a deliberate strip
// decision) — so the smoke-5 disposition beat is replaced by the real bench
// path. Scope/type/facet beats remain verbatim from the smoke suite.

test('content-type, language scope, and the stack ticks only when work is done', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('hasdoc-t-1001')).toBeVisible();

  await page.getByTestId('type-document').click();
  await expect(page.getByTestId('queue-stats')).toContainText('new');
  const docThreads = page.locator('[data-testid^="thread-t-"]');
  await expect(docThreads.first()).toBeVisible();
  await page.getByTestId('type-document').click(); // clear

  await expect(page.getByTestId('thread-t-1002')).toBeVisible(); // Farsi thread visible by default
  for (const l of ['fa', 'zh', 'ru', 'en']) await page.getByTestId(`mylang-${l}`).click();
  await expect(page.getByTestId('thread-t-1002')).toHaveCount(0); // Farsi scoped out
  await expect(page.getByTestId('thread-t-1001')).toBeVisible(); // Arabic remains
  for (const l of ['fa', 'zh', 'ru', 'en']) await page.getByTestId(`mylang-${l}`).click(); // restore

  // No queue-side buttons exist: a row can't be marked done without the work.
  await expect(page.locator('[data-testid^="dispo-reviewed-"]')).toHaveCount(0);

  // The real path: review the whole thread, promote to gold — the stack ticks.
  await page.getByTestId('thread-t-1001').click();
  for (const id of ['m-1', 'm-2', 'm-4', 'm-6', 'm-8']) {
    await page.getByTestId(`confirm-${id}`).click();
  }
  await page.getByTestId('promote-thread-gold').click();
  await expect(page.getByTestId('queue-stats')).toContainText('1 worked');
  await expect(page.getByTestId('thread-t-1001')).toHaveCount(0); // worked item leaves the queue
  await page.getByTestId('queue-toggle').click(); // show all
  await expect(page.getByTestId('thread-t-1001')).toBeVisible(); // reappears in All view
});

test('queue progress ticks via strip decisions and the stack can run clear', async ({ page }) => {
  test.setTimeout(60000); // each open thread auto-translates before the strip click
  await page.goto('/');

  // [31 Jul amendment] N-of-M worked progress is visible from the start.
  await expect(page.getByTestId('queue-progress')).toContainText('0/');

  // Thread-level decisions from the viewer strip tick the stack.
  await page.getByTestId('thread-t-1001').click();
  await page.getByTestId('dispo-discarded-t-1001').click();
  await expect(page.getByTestId('queue-progress')).toContainText('1/');
  await page.getByTestId('thread-t-1002').click();
  await page.getByTestId('dispo-discarded-t-1002').click();
  await expect(page.getByTestId('queue-progress')).toContainText('2/');

  // "When it's done, it's done": scope to the Russian document lane — a
  // three-item stack — and work every one from the strip. Re-snapshot each
  // pass; opening a thread auto-translates, so keep the stack small.
  for (const l of ['ar', 'fa', 'zh', 'en']) await page.getByTestId(`mylang-${l}`).click();
  await page.getByTestId('type-document').click();
  for (let pass = 0; pass < 5; pass++) {
    const ids = await page
      .locator('[data-testid^="thread-t-"]')
      .evaluateAll((rows) => rows.map((r) => r.getAttribute('data-testid').replace('thread-', '')));
    if (ids.length === 0) break;
    const id = ids[0];
    await page.getByTestId(`thread-${id}`).click();
    await page.getByTestId(`dispo-discarded-${id}`).click();
    await expect(page.getByTestId(`thread-${id}`)).toHaveCount(0);
  }
  await expect(page.getByTestId('stack-clear')).toBeVisible();
});

test('thread selection opens the viewer header', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1003').click();
  const viewer = page.locator('app-chat-viewer');
  await expect(viewer.getByText('Warehouse Manifest Review')).toBeVisible();
  await expect(viewer.getByText('LotusLink · 6 messages')).toBeVisible();
});
