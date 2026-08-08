const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');

// "Will the model gateway actually work?" — asked 8 Aug, and the honest answer
// needed evidence rather than a reading of the prompt.
//
// Everything except the model's own behaviour can be proven here: a stub that
// speaks the OpenAI-compatible chat-completions wire format, and the real
// provider pointed at it. What that covers is the whole integration — request
// shape, auth header, vision payload, JSON extraction, the paired-line
// normalisation, and every failure mode that would otherwise surface in the
// enclave as "the gateway does not work".
//
// What it cannot cover is whether a given model transcribes Arabic well. That
// is a model-quality question and it is the reason the fixture fallback exists.

const PROVIDER = path.join(__dirname, '..', '..', 'providers', 'model-gateway.js');

/** Start a stub gateway that replies with whatever `reply` produces. */
async function withGateway(reply, run, models = { list: ['test-model'], override: false }) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      // The catalogue is served for free unless a test overrides it. Failing
      // /models makes preflight() return before it reaches anything else, which
      // hides whatever the test was actually about.
      if (req.url.endsWith('/models') && !models.override) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ data: models.list.map((id) => ({ id })) }));
      }
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
      const out = reply(seen.length);
      res.writeHead(out.status || 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out.json));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();

  // BASE_URL is read at module load, so configure before requiring.
  const prevEndpoint = process.env.MODEL_ENDPOINT;
  const prevKey = process.env.MODEL_API_KEY;
  const prevName = process.env.MODEL_NAME;
  process.env.MODEL_ENDPOINT = `http://127.0.0.1:${port}/v1`;
  process.env.MODEL_API_KEY = 'test-key';
  process.env.MODEL_NAME = 'test-model';
  delete require.cache[require.resolve(PROVIDER)];
  const provider = require(PROVIDER);

  try {
    await run(provider, seen);
  } finally {
    process.env.MODEL_ENDPOINT = prevEndpoint;
    process.env.MODEL_API_KEY = prevKey;
    process.env.MODEL_NAME = prevName;
    delete require.cache[require.resolve(PROVIDER)];
    await new Promise((r) => server.close(r));
  }
}

const completion = (content, finish = 'stop') => ({
  json: { choices: [{ finish_reason: finish, message: { role: 'assistant', content } }] },
});

const PAIRED = JSON.stringify({
  lines: [
    { src: 'بوليصة شحن', en: 'Bill of Lading' },
    { src: 'السفينة: نجمة سرت', en: 'Vessel: Sirte Star' },
  ],
  englishGloss: 'Bill of lading for the vessel Sirte Star.',
});

test('the request the gateway receives is the one an OpenAI-compatible gateway expects', async () => {
  await withGateway(
    () => completion(PAIRED),
    async (provider, seen) => {
      await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });

      const req = seen[0];
      assert.strictEqual(req.url, '/v1/chat/completions', 'endpoint gets /chat/completions appended');
      assert.strictEqual(req.headers.authorization, 'Bearer test-key');
      assert.strictEqual(req.body.model, 'test-model');
      assert.strictEqual(req.body.temperature, 0, 'deterministic, so a rerun reproduces the gold copy');

      // Vision payload: text part plus an image_url part carrying the data URI.
      const user = req.body.messages.find((m) => m.role === 'user');
      assert.ok(Array.isArray(user.content), 'vision calls send parts, not a string');
      const kinds = user.content.map((c) => c.type);
      assert.deepStrictEqual(kinds, ['text', 'image_url']);
      assert.match(user.content[1].image_url.url, /^data:image\/png;base64,/);
    },
  );
});

test('a well-formed reply yields paired lines', async () => {
  await withGateway(
    () => completion(PAIRED),
    async (provider) => {
      const out = await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
      assert.strictEqual(out.lines.length, 2);
      assert.deepStrictEqual(out.lines[0], { src: 'بوليصة شحن', en: 'Bill of Lading' });
      assert.match(out.englishGloss, /Sirte Star/);
    },
  );
});

test('fenced JSON survives — models wrap it whatever the prompt says', async () => {
  await withGateway(
    () => completion('```json\n' + PAIRED + '\n```'),
    async (provider) => {
      const out = await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
      assert.strictEqual(out.lines.length, 2);
    },
  );
});

