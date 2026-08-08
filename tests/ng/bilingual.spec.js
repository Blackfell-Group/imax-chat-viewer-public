const { test, expect } = require('@playwright/test');

// hcd/bilingual_display_model.md (1 Aug, final form): translations render by
// default and the view is ALWAYS bilingual once English exists — there is no
// per-message toggle, because the original is never hidden.

test('threads open bilingual: English leads, source always on screen, no toggle', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();
  const msg = page.getByTestId('msg-m-1');

  // Default view: English AND the Arabic source, RTL-correct, with the
  // machine-translate badge and the needs-review edge.
  await expect(msg).toContainText('Abu Karim');
  const original = page.getByTestId('original-m-1');
  await expect(original).toBeVisible();
  await expect(original).toContainText('وصلت الشحنة');
  await expect(original).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('translated-m-1')).toContainText('mock-translate');
  await expect(msg).toHaveClass(/needs-review/);

  // No show-original toggle exists — the source line makes it redundant.
  await expect(page.locator('[data-testid="translate-m-1"]')).toHaveCount(0);

  // English-only messages stay single-language: no badge, no source line.
  await expect(page.getByTestId('translated-m-3')).toHaveCount(0);
  await expect(page.getByTestId('original-m-3')).toHaveCount(0);
});

test('correction happens against the source; review state is obvious', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  // Open the correction editor: the source line sits above the draft.
  await page.getByTestId('edit-tr-m-1').click();
  await expect(page.getByTestId('original-m-1')).toBeVisible();
  await expect(page.getByTestId('edit-field-m-1')).toBeVisible();

  await page.getByTestId('edit-field-m-1').fill('The shipment reached the port this morning; the trader Abu Karim collects it himself.');
  await page.getByTestId('save-tr-m-1').click();

  // Post-verdict: badge, source still on screen, and the review edge flips
  // from needs-review to reviewed-edited (section state at a glance).
  await expect(page.getByTestId('translated-m-1')).toContainText('linguist-edited');
  await expect(page.getByTestId('original-m-1')).toBeVisible();
  await expect(page.getByTestId('msg-m-1')).toHaveClass(/reviewed-edited/);

  // Confirming another message shows the confirmed edge.
  await page.getByTestId('confirm-m-2').click();
  await expect(page.getByTestId('msg-m-2')).toHaveClass(/reviewed-confirmed/);
});
