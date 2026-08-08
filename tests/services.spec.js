const { test, expect } = require('@playwright/test');

// Day-2 contract proof: every enrichment endpoint answers through the app's
// dev proxy with the documented shape. Fixture IDs come from data/seed.js.
// Passes under both configs (React/Vite proxy and Angular ng-serve proxy).

test('search: thread list, thread messages, groups', async ({ page }) => {
  const threads = await (await page.request.get('/api/search/threads')).json();
  expect(threads.threads.length).toBeGreaterThan(3);
  expect(threads.threads[0]).toHaveProperty('threadId');
  expect(threads.typeCounts).toHaveProperty('message');

  const msgs = await (await page.request.get('/api/search/threads/t-1001/messages')).json();
  expect(msgs.threadId).toBe('t-1001');
  expect(msgs.messages[0]).toHaveProperty('sender.handle');

  const groups = await (await page.request.get('/api/search/groups')).json();
  const kinds = groups.groups.map((g) => g.kind);
  expect(kinds).toContain('geofence');
  expect(kinds).toContain('watchlist');
});

test('search: triage query returns matches, stats, and facet counts', async ({ page }) => {
  const res = await (
    await page.request.get('/api/search/messages?q=warehouse&mode=content')
  ).json();
  expect(res.matches.length).toBeGreaterThan(0);
  expect(res.stats).toHaveProperty('scanned');
  expect(res.stats).toHaveProperty('tookMs');
  expect(res.facetCounts).toHaveProperty('has-passport');
  expect(res.matches[0]).toHaveProperty('snippet');
});

test('translate: fixture message translates to English', async ({ page }) => {
  const res = await (
    await page.request.post('/api/translate', { data: { messageId: 'm-1', srcLang: 'ar' } })
  ).json();
  expect(res.dstLang).toBe('en');
  expect(res.text).toContain('Abu Karim');
  expect(res.confidence).toBeGreaterThan(0);
});

test('entities: fixture message yields person + phone', async ({ page }) => {
  const res = await (
    await page.request.post('/api/entities', { data: { messageId: 'm-3' } })
  ).json();
  const types = res.entities.map((e) => e.type);
  expect(types).toContain('person');
  expect(types).toContain('phone');
});

test('summarize: fixture thread yields summary', async ({ page }) => {
  const res = await (
    await page.request.post('/api/summarize', { data: { threadId: 't-1001' } })
  ).json();
  expect(res.summary).toContain('Tripoli');
});

test('ocr: fixture attachment yields full text and blocks', async ({ page }) => {
  const res = await (
    await page.request.post('/api/ocr', { data: { attachmentId: 'a-7001' } })
  ).json();
  expect(res.fullText).toContain('BILL OF LADING');
  expect(res.blocks.length).toBeGreaterThan(5);
  expect(res.blocks[0]).toHaveProperty('bbox');
});