test('a polite sentence before the JSON survives', async () => {
  await withGateway(
    () => completion("Here is the transcription you asked for:\n\n" + PAIRED),
    async (provider) => {
      const out = await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
      assert.strictEqual(out.lines[1].en, 'Vessel: Sirte Star');
    },
  );
});

test('a gateway on the older prompt still transcribes, with no per-line English', async () => {
  // Bare strings rather than {src, en}. The page must still open; it simply
  // falls back to the whole-document gloss instead of an empty right column.
  const older = JSON.stringify({ lines: ['بوليصة شحن', 'السفينة: نجمة سرت'], englishGloss: 'Bill of lading.' });
  await withGateway(
    () => completion(older),
    async (provider) => {
      const out = await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
      assert.strictEqual(out.lines.length, 2);
      assert.strictEqual(out.lines[0].src, 'بوليصة شحن');
      assert.strictEqual(out.lines[0].en, '', 'no English claimed that was not supplied');
    },
  );
});

test('blank lines are dropped rather than rendered as empty rows', async () => {
  const withBlank = JSON.stringify({
    lines: [{ src: 'بوليصة شحن', en: 'Bill of Lading' }, { src: '   ', en: 'stray' }],
    englishGloss: 'x',
  });
  await withGateway(
    () => completion(withBlank),
    async (provider) => {
      const out = await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
      assert.strictEqual(out.lines.length, 1);
    },
  );
});

test('a truncated completion is reported as truncation, not as a bad reply', async () => {
  // The two need different fixes — raise the ceiling versus fix the prompt —
  // and both otherwise land in the same silent fixture fallback.
  await withGateway(
    () => completion('{"lines": [{"src": "بوليصة', 'length'),
    async (provider) => {
      await assert.rejects(
        () => provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' }),
        /truncated at max_tokens/,
      );
    },
  );
});

test('a reply with no JSON at all names what came back', async () => {
  await withGateway(
    () => completion('I am unable to read this image.'),
    async (provider) => {
      await assert.rejects(
        () => provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' }),
        /no JSON object in completion/,
      );
    },
  );
});

test('an HTTP error carries the gateway status through', async () => {
  await withGateway(
    () => ({ status: 404, json: { error: { message: 'model not found' } } }),
    async (provider) => {
      await assert.rejects(
        () => provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' }),
        /404/,
      );
    },
  );
});

test('translation returns the text itself, with thread context sent but not translated', async () => {
  await withGateway(
    () => completion('The shipment arrived at the port this morning.'),
    async (provider, seen) => {
      const out = await provider.translate({
        text: 'وصلت الشحنة إلى الميناء صباح اليوم.',
        srcLang: 'ar',
        context: 'earlier messages in the thread',
      });
      assert.strictEqual(out, 'The shipment arrived at the port this morning.');

      const user = seen[0].body.messages.find((m) => m.role === 'user');
      assert.match(user.content, /for reference only — do not translate/);
      assert.match(user.content, /وصلت الشحنة/);
    },
  );
});

