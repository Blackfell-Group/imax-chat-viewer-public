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
  // Settle at the bottom. The reserved row height converges as rows render, so
  // scrollHeight moves under the first jump; re-pin to the new maximum before
  // reading, or `.last()` is the last row of a stale window rather than of the
  // thread.
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="message-stream"]');
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(200);
  }
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

// Reported 8 Aug against the 2,388-message standing channel: scrolling up
// slowly, the stream went blank for most of the window and read as the end of
// the conversation until the next range rendered.
//
// Cause was a declared itemSize of 150px against bubbles that render at 67px
// (English) or 94px (foreign, which carries the translation line). The strategy
// positions each item as though it occupies itemSize, so the rendered block
// covered only ~54% of the slot it was given and the remainder was empty.
//
// A test that only asserted "the DOM is bounded" passed throughout — the window
// WAS bounded, it was just in the wrong place. So this measures the two things
// that were actually wrong: that the reserved height matches what renders, and
// that the viewport is never left partly empty mid-thread.

const REAL_THREAD = 't-3000';

/**
 * Scroll until the reserved row height stops moving, then return it.
 *
 * The reservation can only reflect heights that have actually rendered, and
 * this thread opens on a run of short English messages — so on open it is
 * correctly 67px and corrects itself as taller rows come into view. How many
 * scrolls that takes is a property of the machine, not of the code: a fast
 * laptop gets there in three, a loaded CI runner needs more.
 *
 * So drive to convergence and assert the destination. Asserting a fixed number
 * of scrolls asserts a rate, which is why this suite failed on CI while passing
 * locally at exactly the same commit.
 */
async function scrollUntilSettled(page, stream, rounds = 60) {
  let last = 0;
  for (let round = 1; round <= rounds; round++) {
    await stream.evaluate((el, n) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * ((n % 9) / 9);
    }, round);
    await page.waitForTimeout(250);
    last = await stream.evaluate((el) => el.scrollHeight);
  }
  return last;
}

/** Reserved row height vs what the rendered bubbles actually measure. */
async function drift(page, stream) {
  return stream.evaluate((el) => {
    const hs = [...el.querySelectorAll('app-message-bubble')]
      .map((b) => b.getBoundingClientRect().height)
      .filter((h) => h > 0);
    if (!hs.length) return 1;
    const mean = hs.reduce((a, b) => a + b, 0) / hs.length;
    return Math.abs(el.scrollHeight / 2388 - mean) / mean;
  });
}

/**
 * Scroll and re-check until the reservation matches what renders.
 *
 * Not a fixed number of scrolls, and not a stability heuristic either — both
 * were tried and both failed on CI for the same underlying reason. A fixed
 * budget asserts a convergence RATE, which is a property of the machine. And
 * "unchanged for N checks" measures LATENCY on a loaded runner: the scroll has
 * happened but the measurement has not run yet, so the value looks settled when
 * it is merely pending.
 *
 * Polling asserts the thing that is actually true — that it converges — and
 * gives a slow machine as long as it needs to get there.
 */
async function pollUntilConverged(page, stream, timeout = 45_000) {
  let round = 0;
  await expect
    .poll(
      async () => {
        await stream.evaluate((el, n) => {
          el.scrollTop = (el.scrollHeight - el.clientHeight) * ((n % 9) / 9);
        }, ++round);
        await page.waitForTimeout(250);
        return drift(page, stream);
      },
      { timeout, message: 'the reserved row height never converged on what renders' },
    )
    .toBeLessThan(0.15);
}


test('the reserved row height matches what a message actually renders at', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId(`thread-${REAL_THREAD}`).click();
  await expect(page.getByTestId('message-stream')).toBeVisible();
  await page.waitForTimeout(500);

  const stream = page.getByTestId('message-stream');
  await pollUntilConverged(page, stream);

  const heights = await page
    .locator('app-message-bubble')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height).filter((h) => h > 0));
  expect(heights.length).toBeGreaterThan(3);

  const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
  const reserved = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="message-stream"]');
    // total spacer / item count == the itemSize the strategy is using
    return el.scrollHeight / 2388;
  });

  // And two things can actually go wrong, so assert both directly:
  //
  //   reserve too MUCH  → the rendered block underfills its slot and the window
  //                       goes blank mid-thread (the defect that started this)
  //   reserve too LITTLE → the spacer is shorter than the content and the last
  //                       messages cannot be scrolled to at all
  //
  // So: the reservation must be a height a bubble on THIS machine actually
  // renders at, and the end of the thread must be reachable.
  expect(reserved).toBeGreaterThanOrEqual(Math.min(...heights) - 1);
  expect(reserved).toBeLessThanOrEqual(Math.max(...heights) + 1);

  const lastReachable = await stream.evaluate(async (el) => {
    el.scrollTop = el.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll('app-message-bubble')].some((b) => {
      const r = b.getBoundingClientRect();
      return r.bottom <= box.bottom + 2 && r.bottom > box.top;
    });
  });
  expect(lastReachable, 'the end of the thread must be scrollable to').toBe(true);
});

