// Mock of the production OCR service.
// Contract: POST /api/ocr { attachmentId } → { attachmentId, fullText,
// blocks: [{ text, en, bbox }], engine, schemaVersion } (+ optional pages[],
// srcLang, englishGloss for multi-page documents)
//
// `en` is that line's own English, carried per block rather than as a parallel
// array, so a source line and its rendering cannot drift apart. It may be empty
// (an English-language document, or a gateway on the older prompt); the viewer
// falls back to the whole-document englishGloss in that case.
//
// With MODEL_ENDPOINT set (from the deployment Secret) pages are
// transcribed by the gateway's vision model instead of the fixture. Vision needs a raster image; the demo corpus
// ships SVG "scans", so run `node scripts/rasterize-attachments.js` first.
// Missing raster, missing key, or blocked egress → fixture.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { ocr } = require('../data/seed');
const provider = require('../providers/model-gateway');

const router = express.Router();

// A page's raster twin. Page URIs are PNG now — the viewer serves the raster
// rather than the SVG so an enclave workstation never has to resolve the
// Arabic/Farsi/CJK fonts the SVG sources name (see scripts/rasterize-
// attachments.js). The .svg→.png rewrite stays for any fixture still pointing
// at a vector source.
function rasterFor(uri) {
  if (!uri) return null;
  const file = path.join(__dirname, '..', uri.replace(/^\//, '')).replace(/\.svg$/, '.png');
  return fs.existsSync(file) ? file : null;
}

function dataUri(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

router.post('/', async (req, res) => {
  const { attachmentId } = req.body || {};
  const fixture = ocr[attachmentId];
  if (!fixture) return res.status(404).json({ error: `no OCR fixture for ${attachmentId}` });

  if (provider.enabled()) {
    try {
      const pages = fixture.pages || [{ page: 1, uri: `/static/attachments/${attachmentId}.png` }];
      const rasters = pages.map((p) => ({ page: p.page, uri: p.uri, file: rasterFor(p.uri) }));
      if (rasters.some((r) => !r.file)) throw new Error('no rasterized page images');

      const results = [];
      for (const r of rasters) {
        const out = await provider.ocr({ dataUri: dataUri(r.file), srcLang: fixture.srcLang });
        results.push({ ...r, ...out });
      }
      const outPages = results.map((r) => ({
        page: r.page,
        uri: r.uri,
        // {src, en} from the gateway becomes {text, en} on the wire — the same
        // shape the fixtures carry, so the viewer cannot tell mock from live.
        blocks: r.lines.map((l, i) => ({ text: l.src, en: l.en, bbox: [40, 40 + i * 30, 340, 62 + i * 30] }))
      }));
      return res.json({
        schemaVersion: '1.0',
        service: provider.serviceLabel(),
        engine: provider.serviceLabel(),
        attachmentId,
        srcLang: fixture.srcLang,
        englishGloss: results.map((r) => r.englishGloss).filter(Boolean).join(' '),
        ...(fixture.pages ? { pages: outPages } : {}),
        blocks: outPages.flatMap((p) => p.blocks),
        fullText: outPages.flatMap((p) => p.blocks.map((b) => b.text)).join('\n')
      });
    } catch (err) {
      console.warn(`[ocr] provider failed for ${attachmentId}, using fixture: ${err.message}`);
    }
  }

  res.json(fixture);
});

module.exports = router;
