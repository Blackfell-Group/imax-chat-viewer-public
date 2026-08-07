const { test, expect } = require('@playwright/test');

// Internal review, 7 Aug: "OCR Viewer should be resizable and you should be
// able to open it all the way up. Its hard to see the documents so small."
// and "the new tag doesn't carry over, so I can't reference it on something
// else… the only way to get the tag to appear is to press Enter, this is not
// intuitive."

// t-1001 carries the bill of lading, t-1004 the multi-page storage contract —
// two different documents, which is what the carry-over case needs.
async function openScan(page, thread = 't-1001', attachment = 'a-7001') {
  await page.goto('/');
  await page.getByTestId(`thread-${thread}`).click();
  await page.getByTestId(`attachment-${attachment}`).click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();
  // Wait for the scan to actually decode. Measuring before it does yields the
  // pre-layout width, which is what made the zoom comparison intermittent.
  await page
    .locator('.ocr-image img')
    .evaluate((img) => img.complete || new Promise((r) => img.addEventListener('load', r)));
}

test('the scan viewer maximizes and the image grows with it', async ({ page }) => {
  await openScan(page);
  const dialog = page.getByTestId('ocr-dialog');
  const img = dialog.locator('.ocr-image img');

  const before = await img.boundingBox();
  await page.getByTestId('ocr-maximize').click();
  await expect(page.getByTestId('ocr-maximize')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(120);
  const after = await img.boundingBox();

  // The complaint was that the document stayed small however big the viewer
  // got, because the image carried a fixed 420px cap. Assert the property
  // rather than the old number: the scan scales with its pane instead of
  // stopping at a constant.
  expect(after.height).toBeGreaterThan(before.height);

  const pane = await dialog.locator('.ocr-image').boundingBox();
  expect(after.height).toBeGreaterThan(pane.height * 0.85);

  const box = await dialog.boundingBox();
  expect(box.width).toBeGreaterThan(page.viewportSize().width * 0.9);
});

test('zoom controls scale the scan past fit', async ({ page }) => {
  await openScan(page);
  const img = page.getByTestId('ocr-dialog').locator('.ocr-image img');
  const fit = await img.boundingBox();

  await page.getByTestId('ocr-zoom-2').click();
  await page.waitForTimeout(120);
  const zoomed = await img.boundingBox();
  expect(zoomed.width).toBeGreaterThan(fit.width);

  await page.getByTestId('ocr-zoom-fit').click();
  await expect
    .poll(async () => Math.round((await img.boundingBox()).width), { timeout: 3000 })
    .toBe(Math.round(fit.width));
});

test('a coined tag carries to the next document, and Add works without Enter', async ({ page }) => {
  await openScan(page);

  // Add via the button, not Enter — the review's second complaint.
  await page.getByTestId('doctag-input').fill('vessel-name');
  await page.getByTestId('doctag-add').click();
  await expect(page.getByTestId('doctag-vessel-name')).toBeVisible();
  await expect(page.getByTestId('doctag-vessel-name')).toHaveClass(/(^|\s)on(\s|$)/);

  // Close, open a different document: the tag must still be offered, so it can
  // actually be applied to something else.
  await page.getByTestId('ocr-dialog').getByTitle('Close').click();
  await expect(page.getByTestId('ocr-dialog')).toHaveCount(0);

  await page.getByTestId('thread-t-1004').click();
  await page.getByTestId('attachment-a-7002').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();

  const carried = page.getByTestId('doctag-vessel-name');
  await expect(carried).toBeVisible();
  // Offered but not yet applied here — that is the distinction that was missing.
  await expect(carried).not.toHaveClass(/(^|\s)on(\s|$)/);
  await carried.click();
  await expect(carried).toHaveClass(/(^|\s)on(\s|$)/);
});

test('typing a tag and clicking away still commits it', async ({ page }) => {
  await openScan(page);
  await page.getByTestId('doctag-input').fill('follow-up-cargo');
  await page.getByTestId('doctag-input').blur();
  await expect(page.getByTestId('doctag-follow-up-cargo')).toBeVisible();
});
