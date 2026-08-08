const { test, expect } = require('@playwright/test');

// Asked 8 Aug: "if it fails does it retry and let the user know?"
//
// The retry is proven in tests/node/model-gateway.test.js. This is the second
// half — that a failure the retries could not recover is TOLD TO THE OFFICER
// rather than logged server-side and dressed up as a normal answer.
//
// The stake is specific: an officer can confirm a translation, and that verdict
// travels into the gold copy as their assertion. Certifying fixture text in the
// belief it came from the gateway is the failure this guards against.

test('a failed live service is stated on screen, not just in a server log', async ({ page }) => {
  await page.route('**/api/ocr', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    await route.fulfill({
      json: {
        ...body,
        degraded: { reason: 'fetch failed', attempts: 3, attempted: 'gw.enclave.local:vision-1' },
      },
    });
  });

  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await expect(page.getByTestId('ocr-dialog')).toBeVisible();

  const banner = page.getByTestId('ocr-degraded');
  await expect(banner).toBeVisible();
  // Names the gateway, the attempts, and the reason — enough to act on.
  await expect(banner).toContainText('gw.enclave.local:vision-1');
  await expect(banner).toContainText('3 attempts');
  await expect(banner).toContainText('fetch failed');
  // And says plainly what the text on screen is.
  await expect(banner).toContainText(/not a live transcription/i);
});

test('a healthy service shows no warning', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('thread-t-1005').click();
  await page.getByTestId('attachment-a-7003').click();
  await expect(page.getByTestId('ocr-blocks')).toBeVisible();
  await expect(page.getByTestId('ocr-degraded')).toHaveCount(0);
});
