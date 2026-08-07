const { test, expect } = require('@playwright/test');

// The 5-page Arabic customs declaration (a-7003). Added 7 Aug because the
// corpus had no dense document: the largest was the 3-page Russian contract at
// 19 short blocks, so nothing exercised paging through a real form, reading a
// table in RTL, or the zoom/maximize controls the review asked for.
//
// It is also the strongest single artifact for the mission story — OCR of a
// right-to-left tabular form, translated, with entities that feed the facets.

test('the customs file opens, pages through all five, and reads RTL', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();

  await expect(page.getByTestId('ocr-page-indicator')).toContainText('Page 1 / 5');

  // Page 1 is the declaration face: the numbers an analyst would pivot on.
  const blocks = page.getByTestId('ocr-blocks');
  await expect(blocks).toContainText('JM-2026-0703-0418');
  await expect(blocks).toContainText('GW-2026-0630-114');

  // Page 2 and 3 are the itemised manifest — the tabular content that did not
  // exist anywhere in the corpus before.
  await page.getByTestId('ocr-page-next').click();
  await expect(page.getByTestId('ocr-page-indicator')).toContainText('Page 2 / 5');
  await expect(blocks).toContainText('٩٤٠');

  await page.getByTestId('ocr-page-next').click();
  await expect(blocks).toContainText('٦٣٠٠');

  // Page 4 duties, page 5 the inspection report and release stamp.
  await page.getByTestId('ocr-page-next').click();
  await expect(blocks).toContainText('RC-2026-0703-2291');
  await page.getByTestId('ocr-page-next').click();
  await expect(page.getByTestId('ocr-page-indicator')).toContainText('Page 5 / 5');
  await expect(blocks).toContainText('MC-4471');
  await expect(page.getByTestId('ocr-page-next')).toBeDisabled();

  // Blocks carry Arabic and must render right-to-left.
  await expect(blocks.locator('p[dir="auto"]').first()).toBeVisible();
});

test('the customs file carries an English gloss covering the whole document', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();

  const gloss = page.getByTestId('ocr-gloss');
  await expect(gloss).toBeVisible();
  // Not a one-line caption: the gloss has to carry the whole form, because a
  // linguist's verdict is written against it.
  await expect(gloss).toContainText('Port of Misrata');
  await expect(gloss).toContainText('554,530');
  await expect(gloss).toContainText('A. Al-Zarrouq');
  expect((await gloss.textContent()).length).toBeGreaterThan(1000);
});

test('the customs file is reachable by its declaration number and its entities', async ({ page }) => {
  await page.goto('/');
  // The declaration number is a selector an analyst would pivot on.
  const search = page.getByTestId('thread-search');
  await search.fill('JM-2026-0703-0418');
  await search.press('Enter');
  await expect(page.getByTestId('search-stats')).toContainText('hits');
  await expect(page.locator('[data-testid^="hit-"]').first()).toBeVisible();
});
