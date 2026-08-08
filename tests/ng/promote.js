const { expect } = require('@playwright/test');

// Shared "review a thread through and promote it to gold" step.
//
// This exists because two obvious versions are both wrong, and both only fail
// under parallel workers.
//
// The count-once version races the data:
//
//   await expect(confirms.first()).toBeVisible();
//   for (let i = 0; i < (await confirms.count()); i++) await confirms.nth(i).click();
//
// Translations arrive per message, so count() is taken while the rest of the
// buttons are still rendering. The loop confirms a subset, goldReady() stays
// false, and it surfaces 30s later as a timeout on the promote click.
//
// The click-until-empty version races the widget: confirm is a TOGGLE (clicking
// a confirmed message clears the verdict — the un-review affordance). Re-query
// under zoneless change detection and you re-click a button that is already
// pressed, turning it back off. The thread oscillates in and out of GOLD-READY,
// so `toBeEnabled()` passes and the click that follows finds it disabled.
//
// So: wait for the thread to finish translating, enumerate the buttons ONCE,
// and click each at most once, proving each verdict landed before moving on.

/** Confirm every foreign message in the given thread, then promote it to gold. */
async function promoteThread(page, threadId) {
  await page.getByTestId(`thread-${threadId}`).click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();

  // Wait for the viewer to actually be showing THIS thread before reading any
  // meter off it. The header strip is thread-scoped; the gold meter is not, so
  // on a second promote it still reads the previous thread's "translated 5/5"
  // for a frame — which satisfies the check below, enumerates the OLD thread's
  // already-confirmed buttons, skips them all, and leaves promote disabled.
  await expect(page.getByTestId(`dispo-flagged-${threadId}`)).toBeVisible();

  // "translated N/N" — the app's own signal that no more messages are coming.
  await expect(page.getByTestId('thread-gold-ready')).toContainText(/translated (\d+)\/\1/);

  const ids = await page
    .locator('[data-testid^="confirm-"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));
  expect(ids.length, 'thread has foreign messages to confirm').toBeGreaterThan(0);

  for (const id of ids) {
    const button = page.getByTestId(id);
    // Idempotent: never click a verdict that is already recorded.
    if ((await button.getAttribute('aria-pressed')) === 'true') continue;
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  const promote = page.getByTestId('promote-thread-gold');
  await expect(promote).toBeEnabled();
  await promote.click();
  await expect(page.getByTestId(`thread-gold-${threadId}`)).toBeVisible();
}

module.exports = { promoteThread };
