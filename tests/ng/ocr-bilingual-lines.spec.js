const { test, expect } = require('@playwright/test');

// Owner direction, 8 Aug: "in the OCR we have the original text on each line.
// But I want the translated next to it — left side original Russian line, right
// side the translated English. And opposite for RTL Arabic/Farsi."
//
// So the assertion is geometric, not textual: which COLUMN each rendering
// occupies, per source script. A test that only checked both strings were
// present would pass with the columns the wrong way round, which is the entire
// thing being asked for.

/** Left/right edges of a line's source and English cells. */
async function columns(page, index) {
  const src = await page.locator(`[data-testid="ocr-line-${index}"] .block-src`).boundingBox();
  const en = await page.getByTestId(`ocr-line-en-${index}`).boundingBox();
  return { src, en };
}

test('an RTL document puts the original on the right and the English on the left', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();
  await expect(page.getByTestId('ocr-blocks')).toBeVisible();

  // Arabic source: original to the right of its English, on every line.
  for (const i of [0, 2, 5]) {
    const { src, en } = await columns(page, i);
    expect(src.x, `line ${i}: Arabic source should sit right of the English`).toBeGreaterThan(en.x);
  }

  // Paired on the same row, not stacked — that is what "next to it" means.
  const { src, en } = await columns(page, 0);
  expect(Math.abs(src.y - en.y)).toBeLessThan(src.height);

  await expect(page.getByTestId('ocr-line-en-0')).toContainText('General Authority of Customs');
});

test('an LTR document puts the original on the left and the English on the right', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1004').click();
  await page.getByTestId('attachment-a-7002').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();
  await expect(page.getByTestId('ocr-blocks')).toBeVisible();

  for (const i of [0, 2, 4]) {
    const { src, en } = await columns(page, i);
    expect(src.x, `line ${i}: Russian source should sit left of the English`).toBeLessThan(en.x);
  }

  await expect(page.getByTestId('ocr-line-en-0')).toContainText('STORAGE CONTRACT');
});

test('every line on the page is paired, and the pairing follows paging', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await expect(page.getByTestId('ocr-blocks')).toBeVisible();

  // No line is left without its English — a gap would read as "untranslated"
  // when the truth would be a fixture that lost a row.
  const lines = await page.locator('[data-testid^="ocr-line-"]:not([data-testid*="-en-"])').count();
  const english = await page.locator('[data-testid^="ocr-line-en-"]').count();
  expect(lines).toBeGreaterThan(0);
  expect(english).toBe(lines);

  // Page 2 is the tabular manifest: the pairing has to survive a page change.
  await page.getByTestId('ocr-page-next').click();
  await expect(page.getByTestId('ocr-line-en-0')).toContainText('Detailed statement');
  const lines2 = await page.locator('[data-testid^="ocr-line-"]:not([data-testid*="-en-"])').count();
  const english2 = await page.locator('[data-testid^="ocr-line-en-"]').count();
  expect(english2).toBe(lines2);

  const { src, en } = await columns(page, 2);
  expect(src.x).toBeGreaterThan(en.x);
});
