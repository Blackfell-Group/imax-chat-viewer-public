const test = require('node:test');
const assert = require('node:assert');
const { ocr } = require('../../data/seed');

// The OCR viewer sets each source line beside its own English, and the pairing
// is positional. That is safe on the live path because the gateway returns one
// object per line carrying both — a count mismatch cannot be expressed. The
// fixtures have to hold the same guarantee, or the mock would show a bilingual
// document the enclave could not reproduce, which is exactly the
// enrichment-service contract drift risk in the register.
//
// These assertions are cheap and they fail loudly the moment someone adds a
// line to a document and forgets its translation.

/** Every block of a fixture, flattened across pages. */
function blocksOf(fixture) {
  return fixture.pages ? fixture.pages.flatMap((p) => p.blocks) : fixture.blocks;
}

test('every foreign-language OCR block carries its own English', () => {
  for (const [attachmentId, fixture] of Object.entries(ocr)) {
    if (!fixture.srcLang) continue; // English-language document: nothing to render
    blocksOf(fixture).forEach((block, i) => {
      assert.ok(
        typeof block.en === 'string' && block.en.trim().length > 0,
        `${attachmentId} block ${i} ("${block.text.slice(0, 40)}") has no English`,
      );
    });
  }
});

test('no OCR block pairs English with an empty source line', () => {
  for (const [attachmentId, fixture] of Object.entries(ocr)) {
    blocksOf(fixture).forEach((block, i) => {
      assert.ok(
        typeof block.text === 'string' && block.text.trim().length > 0,
        `${attachmentId} block ${i} has no source text`,
      );
    });
  }
});

test('paged fixtures keep flat blocks[] and pages[] in step', () => {
  for (const [attachmentId, fixture] of Object.entries(ocr)) {
    if (!fixture.pages) continue;
    const paged = fixture.pages.reduce((n, p) => n + p.blocks.length, 0);
    assert.strictEqual(
      fixture.blocks.length,
      paged,
      `${attachmentId}: blocks[] has ${fixture.blocks.length}, pages[] has ${paged}`,
    );
    // Same objects, not copies — otherwise attaching English to one view would
    // silently leave the other view untranslated.
    assert.strictEqual(fixture.blocks[0], fixture.pages[0].blocks[0], `${attachmentId}: blocks[] is a copy`);
  }
});
