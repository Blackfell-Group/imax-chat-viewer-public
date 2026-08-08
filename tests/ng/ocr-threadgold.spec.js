const { test, expect } = require('@playwright/test');

// Day-9 OCR + officer annotation (smoke-7 tag/note/facet flow) and the
// 31 Jul amendment's thread-gold flow end-to-end. AMENDED 1 Aug
// (hcd/one_output_model.md): clip beats removed — the doc note stays as
// annotation, and the tag-facet loop-back is the retained smoke-7 core.

test('officer document annotation: tag + note, and the tag filters the queue', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // Open the embedded bill of lading in the OCR viewer.
  await page.getByTestId('attachment-a-7001').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();
  await expect(page.getByTestId('doc-annotation')).toBeVisible();

  // Apply a quick triage tag to the document itself.
  await page.getByTestId('doctag-priority').click();

  // Add an officer interpretation the machine can't produce.
  await page.getByTestId('doc-note-add').click();
  await page.getByTestId('doc-note-field').fill('Manifest matches the GreenWire shipment; vessel name corroborates m-1.');
  await page.getByTestId('doc-note-save').click();
  await expect(page.getByTestId('doc-note-display')).toContainText('GreenWire');

  // Close the viewer; the annotation persists on the document.
  await page.getByTitle('Close').click();
  await expect(page.getByTestId('ocr-dialog')).toHaveCount(0);

  // The officer tag now appears in Search & Triage and filters the queue to
  // threads carrying a document with that tag.
  await expect(page.getByTestId('officertag-priority')).toBeVisible();
  await page.getByTestId('officertag-priority').click();
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();
});

test('OCR viewer: extracted blocks render with engine caption', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();
  await page.getByTestId('attachment-a-7001').click();

  const blocks = page.getByTestId('ocr-blocks');
  await expect(blocks).toContainText('BILL OF LADING');
  await expect(blocks).toContainText('MV Sirte Star');
  await expect(page.getByText(/EXTRACTED TEXT — ORIGINAL\s+·\s+mock-ocr/)).toBeVisible();
  // One document line per row, numbered, so a line can be pointed at.
  expect(await blocks.locator('li.block-line').count()).toBeGreaterThan(1);
});

test('thread gold: translate thread, review all, promote — the stack ticks', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // AMENDED 1 Aug: translations render by default — the auto batch has the
  // meter at 5/5 and the English already in place on open.
  await expect(page.getByTestId('thread-gold-ready')).toContainText('translated 5/5');
  await expect(page.getByTestId('msg-m-1')).toContainText('Abu Karim');

  // Promote stays locked until every foreign message carries a verdict.
  await expect(page.getByTestId('promote-thread-gold')).toBeDisabled();
  for (const id of ['m-1', 'm-2', 'm-4', 'm-6', 'm-8']) {
    await page.getByTestId(`confirm-${id}`).click();
  }
  await expect(page.getByTestId('thread-gold-ready')).toContainText('GOLD-READY');

  // Promote: the whole thread lands in the gold pane…
  await page.getByTestId('promote-thread-gold').click();
  const gold = page.getByTestId('thread-gold-t-1001');
  await expect(gold).toBeVisible();
  await expect(gold).toContainText('Harbor Freight Coordination');
  await expect(gold).toContainText('5/5 translated · 5/5 reviewed');

  // …the export carries the full transcript with verdicts…
  await page.getByTestId('export-btn').click();
  const preview = await page.getByTestId('export-text').inputValue();
  expect(preview).toContain('THREAD GOLD: Harbor Freight Coordination');
  expect(preview).toContain('linguist-confirmed');
  await page.keyboard.press('Escape');
  await page.getByText('Close', { exact: true }).click();

  // …and the stack ticks: promotion marked the thread worked.
  await expect(page.getByTestId('queue-stats')).toContainText('1 worked');
  await expect(page.getByTestId('queue-progress')).toContainText('1/');
  await expect(page.getByTestId('thread-t-1001')).toHaveCount(0); // left the queue
});
