const { test, expect } = require('@playwright/test');

// Enrichment on the linguist's bench. AMENDED 1 Aug (hcd/one_output_model.md,
// logged deviation): evidence clips are removed — the one output is the
// promoted thread gold — and enrichment is thread-level: translations render
// automatically; entity extraction runs once for the whole thread from the
// workflow strip. Review/note flows remain verbatim from the smoke suite.

test('auto-translation renders and thread-level entity extraction chips every message', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // Translations render by default: badge and English are already up.
  await expect(page.getByTestId('translated-m-1')).toBeVisible();
  await expect(page.getByTestId('msg-m-1')).toContainText('Abu Karim');

  // Batch actions appear only when there is work: threads arrive translated,
  // so the translate button is absent until something is actually missing.
  await expect(page.getByTestId('thread-translate-all')).toHaveCount(0);

  // One extraction for the entire thread; chips land on every message, and
  // the extract button retires once every message is enriched.
  await page.getByTestId('thread-extract-entities').click();
  const chip = page.getByTestId('entity-chip-m-3-1');
  await expect(chip).toContainText('phone');
  await expect(page.getByTestId('entity-row-m-1')).toContainText('person: Abu Karim');
  await expect(page.getByTestId('entity-row-m-4')).toContainText('geo:');
  await expect(page.getByTestId('thread-extract-entities')).toHaveCount(0);
});

test('translation review and analyst note (smoke-6 review flow, clips removed)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // Correct the auto-rendered MT — badge flips to linguist-edited.
  await page.getByTestId('edit-tr-m-1').click();
  await page
    .getByTestId('edit-field-m-1')
    .fill('The shipment reached the port this morning; the trader Abu Karim collects it himself.');
  await page.getByTestId('save-tr-m-1').click();
  await expect(page.getByTestId('translated-m-1')).toContainText('linguist-edited');

  // Add an analyst note; it displays under the message and later joins the
  // gold transcript as a NOTE line.
  await page.getByTestId('note-m-4').click();
  await page.getByTestId('note-field-m-4').fill('"coastal road" likely a code word — recurring across GreenWire.');
  await page.getByTestId('save-note-m-4').click();
  await expect(page.getByTestId('note-display-m-4')).toContainText('code word');
});

test('the one output: export is locked until a thread is promoted, then carries verdicts and notes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // No gold yet → export disabled (there is nothing else to export).
  await expect(page.getByTestId('export-btn')).toBeDisabled();

  // Review the thread: correct one message, add a note, confirm the rest.
  await page.getByTestId('edit-tr-m-1').click();
  await page
    .getByTestId('edit-field-m-1')
    .fill('The shipment reached the port this morning; the trader Abu Karim collects it himself.');
  await page.getByTestId('save-tr-m-1').click();
  await page.getByTestId('note-m-4').click();
  await page.getByTestId('note-field-m-4').fill('"coastal road" likely a code word.');
  await page.getByTestId('save-note-m-4').click();
  for (const id of ['m-2', 'm-4', 'm-6', 'm-8']) {
    await page.getByTestId(`confirm-${id}`).click();
  }
  await expect(page.getByTestId('thread-gold-ready')).toContainText('GOLD-READY');
  await page.getByTestId('promote-thread-gold').click();

  // Export carries the linguist's text, the verdicts, and the note.
  await page.getByTestId('export-btn').click();
  const preview = await page.getByTestId('export-text').inputValue();
  expect(preview).toContain('THREAD GOLD: Harbor Freight Coordination');
  expect(preview).toContain('trader Abu Karim collects it himself');
  expect(preview).toContain('linguist-edited');
  expect(preview).toContain('NOTE [analyst]: "coastal road" likely a code word.');
});
