const { test, expect } = require('@playwright/test');

// Day-5 triage search against the Angular build. First test is the smoke-4
// flow (facets + groups) verbatim; the rest cover the 4-language search flow
// and hit → thread handoff up to the current viewer (message stream is day 6,
// so landing on the evidence message is asserted in the ported smoke-3 later).

test('facet and group triage filters return scoped results', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('facet-has-passport').click();
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  const passportHits = page.locator('[data-testid^="hit-"]');
  await expect(passportHits.first()).toBeVisible();
  await page.getByTestId('clear-search').click();

  await page.getByTestId('group-geo-libya-coast').click();
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  await page.getByTestId('clear-search').click();
  await page.getByTestId('group-wl-flagged-numbers').click();
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();
});

test('4-language search: native scripts, cross-language, stats', async ({ page }) => {
  await page.goto('/');

  // Arabic native script.
  await page.getByTestId('thread-search').fill('مستودع');
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  // English finds Arabic content through the translation layer.
  await page.getByTestId('thread-search').fill('bill of lading');
  const crossHit = page.getByTestId('hit-m-6');
  await expect(crossHit).toBeVisible();
  await expect(crossHit).toContainText('matched in EN translation');

  // Cyrillic matches Russian originals.
  await page.getByTestId('thread-search').fill('склад');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  // Chinese matches CJK originals.
  await page.getByTestId('thread-search').fill('仓库');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  // Corpus-wide sweep shows full stats.
  await page.getByTestId('thread-search').fill('warehouse');
  await expect(page.getByTestId('search-stats')).toContainText('threads');
});

test('entity mode with a group implies selector search; hit opens the thread', async ({ page }) => {
  await page.goto('/');

  // Watchlist group → entity semantics even from content mode; entity chip shown.
  await page.getByTestId('group-wl-priority-handles').click();
  const hit = page.locator('[data-testid^="hit-"]').first();
  await expect(hit).toBeVisible();

  // Clicking a hit hands the thread to the viewer with the focus message set.
  await page.getByTestId('thread-search').fill('');
  await page.getByTestId('clear-search').click();
  await page.getByTestId('thread-search').fill('مستودع');
  await page.getByTestId('hit-m-2').click();
  const viewer = page.locator('app-chat-viewer');
  await expect(viewer.getByText('Harbor Freight Coordination')).toBeVisible();

  // Clear returns to the browse queue.
  await page.getByTestId('clear-search').click();
  await expect(page.getByTestId('queue-stats')).toBeVisible();
});
