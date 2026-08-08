const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

// Every route, actually executed.
//
// This exists because of a specific failure. A `degraded` variable was
// referenced in routes/translation.js but its declaration was never inserted —
// an edit whose pattern silently did not match — so the handler threw
// `ReferenceError: degraded is not defined` and took the mock server down with
// it on the first translation.
//
// Nothing caught it for six commits. The unit tests never execute a route; the
// e2e suite does, but the server dies and every later assertion fails with
// ECONNREFUSED, which reads like an environment problem rather than a
// ReferenceError. And the local check that "verified" it was talking to a
// server process started before the edit.
//
// So: exercise each handler in-process, cheaply, in `npm run test:node`. A
// route that throws fails here in milliseconds and names itself.

const ROUTES = [
  ['/api/search', 'search'],
  ['/api/translate', 'translation'],
  ['/api/entities', 'entities'],
  ['/api/summarize', 'summarize'],
  ['/api/ocr', 'ocr'],
];

/** Boot the mock service layer on an ephemeral port. */
async function withServer(run) {
  const app = express();
  app.use(express.json());
  for (const [mount, file] of ROUTES) app.use(mount, require(`../../routes/${file}`));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  // A handler that throws asynchronously would otherwise take the test runner
  // down the same way it takes the pod down.
  const crashes = [];
  const onCrash = (err) => crashes.push(err);
  process.on('uncaughtException', onCrash);
  try {
    await run(base, crashes);
  } finally {
    process.off('uncaughtException', onCrash);
    await new Promise((r) => server.close(r));
  }
}

const post = (base, path, body) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('every enrichment route answers without throwing', async () => {
  await withServer(async (base, crashes) => {
    const cases = [
      ['GET  /api/search/threads', () => fetch(`${base}/api/search/threads`)],
      ['GET  /api/search/messages', () => fetch(`${base}/api/search/messages?q=port`)],
      ['GET  /api/search/groups', () => fetch(`${base}/api/search/groups`)],
      ['GET  /api/search/threads/:id/messages', () => fetch(`${base}/api/search/threads/t-1001/messages`)],
      ['POST /api/translate', () => post(base, '/api/translate', { messageId: 'm-1', srcLang: 'ar' })],
      ['POST /api/entities', () => post(base, '/api/entities', { messageId: 'm-1' })],
      ['POST /api/summarize', () => post(base, '/api/summarize', { threadId: 't-1001' })],
      ['POST /api/ocr', () => post(base, '/api/ocr', { attachmentId: 'a-7001' })],
    ];

    for (const [label, call] of cases) {
      const res = await call();
      assert.strictEqual(res.status, 200, `${label} answered ${res.status}`);
      const body = await res.json();
      assert.ok(body && typeof body === 'object', `${label} returned no JSON body`);
      assert.ok(!body.error, `${label} returned an error: ${body.error}`);
    }

    assert.deepStrictEqual(crashes.map(String), [], 'a handler threw');
  });
});

test('the fixture path carries its service label and no degraded marker', async () => {
  // With no gateway configured nothing was attempted, so nothing degraded —
  // claiming otherwise would tell an officer a live service had failed.
  await withServer(async (base) => {
    const t = await (await post(base, '/api/translate', { messageId: 'm-1', srcLang: 'ar' })).json();
    assert.strictEqual(t.service, 'mock-translate');
    assert.ok(!('degraded' in t), 'nothing was attempted, so nothing is degraded');
    assert.match(t.text, /Abu Karim/);

    const o = await (await post(base, '/api/ocr', { attachmentId: 'a-7003' })).json();
    assert.strictEqual(o.engine, 'mock-ocr');
    assert.ok(!('degraded' in o));
    assert.ok(o.blocks.length > 0 && o.blocks.every((b) => b.en), 'paired fixture blocks');
  });
});

test('an unknown id is a 404, not a crash', async () => {
  await withServer(async (base, crashes) => {
    assert.strictEqual((await post(base, '/api/translate', { messageId: 'nope' })).status, 404);
    assert.strictEqual((await post(base, '/api/ocr', { attachmentId: 'nope' })).status, 404);
    assert.deepStrictEqual(crashes.map(String), []);
  });
});
