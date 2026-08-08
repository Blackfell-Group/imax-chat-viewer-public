const { test, expect } = require('@playwright/test');

// Owner direction, 7 Aug: the document's translation should carry "the same
// options as thread entry — should we send it to the frontier LLM, is good…".
//
// Certifying a document translation is the same kind of assertion as
// certifying a message translation, so it gets the same three moves: confirm
// it, correct it, or send it back through the model gateway for a better one.

async function openCustomsFile(page) {
  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();
  await expect(page.getByTestId('ocr-gloss')).toBeVisible();
}

test('the document translation can be confirmed, and the verdict taken back', async ({ page }) => {
  await openCustomsFile(page);

  const confirm = page.getByTestId('ocr-gloss-confirm');
  await expect(confirm).toHaveAttribute('aria-pressed', 'false');
  await confirm.click();
  await expect(confirm).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/ENGLISH · linguist-confirmed/)).toBeVisible();

  // Same retraction the message verdict has — a mis-click is not a decision.
  await confirm.click();
  await expect(confirm).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(/ENGLISH · linguist-confirmed/)).toHaveCount(0);
});

test('the document translation can be corrected against the original', async ({ page }) => {
  await openCustomsFile(page);
  const machine = (await page.getByTestId('ocr-gloss').textContent()).trim();

  await page.getByTestId('ocr-gloss-edit').click();
  const field = page.getByTestId('ocr-gloss-field');
  await expect(field).toBeVisible();

  // The original text stays on screen while the correction is written.
  await expect(page.getByTestId('ocr-blocks')).toBeVisible();

  await field.fill('Import customs declaration — linguist rendering for the record.');
  await page.getByTestId('ocr-gloss-save').click();

  await expect(page.getByText(/ENGLISH · linguist-edited/)).toBeVisible();
  const after = (await page.getByTestId('ocr-gloss').textContent()).trim();
  expect(after).toContain('linguist rendering for the record');
  expect(after).not.toEqual(machine);
});

test('the document can be sent back for a fresh translation', async ({ page }) => {
  await openCustomsFile(page);

  // Confirm first, so the retranslation has a verdict to invalidate.
  await page.getByTestId('ocr-gloss-confirm').click();
  await expect(page.getByTestId('ocr-gloss-confirm')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('ocr-gloss-retranslate').click();

  // A fresh machine translation must NOT keep the old confirmation: the
  // officer certified the previous text, and carrying that verdict onto new
  // text would attribute words to them they never read.
  await expect
    .poll(() => page.getByTestId('ocr-gloss-confirm').getAttribute('aria-pressed'), {
      timeout: 5000,
    })
    .toBe('false');
  await expect(page.getByTestId('ocr-gloss')).toBeVisible();
});

test('the scan and the two text layers stack in reading order', async ({ page }) => {
  await openCustomsFile(page);

  // Image above original above English — the order an officer reads them in.
  const img = await page.locator('.ocr-image img').boundingBox();
  const orig = await page.getByTestId('ocr-blocks').boundingBox();
  const en = await page.getByTestId('ocr-gloss').boundingBox();

  expect(img.y).toBeLessThan(orig.y);
  expect(orig.y).toBeLessThan(en.y);

  // The scan gets the full width of the viewer, not half of it.
  const dialog = await page.getByTestId('ocr-dialog').boundingBox();
  const pane = await page.locator('.ocr-image').boundingBox();
  expect(pane.width).toBeGreaterThan(dialog.width * 0.85);
});
