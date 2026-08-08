const { test, expect } = require('@playwright/test');

// TDD 3.3 commits the chat log viewer to a "virtualized (windowed) message
// stream", and TDD Task 5 commits QA to verifying "<200 ms interaction latency
// on large chat logs via virtualization".
//
// The delivered corpus cannot prove either: its largest thread is 18 messages,
// which any renderer handles. So the large thread is synthesised here by
// intercepting the thread-messages response — that keeps the demonstration
// corpus honest (it is what the Sponsor sees) while still exercising the
// rendering path against the volume the requirement is about.
//
// What is asserted is the property that matters: the DOM holds a bounded
// window regardless of thread length. A test that only measured wall-clock
// would pass on a fast machine with no virtualization at all.

const BIG = 2000;
const LATENCY_BUDGET_MS = 200;

/** Replace the first thread's messages with `count` synthetic ones. */
async function withHugeThread(page, count) {
  await page.route('**/api/search/threads/*/messages', async (route) => {
    const base = new Date('2026-06-24T00:00:00Z').getTime();
    const messages = Array.from({ length: count }, (_, i) => ({
      messageId: `perf-${i}`,
      threadId: 't-1001',
      // Deliberately NOT emitted in order: the viewer sorts, and this proves
      // it still does at volume.
      ts: new Date(base + ((i * 7919) % count) * 60_000).toISOString(),
      sender: { handle: `user${i % 9}`, network: 'demo-net' },
      lang: 'en',
      dir: 'ltr',
      text: `Synthetic load-bearing message ${i} — enough body text to give the bubble a realistic rendered height in the stream.`,
      attachments: [],
    }));
    await route.fulfill({ json: { threadId: 't-1001', messages } });
  });
}

test('the message stream is windowed: a 2,000-message thread renders a bounded DOM', async ({
  page,
}) => {
  await withHugeThread(page, BIG);
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();

  const stream = page.getByTestId('message-stream');
  await expect(stream).toBeVisible();
  await expect(page.getByTestId('stream-count')).toContainText(`${BIG} messages`);

  // The whole point: 2,000 messages, far fewer bubbles in the document.
  const rendered = await page.locator('app-message-bubble').count();
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThan(120);

  // And the viewport really is scrollable across the full set, i.e. the
  // spacer is sized for 2,000 items rather than for what is rendered.
  const scrollHeight = await stream.evaluate((el) => el.scrollHeight);
  expect(scrollHeight).toBeGreaterThan(50_000);
});

test('scrolling a large thread stays inside the interaction budget', async ({ page }) => {
  await withHugeThread(page, BIG);
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();
  const stream = page.getByTestId('message-stream');
  await expect(stream).toBeVisible();

  // Measure the scroll-to-repaint round trip in the page, not across the
  // Playwright wire — the wire would dominate and measure the harness.
  const worst = await stream.evaluate(async (el) => {
    const samples = [];
    for (let i = 1; i <= 10; i++) {
      const t0 = performance.now();
      el.scrollTop = i * 4000;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      samples.push(performance.now() - t0);
    }
    return Math.max(...samples);
  });

  // Reported so a regression shows its margin rather than only its verdict.
  console.log(`worst scroll-to-repaint over 10 jumps: ${worst.toFixed(1)} ms`);
  expect(worst).toBeLessThan(LATENCY_BUDGET_MS);

  // Still bounded after all that scrolling — recycling, not accumulating.
  expect(await page.locator('app-message-bubble').count()).toBeLessThan(120);
});

test('sort order applies at volume and the toggle reverses it', async ({ page }) => {
  await withHugeThread(page, 200);
  await page.goto('/');
  await page.getByTestId('thread-t-1001').click();
  await expect(page.getByTestId('message-stream')).toBeVisible();

  const firstTimestamp = async () =>
    (await page.locator('app-message-bubble .ts').first().textContent())?.trim() ?? '';

  // Ascending: the top of the stream is the earliest message in the thread,
  // which is the defect — the fixtures arrive unsorted, so this only holds
  // because the viewer sorts.
  const ascFirst = await firstTimestamp();
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="message-stream"]');
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(150);
  const ascBottom = (
    await page.locator('app-message-bubble .ts').last().textContent()
  )?.trim();
  expect(Date.parse(ascBottom)).toBeGreaterThan(Date.parse(ascFirst));

  await page.evaluate(() => {
    document.querySelector('[data-testid="message-stream"]').scrollTop = 0;
  });
  await page.getByTestId('stream-sort').click();
  await expect(page.getByTestId('stream-sort')).toContainText('Newest first');
  await page.waitForTimeout(150);

  const descFirst = await firstTimestamp();
  expect(Date.parse(descFirst)).toBeGreaterThan(Date.parse(ascFirst));
  expect(descFirst).toEqual(ascBottom);
});
