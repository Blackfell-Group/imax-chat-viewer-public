// Rasterize the SVG "scans" in static/attachments to PNG.
//
// Vision models take raster images, not SVG, so the OCR service needs a PNG
// twin of each page before it can call the model gateway. Run once after
// adding or changing a document fixture:
//
//   node scripts/rasterize-attachments.js
//
// Uses the Chromium that Playwright already installs — no new dependency.
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DIR = path.join(__dirname, '..', 'static', 'attachments');

(async () => {
  const svgs = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg'));
  if (svgs.length === 0) {
    console.log('no SVG attachments found');
    return;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 }); // legible small print
  for (const svg of svgs) {
    const src = path.join(DIR, svg);
    const out = src.replace(/\.svg$/, '.png');
    const markup = fs.readFileSync(src, 'utf8');
    const width = Number(markup.match(/width="(\d+)"/)?.[1] || 380);
    const height = Number(markup.match(/height="(\d+)"/)?.[1] || 380);
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<body style="margin:0">${markup}</body>`,
      { waitUntil: 'load' }
    );
    await page.screenshot({ path: out });
    console.log(`${svg} → ${path.basename(out)} (${width}×${height} @2x)`);
  }
  await browser.close();
})();
