const { test, expect } = require('@playwright/test');

// Queue-only bench view (hcd/one_output_model.md §6): the find tools —
// search, modes, content-type lanes, date range, facets, groups, officer
// tags — collapse away, leaving the linguist's stack and its own controls
// (My languages, sort). Also the preview of the panel-without-search build
// if the Sponsor directs that trim.

test('find tools collapse to leave just the queue; stack controls stay', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('thread-search')).toBeVisible();

  await page.getByTestId('find-toggle').click();

  // Find tools are gone…
  for (const id of [
    'thread-search',
    'mode-toggle',
    'type-document',
    'filters-toggle',
    'facet-has-passport',
    'group-geo-libya-coast',
  ]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }

  // …the stack and its own controls remain.
  await expect(page.getByTestId('mylang-ar')).toBeVisible();
  await expect(page.getByTestId('sort-select')).toBeVisible();
  await expect(page.getByTestId('queue-stats')).toBeVisible();
  await expect(page.getByTestId('queue-progress')).toBeVisible();
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();

  // Scope still works in the queue-only view.
  for (const l of ['fa', 'zh', 'ru', 'en']) await page.getByTestId(`mylang-${l}`).click();
  await expect(page.getByTestId('thread-t-1002')).toHaveCount(0);
  for (const l of ['fa', 'zh', 'ru', 'en']) await page.getByTestId(`mylang-${l}`).click();

  // Restoring brings the find tools back.
  await page.getByTestId('find-toggle').click();
  await expect(page.getByTestId('thread-search')).toBeVisible();
});

test('hiding the find tools returns the linguist to their stack', async ({ page }) => {
  await page.goto('/');

  // Start from an active search (hits showing, not the queue).
  await page.getByTestId('thread-search').fill('warehouse');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();
  await expect(page.getByTestId('queue-stats')).toHaveCount(0);

  // Collapsing clears the query and lands back on the stack.
  await page.getByTestId('find-toggle').click();
  await expect(page.getByTestId('queue-stats')).toBeVisible();
  await expect(page.locator('[data-testid^="hit-"]')).toHaveCount(0);
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();
});
