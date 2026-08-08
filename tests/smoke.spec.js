const { test, expect } = require('@playwright/test');

// Smoke 1: triage flow — queue loads, thread opens, RTL renders correctly.
test('thread queue loads and Arabic message renders RTL', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();
  await expect(page.getByTestId('thread-t-1002')).toBeVisible();

  await page.getByTestId('thread-t-1001').click();
  const arabicMsg = page.getByTestId('msg-m-1');
  await expect(arabicMsg).toBeVisible();
  // RTL correctness: the Arabic message body must carry dir="rtl".
  await expect(arabicMsg.locator('p[dir="rtl"]')).toHaveCount(1);
});

// Smoke 2: enrichment → gold copy — translate in place, extract entities,
// clip an entity, verify it lands in the tray with provenance attached.
test('translate, extract entities, and clip to gold copy with provenance', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // In-place, non-destructive translation swap.
  await page.getByTestId('translate-m-1').click();
  await expect(page.getByTestId('translated-m-1')).toBeVisible();
  await expect(page.getByTestId('msg-m-1')).toContainText('Abu Karim');

  // Entity extraction on the English message with a phone number.
  await page.getByTestId('entities-m-3').click();
  const chip = page.getByTestId('entity-chip-m-3-1');
  await expect(chip).toContainText('phone');

  // Clip the entity; the gold-copy tray shows content + provenance trail.
  await chip.click();
  const clip = page.locator('[data-testid^="goldclip-"]');
  await expect(clip).toHaveCount(1);
  await expect(clip).toContainText('+218 91 555 0142');
  await expect(clip).toContainText('msg m-3');
  await expect(clip).toContainText('via mock-entities');

  // Export renders the standardized product template with sourcing.
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-preview')).toContainText('SOURCE: t-1001 / m-3');
});

// Smoke 3: full-text multi-language search — native-script query, cross-
// language (English → Arabic via translation) query, and jump-to-message.
test('message search accepts native-script and cross-language queries', async ({ page }) => {
  await page.goto('/');

  // Arabic query matches the original script directly.
  await page.getByTestId('thread-search').fill('مستودع');
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  const arabicHits = page.locator('[data-testid^="hit-"]');
  await expect(arabicHits.first()).toBeVisible();

  // Clicking a hit opens the thread and lands on the matched message.
  await page.getByTestId('hit-m-2').click();
  await expect(page.getByTestId('chat-viewer')).toBeVisible();
  await expect(page.getByTestId('msg-m-2')).toBeVisible();

  // English query finds Arabic content through the translation layer.
  await page.getByTestId('thread-search').fill('bill of lading');
  const crossHit = page.getByTestId('hit-m-6');
  await expect(crossHit).toBeVisible();
  await expect(crossHit).toContainText('matched in EN translation');

  // Cyrillic query matches Russian originals in native script.
  await page.getByTestId('thread-search').fill('склад');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  // Search scales past the curated threads: corpus stats show the full sweep.
  await page.getByTestId('thread-search').fill('warehouse');
  await expect(page.getByTestId('search-stats')).toContainText('threads');
});

// Smoke 4: triage facets and groups — passport facet narrows to identity docs,
// a geo-fence group returns messages tagged with member locations.
test('facet and group triage filters return scoped results', async ({ page }) => {
  await page.goto('/');

  // Passport facet: no query, just the tag — the "show me identity docs" move.
  await page.getByTestId('facet-has-passport').click();
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  const passportHits = page.locator('[data-testid^="hit-"]');
  await expect(passportHits.first()).toBeVisible();
  await page.getByTestId('clear-search').click();

  // Geo-fence group: resolves to its member cities across all languages.
  await page.getByTestId('group-geo-libya-coast').click();
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();

  // Selector watchlist: matches tagged handles/numbers.
  await page.getByTestId('clear-search').click();
  await page.getByTestId('group-wl-flagged-numbers').click();
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();
});