test('describe() distinguishes "off" from "on but misconfigured"', async () => {
  await withGateway(
    () => completion('x'),
    async (provider) => {
      assert.match(provider.describe(), /model gateway on — 127\.0\.0\.1:\d+:test-model/);
    },
  );
  // With nothing configured it must name what is missing, so a green pod that
  // is silently answering from fixtures is diagnosable from the startup log.
  const prev = { e: process.env.MODEL_ENDPOINT, k: process.env.MODEL_API_KEY };
  delete process.env.MODEL_ENDPOINT;
  delete process.env.MODEL_API_KEY;
  delete require.cache[require.resolve(PROVIDER)];
  const off = require(PROVIDER);
  assert.strictEqual(off.enabled(), false);
  assert.match(off.describe(), /model gateway off — fixtures \(unset: MODEL_ENDPOINT, MODEL_API_KEY/);
  if (prev.e) process.env.MODEL_ENDPOINT = prev.e;
  if (prev.k) process.env.MODEL_API_KEY = prev.k;
  delete require.cache[require.resolve(PROVIDER)];
});

test('a transient failure is retried, and the attempt count is reported', async () => {
  // 503 twice, then success. The officer should never see this.
  await withGateway(
    (n) => (n < 3 ? { status: 503, json: { error: 'overloaded' } } : completion(PAIRED)),
    async (provider, seen) => {
      const out = await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
      assert.strictEqual(out.lines.length, 2, 'recovered without the caller knowing');
      assert.strictEqual(seen.length, 3, 'two retries then success');
    },
  );
});

test('a misconfiguration is NOT retried — it wastes the officer\'s time to reach the same answer', async () => {
  await withGateway(
    () => ({ status: 401, json: { error: 'invalid api key' } }),
    async (provider, seen) => {
      await assert.rejects(() => provider.ocr({ dataUri: 'data:image/png;base64,AAAA' }), /401/);
      assert.strictEqual(seen.length, 1, '401 is a Secret, not a blip');
    },
  );
});

test('a truncated reply is not retried either — temperature 0 makes it deterministic', async () => {
  await withGateway(
    () => completion('{"lines": [{"src": "بول', 'length'),
    async (provider, seen) => {
      await assert.rejects(() => provider.ocr({ dataUri: 'data:image/png;base64,AAAA' }), /truncated/);
      assert.strictEqual(seen.length, 1);
    },
  );
});

test('exhausting the retries reports how many were made', async () => {
  await withGateway(
    () => ({ status: 503, json: { error: 'overloaded' } }),
    async (provider, seen) => {
      await assert.rejects(
        () => provider.ocr({ dataUri: 'data:image/png;base64,AAAA' }),
        (err) => err.attempts === 3,
      );
      assert.strictEqual(seen.length, 3);
    },
  );
});

test('OCR and translation can target different models on the same gateway', async () => {
  // The enclave publishes GPT-OSS 5.2 and Claude Sonnet 4.5. OCR is a vision
  // call; translation is not, and translation is the high-volume path. Pointing
  // both at one name means either paying vision rates for every message or
  // sending scans to a model that cannot see them.
  process.env.MODEL_NAME_VISION = 'claude-sonnet-4-5';
  try {
    await withGateway(
      () => completion(PAIRED),
      async (provider, seen) => {
        await provider.ocr({ dataUri: 'data:image/png;base64,AAAA', srcLang: 'ar' });
        await provider.translate({ text: 'مرحبا', srcLang: 'ar' });

        assert.strictEqual(seen[0].body.model, 'claude-sonnet-4-5', 'the scan goes to the vision model');
        assert.strictEqual(seen[1].body.model, 'test-model', 'the message goes to the text model');

        // Provenance must name whichever model actually did the work, or the
        // gold copy attributes a rendering to the wrong engine.
        assert.match(provider.serviceLabel('vision'), /claude-sonnet-4-5$/);
        assert.match(provider.serviceLabel(), /test-model$/);
        assert.match(provider.describe(), /vision: claude-sonnet-4-5/);
      },
    );
  } finally {
    delete process.env.MODEL_NAME_VISION;
  }
});

test('a single-model gateway needs no extra configuration', async () => {
  await withGateway(
    () => completion(PAIRED),
    async (provider, seen) => {
      await provider.ocr({ dataUri: 'data:image/png;base64,AAAA' });
      assert.strictEqual(seen[0].body.model, 'test-model', 'falls back to MODEL_NAME');
      assert.match(provider.describe(), /one model for text and vision/);
    },
  );
});

test('a text-only model rejecting a scan is reported, not retried, and not hidden', async () => {
  // The likeliest real failure if OCR is pointed at GPT-OSS: the gateway 400s
  // because the model cannot take an image. It is a configuration error, so it
  // must surface rather than burn three attempts looking like an outage.
  await withGateway(
    () => ({ status: 400, json: { error: { message: 'model does not support image input' } } }),
    async (provider, seen) => {
      await assert.rejects(
        () => provider.ocr({ dataUri: 'data:image/png;base64,AAAA' }),
        /does not support image input/,
      );
      assert.strictEqual(seen.length, 1, 'a capability mismatch is not transient');
    },
  );
});

test('quota exhaustion is not retried — no retry ever fixes a billing balance', async () => {
  // Found against a real gateway: a 429 carrying insufficient_quota was retried
  // three times, spending the officer's wait to reach the same billing error.
  const body = { error: { message: 'You have no credits remaining.', code: 'insufficient_quota' } };
  await withGateway(
    () => ({ status: 429, json: body }),
    async (provider, seen) => {
      await assert.rejects(() => provider.translate({ text: 'x', srcLang: 'ar' }), /credits remaining/);
      assert.strictEqual(seen.length, 1, 'quota is not a blip');
    },
  );
});

test('rate limiting IS retried — that one a retry does fix', async () => {
  await withGateway(
    (n) => (n < 2 ? { status: 429, json: { error: { message: 'Rate limit reached, slow down' } } } : completion('ok')),
    async (provider, seen) => {
      assert.strictEqual(await provider.translate({ text: 'x', srcLang: 'ar' }), 'ok');
      assert.strictEqual(seen.length, 2);
    },
  );
});

test('a failed probe is reported as undetermined, not as the model refusing images', async () => {
  // The same live run reported `gpt-4o refused a test image` when the truth was
  // an exhausted balance. That sends the operator to fix the model name while
  // the actual problem is billing.
  process.env.MODEL_NAME_OCR = 'some-vision-model';
  try {
    await withGateway(
      () => ({ status: 429, json: { error: { message: 'You have no credits remaining.', code: 'insufficient_quota' } } }),
      async (provider) => {
        const lines = (await provider.preflight()).join('\n');
        assert.match(lines, /could not verify MODEL_NAME_OCR/);
        assert.doesNotMatch(lines, /refused a test image/, 'must not blame the model for a billing failure');
      },
    );
  } finally {
    delete process.env.MODEL_NAME_OCR;
  }
});

test('a model that genuinely cannot take an image is still reported as such', async () => {
  process.env.MODEL_NAME_OCR = 'text-only-model';
  try {
    await withGateway(
      () => ({ status: 400, json: { error: { message: 'model does not support image input' } } }),
      async (provider) => {
        const lines = (await provider.preflight()).join('\n');
        assert.match(lines, /refused a test image/);
      },
    );
  } finally {
    delete process.env.MODEL_NAME_OCR;
  }
});

test('the output-length parameter is negotiated from the gateway, not configured', async () => {
  // Found live: GPT-5 family models reject `max_tokens` outright —
  //   400 Unsupported parameter: 'max_tokens' is not supported with this model.
  // Every call would have 400'd and fallen back to its fixture while the pod
  // reported a healthy gateway. A stub never catches this because a stub
  // accepts whatever it is sent.
  await withGateway(
    (n) =>
      n === 1
        ? {
            status: 400,
            json: {
              error: {
                message: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
              },
            },
          }
        : completion('The shipment arrived at the port this morning.'),
    async (provider, seen) => {
      const out = await provider.translate({ text: 'مرحبا', srcLang: 'ar' });
      assert.strictEqual(out, 'The shipment arrived at the port this morning.');

      assert.ok('max_tokens' in seen[0].body, 'first attempt uses the older name');
      assert.ok('max_completion_tokens' in seen[1].body, 'retry switches to what the gateway asked for');
      assert.ok(!('max_tokens' in seen[1].body), 'and does not send both');

      // Remembered, so the cost is one 400 per process rather than per call.
      await provider.translate({ text: 'مرحبا', srcLang: 'ar' });
      assert.ok('max_completion_tokens' in seen[2].body, 'the choice sticks');
      assert.strictEqual(seen.length, 3, 'no repeated probing');
    },
  );
});

test('a parameter complaint is not mistaken for a model that cannot see', async () => {
  // "Unsupported parameter: 'max_tokens'" contains "unsupported", and reading
  // that as a vision refusal is how a wire-format problem gets reported as a
  // capability one. It did, on the first live run.
  process.env.MODEL_NAME_OCR = 'gpt-5.2';
  try {
    await withGateway(
      (n) =>
        n === 1
          ? { status: 400, json: { error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model." } } }
          : completion('OK'),
      async (provider) => {
        const lines = (await provider.preflight()).join('\n');
        assert.doesNotMatch(lines, /refused a test image/, 'a parameter error is not a capability verdict');
      },
    );
  } finally {
    delete process.env.MODEL_NAME_OCR;
  }
});

test('a model that refuses a fixed temperature still works, and says what was lost', async () => {
  // Verified live: o4-mini and gpt-5-nano reject `temperature: 0` outright,
  // while gpt-5.2 accepts it. Which behaviour the enclave gets depends on which
  // model it publishes — and if it refuses, every call 400s and every answer
  // silently becomes a fixture.
  const warnings = [];
  const realWarn = console.warn;
  console.warn = (m) => warnings.push(String(m));
  try {
    await withGateway(
      (n) =>
        n === 1
          ? {
              status: 400,
              json: {
                error: {
                  message:
                    "Unsupported value: 'temperature' does not support 0 with this model. Only the default (1) value is supported.",
                },
              },
            }
          : completion('The shipment arrived at the port this morning.'),
      async (provider, seen) => {
        const out = await provider.translate({ text: 'مرحبا', srcLang: 'ar' });
        assert.strictEqual(out, 'The shipment arrived at the port this morning.');

        assert.strictEqual(seen[0].body.temperature, 0, 'determinism is attempted first');
        assert.ok(!('temperature' in seen[1].body), 'then dropped rather than abandoning the call');

        // Determinism is a stated property of the gold copy. Losing it silently
        // would be worse than the 400.
        assert.ok(
          warnings.some((w) => /no longer deterministic/i.test(w)),
          'the loss of reproducibility must be announced',
        );

        await provider.translate({ text: 'مرحبا', srcLang: 'ar' });
        assert.ok(!('temperature' in seen[2].body), 'and the choice sticks');
      },
    );
  } finally {
    console.warn = realWarn;
  }
});

test('both parameter negotiations can happen on the same gateway', async () => {
  // A reasoning model needs BOTH: max_completion_tokens and no temperature.
  const realWarn = console.warn;
  console.warn = () => {};
  try {
    await withGateway(
      (n) => {
        if (n === 1)
          return { status: 400, json: { error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model." } } };
        if (n === 2)
          return { status: 400, json: { error: { message: "Unsupported value: 'temperature' does not support 0 with this model." } } };
        return completion('ok');
      },
      async (provider, seen) => {
        assert.strictEqual(await provider.translate({ text: 'x', srcLang: 'ar' }), 'ok');
        assert.strictEqual(seen.length, 3, 'one probe per divergence, then success');
        assert.ok('max_completion_tokens' in seen[2].body);
        assert.ok(!('temperature' in seen[2].body));
      },
    );
  } finally {
    console.warn = realWarn;
  }
});

test('the wire format is negotiated at startup, not on the first officer request', async () => {
  // Both divergences are discovered from a 400, and whichever call triggers it
  // pays a wasted round trip. Left to happen naturally that call is someone's
  // first translation, with them watching. Spend it on pod start instead.
  await withGateway(
    (n) =>
      n === 1
        ? { status: 400, json: { error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model." } } }
        : completion('ok'),
    async (provider, seen) => {
      const lines = (await provider.preflight()).join('\n');
      assert.match(lines, /wire format negotiated: max_completion_tokens/);

      const afterStartup = seen.length;
      await provider.translate({ text: 'x', srcLang: 'ar' });

      // Exactly one request for the officer — no rediscovery, no 400.
      assert.strictEqual(seen.length, afterStartup + 1);
      assert.ok('max_completion_tokens' in seen[afterStartup].body);
    },
  );
});

test('a gateway that needs nothing costs one trivial startup call and says nothing', async () => {
  await withGateway(
    () => completion('ok'),
    async (provider) => {
      const lines = (await provider.preflight()).join('\n');
      assert.doesNotMatch(lines, /wire format negotiated/, 'nothing to report when nothing diverged');
      assert.match(lines, /resolved — text: test-model/);
    },
  );
});
