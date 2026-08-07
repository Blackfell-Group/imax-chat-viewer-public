const { test, expect } = require('@playwright/test');

// The curated multi-page Russian document (t-1004 / a-7002): a true 3-page
// storage contract exercising the OCR viewer's page navigation, Cyrillic
// extraction, the whole-document English gloss, and the watchlist tie-in
// (the contract's phone number is on wl-flagged-numbers).

test('multi-page Russian document: pages, Cyrillic blocks, and gloss', async ({ page }) => {
  await page.goto('/');

  // The document sits in the DOCEX lane.
  await page.getByTestId('type-document').click();
  await page.getByTestId('thread-t-1004').click();
  await page.getByTestId('attachment-a-7002').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();

  // Page 1: contract head, Cyrillic, indicator shows 1 / 3.
  await expect(page.getByTestId('ocr-page-indicator')).toContainText('Page 1 / 3');
  const blocks = page.getByTestId('ocr-blocks');
  await expect(blocks).toContainText('ДОГОВОР ХРАНЕНИЯ');
  await expect(blocks).toContainText('Новороссийск');
  await expect(page.getByTestId('ocr-page-prev')).toBeDisabled();

  // Page 2: terms — image and blocks page together.
  await page.getByTestId('ocr-page-next').click();
  await expect(page.getByTestId('ocr-page-indicator')).toContainText('Page 2 / 3');
  await expect(blocks).toContainText('48 000 руб.');
  await expect(blocks).toContainText('+7 903 555 0147');

  // Page 3: annex + signatures; next is exhausted.
  await page.getByTestId('ocr-page-next').click();
  await expect(page.getByTestId('ocr-page-indicator')).toContainText('Page 3 / 3');
  await expect(blocks).toContainText('ОПИСЬ ГРУЗА');
  await expect(page.getByTestId('ocr-page-next')).toBeDisabled();

  // Back to page 1 works.
  await page.getByTestId('ocr-page-prev').click();
  await page.getByTestId('ocr-page-prev').click();
  await expect(blocks).toContainText('ДОГОВОР ХРАНЕНИЯ');

  // The whole-document English gloss is present (one translation for the
  // whole document — the context principle applied to files).
  await expect(page.getByTestId('ocr-gloss')).toContainText('Storage Contract No. SK-2026-0712-09');
  await expect(page.getByTestId('ocr-gloss')).toContainText('Volga-Tranzit');
});

test('the contract surfaces in a flagged-numbers watchlist sweep', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('group-wl-flagged-numbers').click();
  const hit = page.getByTestId('hit-m-22');
  await expect(hit).toBeVisible();
  await expect(hit).toContainText('Storage Contract (Novorossiysk)');
  await expect(hit).toContainText('+7 903 555 0147');
});
