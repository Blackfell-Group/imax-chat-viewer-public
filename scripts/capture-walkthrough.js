// Capture the delivered walkthrough (TDD D6).
//
// Drives the application through the shot list in
// project/acceptance/narration_script.md and records it silently, emitting a
// cue sheet of REAL elapsed timings so narration is cut to what the recording
// actually does rather than to what the script guessed.
//
//   npm run dev:ng          # in another terminal
//   node scripts/capture-walkthrough.js
//
// Output:
//   project/acceptance/walkthrough-<date>.webm   silent capture
//   project/acceptance/walkthrough-<date>.cues.md cue sheet, real timings
//
// Narration is recorded against the cue sheet and muxed over the capture:
//   ffmpeg -i walkthrough.webm -i narration.mp3 -c:v copy -shortest out.mp4
//
// Written 7 August 2026. DELIVERY.md and the acceptance deck had both claimed
// a capture pipeline was in the repository; it was not.
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'project', 'acceptance');
const BASE = process.env.BASE_URL || 'http://localhost:4200';
const DATE = process.env.CAPTURE_DATE || new Date().toISOString().slice(0, 10);

const VIEWPORT = { width: 1600, height: 1000 };

// How long the recording dwells on each step. The script targets 2:30–3:00;
// at PACE=1 the capture runs about a minute, which is faster than anyone can
// read a screen they have never seen. Raise it to slow the whole recording
// down uniformly rather than re-tuning every beat by hand.
const PACE = Number(process.env.CAPTURE_PACE || 2.6);

/** Cue sheet rows: what the narrator is talking over, and when. */
const cues = [];
let t0 = 0;