test('scrolling up slowly never leaves the window blank', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId(`thread-${REAL_THREAD}`).click();
  const stream = page.getByTestId('message-stream');
  await expect(stream).toBeVisible();
  await page.waitForTimeout(500);

  // Start deep in the thread, then walk upward in small steps — the motion that
  // exposed it. A big jump re-renders cleanly and hides the defect.
  await stream.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.6;
  });
  await page.waitForTimeout(400);

  for (let step = 0; step < 12; step++) {
    await stream.evaluate((el) => {
      el.scrollTop -= el.clientHeight * 0.4;
    });
    await page.waitForTimeout(160);

    // How much of the visible window is actually covered by message bubbles?
    const covered = await stream.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const bubbles = [...el.querySelectorAll('app-message-bubble')]
        .map((b) => b.getBoundingClientRect())
        .filter((r) => r.bottom > box.top && r.top < box.bottom);
      if (!bubbles.length) return 0;
      const top = Math.max(box.top, Math.min(...bubbles.map((r) => r.top)));
      const bottom = Math.min(box.bottom, Math.max(...bubbles.map((r) => r.bottom)));
      return (bottom - top) / box.height;
    });

    // The old build fell to roughly a quarter covered here.
    expect(covered, `step ${step}: only ${(covered * 100).toFixed(0)}% of the window held messages`)
      .toBeGreaterThan(0.9);
  }
});

test('the reservation follows the machine, not a number measured on one', async ({ page }) => {
  // The row height a bubble renders at depends on the font stack the machine
  // resolves — a developer laptop, the CI runner and an enclave workstation all
  // differ. A constant measured on one of them is silently wrong on the others,
  // and the symptom is blank space mid-thread rather than an error.
  //
  // Forcing a different rendered height stands in for that difference.
  await page.addStyleTag({
    content: 'app-message-bubble .body, app-message-bubble { line-height: 3.2 !important; }',
  });

  await page.goto('/');
  await page.getByTestId(`thread-${REAL_THREAD}`).click();
  await expect(page.getByTestId('message-stream')).toBeVisible();
  await page.waitForTimeout(800);

  const stream = page.getByTestId('message-stream');
  await pollUntilConverged(page, stream);

  const { reserved, mean } = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="message-stream"]');
    const hs = [...el.querySelectorAll('app-message-bubble')]
      .map((b) => b.getBoundingClientRect().height)
      .filter((h) => h > 0);
    return { reserved: el.scrollHeight / 2388, mean: hs.reduce((a, b) => a + b, 0) / hs.length };
  });

  // pollUntilConverged above already asserted the tolerance; this records what
  // it converged to, so a regression report carries the numbers.
  expect(mean).toBeGreaterThan(0);
  expect(reserved).toBeGreaterThan(0);

  // And the window stays covered, which is the property the officer sees.
  const covered = await page.getByTestId('message-stream').evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.5;
    return new Promise((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const box = el.getBoundingClientRect();
          const rs = [...el.querySelectorAll('app-message-bubble')]
            .map((b) => b.getBoundingClientRect())
            .filter((r) => r.bottom > box.top && r.top < box.bottom);
          if (!rs.length) return resolve(0);
          const top = Math.max(box.top, Math.min(...rs.map((r) => r.top)));
          const bottom = Math.min(box.bottom, Math.max(...rs.map((r) => r.bottom)));
          resolve((bottom - top) / box.height);
        }),
      ),
    );
  });
  expect(covered).toBeGreaterThan(0.9);
});

test('the row-height measurement converges and then stops', async ({ page }) => {
  // Setting the reserved height re-renders the viewport, which fires
  // scrolledIndexChange, which measures again. Left unbounded that does not
  // terminate: on a fast machine it settles inside the tolerance and looks
  // fine, and on a slower one the two bubble heights straddle the threshold and
  // it oscillates, spinning the CPU. That is an unusable workstation, not a
  // failing test — so the property is that it STOPS.
  await page.goto('/');
  await page.getByTestId(`thread-${REAL_THREAD}`).click();
  const stream = page.getByTestId('message-stream');
  await expect(stream).toBeVisible();

  await pollUntilConverged(page, stream);

  // Then scroll hard and watch. The guarantee is not that it freezes the
  // instant it is close enough — it may tick once more as the sample fills —
  // it is that the number of CHANGES is bounded, so it cannot oscillate
  // between the two bubble heights forever and spin the CPU.
  const seen = [];
  for (let i = 1; i <= 24; i++) {
    await stream.evaluate((el, n) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * ((n % 7) / 7);
    }, i);
    await page.waitForTimeout(150);
    seen.push(await stream.evaluate((el) => el.scrollHeight));
  }

  const changes = seen.filter((v, i) => i > 0 && v !== seen[i - 1]).length;
  expect(changes, `reserved height changed ${changes} times across 24 scrolls`).toBeLessThanOrEqual(3);

  // And it has stopped by the end — the last third is one value.
  const tail = seen.slice(-8);
  expect(new Set(tail).size, 'still moving after 24 scrolls').toBe(1);
});
