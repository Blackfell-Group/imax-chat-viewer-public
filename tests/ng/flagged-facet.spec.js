const { test, expect } = require('@playwright/test');

// Internal review, 7 Aug: "When a thread is flagged for a targeter, there is
// no easy way to sort or filter for these in the Search & Triage pane."
//
// The disposition already existed and the queue already kept flagged threads
// visible — what was missing was any way to isolate them again. Flagging is
// the handoff to a targeting officer, so losing track of what you flagged is
// losing the handoff.

test('flagging surfaces a Flagged facet that isolates the handoff pile', async ({ page }) => {
  await page.goto('/');

  // Nothing flagged yet: the facet stays out of the way.
  await expect(page.getByTestId('facet-flagged')).toHaveCount(0);

  await page.getByTestId('thread-t-1001').click();
  await page.getByTestId('dispo-flagged-t-1001').click();
  await page.getByTestId('thread-t-1002').click();
  await page.getByTestId('dispo-flagged-t-1002').click();

  const facet = page.getByTestId('facet-flagged');
  await expect(facet).toBeVisible();
  await expect(facet).toContainText('Flagged 2');

  // Filtering leaves only the flagged threads.
  await facet.click();
  const threads = page.locator('[data-testid^="thread-t-"]');
  await expect(threads).toHaveCount(2);
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();
  await expect(page.getByTestId('thread-t-1002')).toBeVisible();

  // And turning it off restores the full queue.
  await facet.click();
  await expect.poll(() => threads.count()).toBeGreaterThan(2);
});

test('flagged-first sorting lifts the handoff pile without losing the rest', async ({ page }) => {
  await page.goto('/');

  // Flag something that sorts late by default (oldest-first).
  const all = page.locator('[data-testid^="thread-t-"]');
  const lastId = await all.last().getAttribute('data-testid');
  await all.last().click();
  await page.getByTestId(`dispo-flagged-${lastId.replace('thread-', '')}`).click();

  await page.getByTestId('sort-select').selectOption('flagged');
  await expect(all.first()).toHaveAttribute('data-testid', lastId);

  // Everything else is still there, just below it.
  await expect.poll(() => all.count()).toBeGreaterThan(1);
});

test('the flagged filter clears with everything else', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();
  await page.getByTestId('dispo-flagged-t-1001').click();
  await page.getByTestId('facet-flagged').click();
  await expect(page.locator('[data-testid^="thread-t-"]')).toHaveCount(1);

  await page.getByTestId('clear-search').click();
  await expect.poll(() => page.locator('[data-testid^="thread-t-"]').count()).toBeGreaterThan(1);
});