// Smoke 5: linguist triage — content-type facet, My-languages scope, and
// the incoming-queue disposition workflow.
test('content-type, language scope, and queue disposition', async ({ page }) => {
  await page.goto('/');

  // Has-document cue: the curated Harbor Freight thread carries an embedded
  // bill of lading, so its queue row shows the attachment cue.
  await expect(page.getByTestId('hasdoc-t-1001')).toBeVisible();

  // Content-type facet narrows the queue to a single ingest lane.
  await page.getByTestId('type-document').click();
  await expect(page.getByTestId('queue-stats')).toContainText('new');
  const docThreads = page.locator('[data-testid^="thread-t-"]');
  await expect(docThreads.first()).toBeVisible();
  await page.getByTestId('type-document').click(); // clear

  // My-languages scope: narrow to Arabic only, then confirm a Farsi thread is gone.
  await expect(page.getByTestId('thread-t-1002')).toBeVisible(); // Farsi thread visible by default
  for (const l of ['fa', 'zh', 'ru', 'en']) await page.getByTestId(`mylang-${l}`).click();
  await expect(page.getByTestId('thread-t-1002')).toHaveCount(0); // Farsi scoped out
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();  // Arabic remains
  for (const l of ['fa', 'zh', 'ru', 'en']) await page.getByTestId(`mylang-${l}`).click(); // restore

  // Queue disposition: mark a thread reviewed, then queue-only hides it.
  await page.getByTestId('dispo-reviewed-t-1001').click();
  await expect(page.getByTestId('queue-stats')).toContainText('1 worked');
  await expect(page.getByTestId('thread-t-1001')).toHaveCount(0); // worked item leaves the queue
  await page.getByTestId('queue-toggle').click(); // show all
  await expect(page.getByTestId('thread-t-1001')).toBeVisible(); // reappears in All view
});

// Smoke 6: human-in-the-loop — linguist corrects a machine translation and
// adds an analyst note that clips into gold copy with linguist provenance.
test('translation review and analyst note flow into gold copy', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // Translate, then correct the MT — badge flips to linguist-edited.
  await page.getByTestId('translate-m-1').click();
  await page.getByTestId('edit-tr-m-1').click();
  await page.getByTestId('edit-field-m-1').fill('The shipment reached the port this morning; the trader Abu Karim collects it himself.');
  await page.getByTestId('save-tr-m-1').click();
  await expect(page.getByTestId('translated-m-1')).toContainText('linguist-edited');

  // Clip the corrected message — gold copy carries the linguist version + service.
  await page.getByTestId('clip-m-1').click();
  const clip = page.locator('[data-testid^="goldclip-"]');
  await expect(clip.first()).toContainText('trader Abu Karim collects it himself');

  // Add an analyst note and clip it.
  await page.getByTestId('note-m-4').click();
  await page.getByTestId('note-field-m-4').fill('"coastal road" likely a code word — recurring across GreenWire.');
  await page.getByTestId('save-note-m-4').click();
  await expect(page.getByTestId('note-display-m-4')).toContainText('code word');
  await page.getByTestId('clip-note-m-4').click();
  await expect(page.locator('[data-testid^="goldclip-"]')).toHaveCount(2);

  // Export shows the note with analyst-note provenance.
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-preview')).toContainText('[NOTE]');
  await expect(page.getByTestId('export-preview')).toContainText('analyst-note');
});

// Smoke 7: officer document annotation — the linguist tags a document and
// notes an interpretation in the OCR viewer; the tag becomes a searchable
// facet in Search & Triage and the note clips into gold copy.
test('officer document annotation: tag + note flow into search and gold copy', async ({ page }) => {
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

  // Clip the note — the viewer closes and the note lands in gold copy.
  await page.getByTestId('clip-doc-note').click();
  await expect(page.locator('[data-testid^="goldclip-"]')).toHaveCount(1);

  // The officer tag now appears in Search & Triage and filters the queue to
  // threads carrying a document with that tag.
  await expect(page.getByTestId('officertag-priority')).toBeVisible();
  await page.getByTestId('officertag-priority').click();
  await expect(page.getByTestId('thread-t-1001')).toBeVisible();
});