// Per-scene narration lengths, written by scripts/build-walkthrough.sh after
// synthesis. When present, each scene is held on screen for as long as its
// narration runs — so the picture and the voice end together and the build has
// almost nothing to pad. Without them the capture still works; scenes just run
// at their natural length and the build pads the difference, which shows up as
// a frozen frame on any scene whose narration is longer than its action.
const DURATIONS = (() => {
  const f = path.join(OUT, 'narration-durations.json');
  if (!fs.existsSync(f)) {
    console.log('  no narration-durations.json — scenes run at their natural length');
    return null;
  }
  console.log('  pacing scenes to measured narration lengths');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
})();

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // text has to survive a projector
    recordVideo: { dir: OUT, size: VIEWPORT },
    // Without this, headless Chromium refuses navigator.clipboard.writeText and
    // the export scene recorded the FALLBACK toast — "Copy was blocked by the
    // browser" — under narration that says the copy confirms. The fallback is
    // real and worth having (it is why the field is a textarea), but it is the
    // edge case, not what an officer sees on a workstation. Record the path
    // the narration is describing.
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  // A human reads before they click. Without this every action lands before
  // the viewer has seen the previous one, and the recording is unwatchable.
  const beat = (ms = 900) => page.waitForTimeout(Math.round(ms * PACE));

  let sceneId = null;
  let sceneStart = 0;

  // Hold the scene that is ending until its narration would have finished.
  // Anything already spent on its actions counts, so an action-heavy scene
  // waits little and a talky one waits longer.
  const holdScene = async () => {
    if (!sceneId || !DURATIONS?.[sceneId]) return;
    const remaining = DURATIONS[sceneId] * 1000 - (Date.now() - sceneStart);
    if (remaining > 0) await page.waitForTimeout(Math.round(remaining));
  };

  const cue = async (id, segment, line) => {
    await holdScene();
    const at = Date.now() - t0;
    sceneId = id;
    sceneStart = Date.now();
    cues.push({ id, at, segment, line });
    const mm = String(Math.floor(at / 60000)).padStart(2, '0');
    const ss = String(Math.floor((at % 60000) / 1000)).padStart(2, '0');
    console.log(`  ${mm}:${ss}  ${segment} — ${line}`);
  };

  await page.goto(BASE);
  await page.getByTestId('unclass-banner').waitFor();
  t0 = Date.now();

  // --- 1. Opening --------------------------------------------------------
  await cue('01_opening', '1', 'Opening — workspace and the UNCLASS banner');
  await beat(4000);

  // --- 2b. No verdict without the source ---------------------------------
  // 2a (before/after split) is assembled in the edit from two captures; this
  // pass records the delivered build only.
  await cue('02_bilingual', '2b', 'Arabic thread opens bilingual, source stays on screen');
  await page.getByTestId('thread-t-1001').click();
  await page.getByTestId('chat-viewer').waitFor();
  await beat(2500);

  await cue('03_correction', '2b', 'Correction written against the source; verdict badge changes');
  const firstConfirm = page.locator('[data-testid^="confirm-"]').first();
  await firstConfirm.click();
  await beat(1600);

  // --- 2c. A linguist's bench --------------------------------------------
  await cue('04_bench', '2c', 'Find tools collapse to leave the stack');
  await page.getByTestId('find-toggle').click();
  await beat(1800);
  await page.getByTestId('find-toggle').click();
  await beat(900);

  await cue('05_disposition', '2c', 'Disposition from the viewer strip, where the thread was read');
  await page.getByTestId('dispo-flagged-t-1001').click();
  await beat(1600);

  // --- 3a. Triage and search ---------------------------------------------
  await cue('06_facet', '3a', 'Facet narrows the queue by what a thread contains');
  await page.getByTestId('facet-has-passport').click();
  await beat(2200);
  await page.getByTestId('clear-search').click();
  await beat(700);

  await cue('07_search', '3a', 'Native-script query across four languages');
  const search = page.getByTestId('thread-search');
  await search.fill('مصراتة');
  await search.press('Enter');
  await beat(2400);

  await cue('08_evidence', '3a', 'Hit lands on the evidence and flashes');
  const hit = page.locator('[data-testid^="hit-"]').first();
  if (await hit.count()) {
    await hit.click();
    await beat(2600);
  }
  await page.getByTestId('clear-search').click();
  await beat(700);

  // --- 3b. Reading and enrichment ----------------------------------------
  await cue('09_stream', '3b', 'Windowed stream; sort order is reversible');
  await page.getByTestId('thread-t-1002').click();
  await page.getByTestId('chat-viewer').waitFor();
  await beat(1500);
  await page.getByTestId('stream-sort').click();
  await beat(1800);
  await page.getByTestId('stream-sort').click();
  await beat(1000);

  await cue('10_enrichment', '3b', 'Thread-level enrichment and the on-demand summary');
  const extract = page.getByTestId('thread-extract-entities');
  if (await extract.count()) {
    await extract.click();
    await beat(2200);
  }
  await page.getByTestId('summarize-btn').click();
  await beat(3000);
  await page.getByTestId('summarize-btn').click();
  await beat(700);

  // --- 3c. Documents ------------------------------------------------------
  await cue('11_document', '3c', 'Five-page Arabic customs declaration');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await page.getByTestId('ocr-dialog').waitFor();
  await beat(2000);

  await cue('12_maximize', '3c', 'Maximize — a scan you cannot read is a scan you cannot exploit');
  await page.getByTestId('ocr-maximize').click();
  await beat(2400);

  await cue('13_paging', '3c', 'Page through the manifest; zoom the table');
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('ocr-page-next').click();
    await beat(1700);
  }
  await page.getByTestId('ocr-zoom-2').click();
  await beat(2400);
  await page.getByTestId('ocr-zoom-fit').click();
  await beat(900);

  await cue('14_tagging', '3c', "Officer's triage mark becomes a searchable facet");
  await page.getByTestId('doctag-input').fill('vessel-name');
  await page.getByTestId('doctag-add').click();
  await beat(1800);
  // Close straight out of maximized. Restoring first put a hard cut from full
  // screen down to the small dialog, held it 1.6s, then cut again to close it —
  // on screen that reads as the document zooming in and out for no reason
  // (Tyla, 8 Aug, both cuts). Nothing is being demonstrated by the restore.
  await page.getByTestId('ocr-dialog').getByTitle('Close').click();
  await beat(900);
  // Then actually show the queue narrowing by that mark. The narration for this
  // scene promises the tag "becomes a searchable facet back in the queue", and
  // until now the capture closed the dialog and sat there — the build padded
  // the gap by freezing the last frame for ~4s. Showing the facet fills the
  // scene with the thing the line is about.
  await page.getByTestId('officertag-vessel-name').click();
  await beat(2000);
  await page.getByTestId('officertag-vessel-name').click();
  await beat(700);

  // --- 3d. The output -----------------------------------------------------
  await cue('15_promote', '3d', 'Review the thread through and promote it to gold');
  await page.getByTestId('thread-t-1002').click();
  await page.getByTestId('chat-viewer').waitFor();
  const confirms = page.locator('[data-testid^="confirm-"]');
  for (let i = 0; i < (await confirms.count()); i++) {
    await confirms.nth(i).click();
    await page.waitForTimeout(Math.round(220 * PACE));
  }
  await beat(1200);
  await page.getByTestId('promote-thread-gold').click();
  await beat(2000);

  await cue('16_export', '3d', 'Export the full verdicted transcript; copy confirms');
  await page.getByTestId('export-btn').click();
  await beat(2600);
  await page.getByTestId('export-maximize').click();
  await beat(2600);
  await page.getByTestId('export-copy').click();
  await beat(2400);

  await cue('17_close', '4', 'Close');
  await beat(2500);

  await holdScene();
  const total = Date.now() - t0;
  await context.close();
  await browser.close();

  // Playwright names the video by page id; rename it to something a human can
  // find next to its cue sheet.
  const videos = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith('.webm') && !f.startsWith('walkthrough-'));
  const target = path.join(OUT, `walkthrough-${DATE}.webm`);
  if (videos.length) {
    fs.renameSync(path.join(OUT, videos.sort().pop()), target);
  }

  const fmt = (ms) =>
    `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  const sheet = [
    `# Walkthrough cue sheet — ${DATE}`,
    '',
    '**TDD data deliverable D6** · River Hawk Consulting, LLC · UNCLASSIFIED',
    '',
    `Capture: \`walkthrough-${DATE}.webm\` · total **${fmt(total)}** · ${VIEWPORT.width}×${VIEWPORT.height} @2x, silent, pace ${PACE}.`,
    '',
    'Real elapsed timings from the capture, not the nominal ones in',
    '`narration_script.md`. Narration is cut to these.',
    '',
    '| At | Id | Segment | On screen |',
    '|---|---|---|---|',
    ...cues.map((c) => `| ${fmt(c.at)} | \`${c.id}\` | ${c.segment} | ${c.line} |`),
    '',
    '## Mux the narration',
    '',
    '```sh',
    `ffmpeg -i walkthrough-${DATE}.webm -i narration-${DATE}.mp3 \\`,
    '  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \\',
    `  RiverHawk_IMAX_Walkthrough_${DATE}.mp4`,
    '```',
    '',
    'A capability-only cut drops segment 2 (the design findings) for audiences',
    'that do not need the derivation.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(OUT, `walkthrough-${DATE}.cues.md`), sheet);
  // Machine-readable twin: scripts/build-walkthrough.sh splits the capture on
  // these boundaries so each scene can be held to its narration's length.
  fs.writeFileSync(
    path.join(OUT, `walkthrough-${DATE}.cues.json`),
    JSON.stringify({ date: DATE, video: path.basename(target), totalMs: total, pace: PACE, cues }, null, 2),
  );
  console.log(`\n  ${path.relative(ROOT, target)}`);
  console.log(`  ${path.relative(ROOT, path.join(OUT, `walkthrough-${DATE}.cues.md`))}`);
  console.log(`  total ${fmt(total)}, ${cues.length} cues`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
