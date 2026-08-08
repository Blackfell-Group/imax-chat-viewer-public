const { test, expect } = require('@playwright/test');

// A standing channel is worked whole (targeting direction, 8 Aug) and runs to
// thousands of messages, so clearing the tail one click at a time is not a
// workflow. But hcd/one_output_model.md removed the queue-side "mark reviewed"
// precisely because it let a linguist declare work done without doing it, and a
// blind "confirm 1,197" is that same trap wearing a different hat.
//
// So the affordance exists, and the record stays honest about it: the accept
// states its count first, and every verdict it writes is reported in the gold
// copy as bulk-accepted rather than as a line-by-line confirmation.

const BIG_THREAD = 't-3000';

test('the bulk accept is not offered when reading each message is the job', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1002').click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();

  // t-1002 has three foreign messages. A shortcut there is just a way to skip
  // the work, so the button is not rendered at all.
  await expect(page.getByTestId('bulk-confirm')).toHaveCount(0);
});

test('a long thread can be cleared in one action, after stating the count', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId(`thread-${BIG_THREAD}`).click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();

  const bulk = page.getByTestId('bulk-confirm');
  await expect(bulk).toBeVisible();
  // The count is on the button, so the size of the assertion is visible before
  // it is made rather than after.
  await expect(bulk).toContainText(/Accept remaining \d{3,}/);

  let prompt = '';
  page.on('dialog', (d) => {
    prompt = d.message();
    d.accept();
  });
  await bulk.click();

  expect(prompt).toContain('without reading each one');
  expect(prompt).toContain('bulk-accepted');

  // Everything is now verdicted, so the thread is promotable.
  await expect(page.getByTestId('bulk-confirm')).toHaveCount(0);
  await expect(page.getByTestId('promote-thread-gold')).toBeEnabled();
});

test('declining the accept changes nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId(`thread-${BIG_THREAD}`).click();
  const bulk = page.getByTestId('bulk-confirm');
  await expect(bulk).toBeVisible();
  const before = await bulk.textContent();

  page.on('dialog', (d) => d.dismiss());
  await bulk.click();

  await expect(bulk).toHaveText(before.trim());
  await expect(page.getByTestId('promote-thread-gold')).toBeDisabled();
});

test('the gold copy reports bulk acceptance as what it was', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId(`thread-${BIG_THREAD}`).click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();

  page.on('dialog', (d) => d.accept());
  await page.getByTestId('bulk-confirm').click();
  await expect(page.getByTestId('promote-thread-gold')).toBeEnabled();
  await page.getByTestId('promote-thread-gold').click();

  await page.getByTestId('export-btn').click();
  const text = await page.getByTestId('export-text').inputValue();

  // The distinction is the whole point: nobody read these lines, and the
  // transcript must not claim otherwise.
  expect(text).toContain('bulk-accepted');
  expect(text).not.toContain('linguist-confirmed');
});
