const { test, expect } = require('@playwright/test');

// Angular-build panel shell: independent collapse on both side panels, with
// the reference app's expand testids (nav-expand, goldcopy-expand). Lives in
// tests/ng/ because the React app's collapse triggers carry no testid or
// accessible name — the ported smoke suite covers React-visible behavior.

test('triage panel collapses to a rail and expands via nav-expand', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('nav-panel')).toBeVisible();
  await page.getByTitle('Collapse triage panel').click();
  await expect(page.getByTestId('nav-panel')).toHaveCount(0);
  await page.getByTestId('nav-expand').click();
  await expect(page.getByTestId('nav-panel')).toBeVisible();
});

test('gold copy panel collapses independently via goldcopy-expand', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Gold Copy')).toBeVisible();
  await page.getByTitle('Collapse gold copy panel').click();
  await expect(page.getByTestId('goldcopy-expand')).toBeVisible();
  // Triage panel is unaffected — collapse is independent per panel.
  await expect(page.getByTestId('nav-panel')).toBeVisible();
  await page.getByTestId('goldcopy-expand').click();
  await expect(page.getByText('Gold Copy')).toBeVisible();
});
