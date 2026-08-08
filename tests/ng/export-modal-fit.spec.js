const { test, expect } = require('@playwright/test');
const { promoteThread } = require('./promote');

// Internal review, 8 Aug (Tyla): "the Gold Copy Export - Full Translation pop up
// has the middle section of the pop up running off the pop up itself."
//
// Two separate defects sat behind that one screenshot, and neither is visible
// to a test that only checks the dialog opens:
//
//   1. There is no global `box-sizing: border-box` in this app — it is applied
//      per-rule, and textarea.export-body had `width: 100%` with 10px padding
//      and a 1px border. Content-box arithmetic made the field 22px wider than
//      its own dialog, so it painted out over the right edge. Measured 21px.
//   2. `.export-modal` declared max-height twice; the later `80vh` won on
//      source order and capped `.maximized { height: 96vh }`. Maximize grew the
//      dialog sideways only — on a 720px viewport it stayed 578px tall in both
//      states.
//
// So the assertions are geometric. A screenshot diff would catch the first and
// a class-name check would catch neither.

async function openExport(page) {
  await page.goto('/');
  // The dialog only has content once a thread is in the tray.
  await promoteThread(page, 't-1002');
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-modal')).toBeVisible();
}

/** Assert the transcript field paints inside the dialog on every edge. */
async function expectContained(page, label) {
  const modal = await page.getByTestId('export-modal').boundingBox();
  const text = await page.getByTestId('export-text').boundingBox();

  expect(text.x, `${label}: left edge`).toBeGreaterThanOrEqual(modal.x);
  expect(text.y, `${label}: top edge`).toBeGreaterThanOrEqual(modal.y);
  expect(text.x + text.width, `${label}: right edge`).toBeLessThanOrEqual(modal.x + modal.width);
  expect(text.y + text.height, `${label}: bottom edge`).toBeLessThanOrEqual(modal.y + modal.height);
}

test('the transcript field stays inside the export dialog, restored and maximized', async ({
  page,
}) => {
  await openExport(page);
  await expectContained(page, 'restored');

  await page.getByTestId('export-maximize').click();
  await expect(page.getByTestId('export-maximize')).toHaveAttribute('aria-pressed', 'true');
  await expectContained(page, 'maximized');
});

test('maximize grows the dialog in both directions, not just sideways', async ({ page }) => {
  await openExport(page);
  const before = await page.getByTestId('export-modal').boundingBox();

  await page.getByTestId('export-maximize').click();
  await expect(page.getByTestId('export-maximize')).toHaveAttribute('aria-pressed', 'true');

  // Poll: zoneless change detection lands the class after the click resolves.
  await expect
    .poll(async () => (await page.getByTestId('export-modal').boundingBox()).height)
    .toBeGreaterThan(before.height);

  const after = await page.getByTestId('export-modal').boundingBox();
  expect(after.width).toBeGreaterThan(before.width);

  // And it fills the viewport it was asked to fill, rather than stopping at an
  // inherited cap — 96vh, with a pixel of slack for sub-pixel layout.
  const viewport = page.viewportSize();
  expect(after.height).toBeGreaterThan(viewport.height * 0.94);
});
