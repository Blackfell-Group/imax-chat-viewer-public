#!/usr/bin/env node
/**
 * Regenerate the self-hosted webfonts in angular/public/fonts + angular/src/_fonts.scss.
 *
 * Run this LOW-SIDE, on a machine with internet. The output is committed, so the
 * air-gapped build never fetches anything. You only need to re-run it to change
 * weights or subsets.
 *
 *   node scripts/vendor-fonts.js
 *
 * Why this exists: the enclave has no egress. A <link> to fonts.googleapis.com
 * fails there with no error anyone notices — the Material Icons font simply
 * never loads and all 32 icons in the app render as their ligature names
 * ("delete_outline", "chevron_right"). Vendoring is the only reliable fix.
 */
const fs = require('node:fs');
const path = require('node:path');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const WEIGHTS = [300, 400, 500, 700];
// cyrillic is not optional: the demonstration corpus is largely Russian.
const SUBSETS = new Set(['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']);

const ROOT = path.join(__dirname, '..', 'angular');
const OUT_DIR = path.join(ROOT, 'public', 'fonts');
const OUT_SCSS = path.join(ROOT, 'src', '_fonts.scss');

async function get(url, binary = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const robotoCss = await get(
    `https://fonts.googleapis.com/css2?family=Roboto:wght@${WEIGHTS.join(';')}&display=swap`,
  );

  const blocks = [];
  const parts = robotoCss.split(/\/\*\s*([a-z-]+)\s*\*\//);
  for (let i = 1; i < parts.length; i += 2) {
    const subset = parts[i];
    const block = parts[i + 1];
    if (!SUBSETS.has(subset)) continue;
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1];
    const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!weight || !url) continue;

    const file = `roboto-${weight}-${subset}.woff2`;
    fs.writeFileSync(path.join(OUT_DIR, file), await get(url, true));
    blocks.push(`/* ${subset} */${block.replace(url, `/fonts/${file}`).trimEnd()}\n`);
  }

  const iconCss = await get('https://fonts.googleapis.com/icon?family=Material+Icons');
  const iconUrl = iconCss.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!iconUrl) throw new Error('could not find the Material Icons woff2 URL');
  fs.writeFileSync(path.join(OUT_DIR, 'material-icons.woff2'), await get(iconUrl, true));

  const header = `// Self-hosted webfonts — do NOT replace with a CDN <link>.
//
// The prototype is destined for an air-gapped enclave with no egress. Loading
// Roboto or Material Icons from fonts.googleapis.com there fails silently: the
// icon font never arrives and every <mat-icon> renders its ligature name as
// literal text ("delete_outline", "chevron_right"), which is the first thing
// anyone sees. These files ship in the bundle instead.
//
// Roboto subsets: ${[...SUBSETS].join(', ')} — cyrillic matters,
// the demonstration corpus is largely Russian. Arabic has no Roboto coverage
// and falls back to the workstation's system font, as it already did.
// Regenerate with scripts/vendor-fonts.js.
`;

  const icons = `
/* Material Icons */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  /* block, not swap: a flash of raw ligature text is worse than a blank icon. */
  font-display: block;
  src: url(/fonts/material-icons.woff2) format('woff2');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
`;

  fs.writeFileSync(OUT_SCSS, `${header}\n${blocks.join('\n')}${icons}`);
  console.log(`wrote ${blocks.length} Roboto faces + Material Icons to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
