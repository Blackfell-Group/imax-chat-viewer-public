const { test, expect } = require('@playwright/test');

// Day-1 shell contract, asserted by visible text rather than testids so it
// holds for both implementations: the React reference app (playwright.config.js)
// and the Phase 3 Angular build (playwright.ng.config.js).
test('app shell renders the toolbar and UNCLASS banner', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('UNCLASSIFIED — DEMONSTRATION DATA (FABRICATED)')).toBeVisible();
  await expect(page.getByText('Triage Workspace')).toBeVisible();
});

test('dev proxy reaches the mock search service', async ({ page }) => {
  const res = await page.request.get('/api/search/threads');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.threads ?? body)).toBeTruthy();
});
