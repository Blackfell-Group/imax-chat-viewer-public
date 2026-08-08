#!/usr/bin/env node
/**
 * Live end-to-end check against a real OpenAI-compatible gateway.
 *
 *   MODEL_ENDPOINT=https://api.openai.com/v1 \
 *   MODEL_API_KEY=$OPENAI_API_KEY \
 *   MODEL_NAME=<text model> MODEL_NAME_OCR=<vision model> \
 *     node scripts/verify-gateway.js
 *
 * Everything else in this repository is proven against a stub that speaks the
 * wire format (tests/node/model-gateway.test.js). This is the one thing a stub
 * cannot answer: whether a REAL model, asked the way we ask it, returns what the
 * viewer needs — per-line pairing that survives an Arabic form, and a
 * translation with no wrapper around it.
 *
 * It never prints the key. It reports which variable supplied it, and nothing
 * about its value.
 */
const path = require('path');
const fs = require('fs');

const provider = require('../providers/model-gateway');
const { ocr: fixtures } = require('../data/seed');

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  console.log(`  ✗ ${m}`);
  process.exitCode = 1;
};

async function main() {
  if (!provider.enabled()) {
    console.error('MODEL_ENDPOINT and MODEL_API_KEY must both be set.');
    process.exit(2);
  }
  console.log(`\n==> ${provider.describe()}\n`);

  // 1. Catalogue + the startup preflight the pods run.
  console.log('==> startup preflight');
  for (const line of await provider.preflight()) console.log(`  ${line}`);

  // 2. Translation — must come back as plain text, not JSON, not prefaced.
  console.log('\n==> translation (real Arabic from the corpus)');
  const arabic = 'وصلت الشحنة إلى الميناء صباح اليوم. التاجر أبو كريم سيستلمها بنفسه.';
  const t0 = Date.now();
  const en = await provider.translate({ text: arabic, srcLang: 'ar' });
  console.log(`  ${Date.now() - t0} ms · ${provider.serviceLabel()}`);
  console.log(`  → ${en}`);
  if (/^\s*[{[]/.test(en)) fail('came back wrapped in JSON — it would land in the gold copy');
  else pass('plain text, no envelope');
  if (/^(here is|sure|certainly|the translation)/i.test(en.trim()))
    fail('carries a preamble — it would land in the gold copy');
  else pass('no preamble');
  if (/Abu Karim|Abu-Karim/i.test(en)) pass('preserved the name');
  else fail(`name not preserved verbatim — got: ${en.slice(0, 80)}`);

  // 3. OCR — the real thing. A five-page Arabic customs declaration, the
  //    densest document in the corpus, sent as a raster exactly as the route
  //    sends it.
  console.log('\n==> OCR (page 1 of the Arabic customs declaration)');
  const page = fixtures['a-7003'].pages[0];
  const file = path.join(__dirname, '..', page.uri.replace(/^\//, '').replace(/\.svg$/, '.png'));
  if (!fs.existsSync(file)) {
    fail(`no raster at ${file} — run scripts/rasterize-attachments.js`);
    return;
  }
  const dataUri = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  const t1 = Date.now();
  const out = await provider.ocr({ dataUri, srcLang: 'ar' });
  console.log(`  ${Date.now() - t1} ms · ${provider.serviceLabel('vision')} · ${out.lines.length} lines`);

  const paired = out.lines.filter((l) => l.en && l.en.trim());
  console.log(`  paired: ${paired.length}/${out.lines.length}`);
  out.lines.slice(0, 6).forEach((l, i) => console.log(`   ${i + 1}. ${l.src}\n      → ${l.en}`));

  if (out.lines.length >= 8) pass(`transcribed ${out.lines.length} lines`);
  else fail(`only ${out.lines.length} lines — the page has 15`);

  if (paired.length === out.lines.length) pass('every line carries its own English');
  else fail(`${out.lines.length - paired.length} line(s) came back without English`);

  if (out.lines.every((l) => l.src && l.src.trim())) pass('no empty source lines');
  else fail('a line came back with no source text');

  const arabicLines = out.lines.filter((l) => /[؀-ۿ]/.test(l.src)).length;
  if (arabicLines >= out.lines.length * 0.7) pass(`${arabicLines} lines in Arabic script`);
  else fail(`only ${arabicLines} lines look like Arabic — is it transliterating?`);

  if (out.englishGloss && out.englishGloss.length > 40) pass('whole-document gloss present');
  else fail('no usable englishGloss');

  // Does it actually read the document, or hallucinate a plausible form?
  const all = out.lines.map((l) => l.en).join(' ');
  const found = ['JM-2026-0703-0418', 'Misrata', 'NS-114', 'Sirte'].filter((k) =>
    new RegExp(k.replace(/[-]/g, '[-\\s]?'), 'i').test(all + ' ' + out.englishGloss)
  );
  if (found.length >= 2) pass(`read real values off the page: ${found.join(', ')}`);
  else fail(`did not surface the document's identifiers — got: ${all.slice(0, 120)}`);
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
