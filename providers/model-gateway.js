// Live enrichment via an OpenAI-wire-compatible model gateway.
//
// THE END STATE: in the target enclave these services call the Sponsor's own
// model gateway, not a commercial endpoint. Nothing here is vendor-specific:
// it speaks the OpenAI-compatible chat-completions wire format that such
// gateways expose, so moving between environments is configuration, never
// code.
//
// Three values switch it on, all injected at deploy time. Only the key is a
// secret — no gateway address appears anywhere in this repository:
//   MODEL_ENDPOINT   ConfigMap; unset => fixtures, the default
//   MODEL_API_KEY    Secret; never baked into an image
//   MODEL_NAME       ConfigMap; whatever the gateway publishes
//
// Unset, missing key, unreachable gateway, or a malformed response => the
// route falls back to its fixture. A model outage degrades the bench to the
// mock rather than blocking the linguist.
//
// That fallback is the right runtime behaviour and the wrong deployment
// signal: a pod that is missing one of the three comes up green and answers
// every request from fixtures, so "the gateway is wired" and "the gateway is
// wired but doing nothing" look identical. describe() exists so the pod says
// which it is at startup, in its log, without anyone reading pod env.

const BASE_URL = (process.env.MODEL_ENDPOINT || '').replace(/\/$/, '');
const MODEL = process.env.MODEL_NAME || 'gpt-4o-mini';
// OCR is a VISION call and translation is not, so they do not have to be — and
// generally should not be — the same model.
//
// The enclave gateway publishes GPT-OSS 5.2 and Claude Sonnet 4.5. Only a
// vision-capable model can read a scan; point OCR at one that cannot and every
// page fails identically, falls back to the fixture, and the deployment looks
// wired while no document is ever actually read. Translation, meanwhile, is the
// high-volume path — a standing channel is thousands of messages — so it is the
// one worth sending to the cheaper model.
//
// Unset, this is MODEL_NAME, so a single-model gateway needs no extra config.
// MODEL_NAME_OCR is the deployed name — the enclave Secret carries the endpoint,
// the key, and a model id for each of the two jobs. MODEL_NAME_VISION is kept as
// an accepted alias so an earlier deployment does not break on upgrade.
const OCR_MODEL_ENV = process.env.MODEL_NAME_OCR || process.env.MODEL_NAME_VISION || '';

// Resolved once, at startup, by preflight(). Null until then; after that it is
// fixed for the life of the process, so every scan in a pod's lifetime goes to
// the same engine and the gold copy's provenance is stable.
let resolvedVision = null;

/** The model scans are sent to: explicit config, else what startup discovered. */
function visionModel() {
  return OCR_MODEL_ENV || resolvedVision || MODEL;
}

// An 8x8 white PNG. Small enough to be free, large enough to clear the
// minimum-dimension checks some providers apply.
const PROBE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR4nGP4jwMwDC0JALoev0Ewkwr8AAAAAElFTkSuQmCC';

/**
 * Does this model accept an image?
 *
 * Asked of the GATEWAY, not of a model's opinion about itself. A model will
 * tell you confidently that "claude-sonnet-4-5" is vision-capable, but it has
 * no idea what this gateway actually serves under that id — a text-only or
 * quantised build carries the same name, and enclave gateways publish internal
 * ids a model has never seen. Sending one tiny image settles it.
 *
 * Run once per model at startup and never again.
 */
async function probeVision(model) {
  try {
    await chatOnce(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Reply with OK.' },
            { type: 'image_url', image_url: { url: PROBE_PNG } },
          ],
        },
      ],
      { maxTokens: 5, model }
    );
    return true;
  } catch (err) {
    // Distinguish "this model cannot take an image" from "the call did not
    // happen". Treating every failure as a refusal is how a billing problem
    // gets reported as a wrong model name: a live run against a real gateway
    // with an exhausted balance said `gpt-4o refused a test image`, which is
    // false and sends the operator to fix the wrong thing.
    // Specifically about images. "Unsupported parameter: 'max_tokens'" also
    // contains "unsupported", and reading that as "this model cannot see" is
    // how a wire-format problem gets reported as a capability one — which is
    // exactly what happened on the first live run.
    if (/image|vision|multimodal|image_url|not a multimodal/i.test(err.message)) return false;
    throw err;
  }
}
const TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 20000);

function enabled() {
  return !!BASE_URL && !!process.env.MODEL_API_KEY;
}

// Provenance label that travels into the gold copy: the officer can always
// see which engine produced a translation, and from which gateway.
function serviceLabel(kind) {
  const host = BASE_URL.replace(/^https?:\/\//, '').split('/')[0];
  // The gold copy records which engine produced a rendering. With two models
  // behind one gateway, naming the wrong one is a false provenance claim.
  return `${host}:${kind === 'vision' ? visionModel() : MODEL}`;
}

/**
 * One line for the startup log. Names the missing values rather than just
 * reporting "fixtures", because "I forgot the key" and "I meant fixtures" are
 * the same observation otherwise — and the first one is only ever discovered
 * when someone notices the translations look canned.
 */
function describe() {
  const missing = [];
  if (!BASE_URL) missing.push('MODEL_ENDPOINT');
  if (!process.env.MODEL_API_KEY) missing.push('MODEL_API_KEY');
  if (!process.env.MODEL_NAME) missing.push('MODEL_NAME');

  if (!enabled()) {
    return `model gateway off — fixtures (unset: ${missing.join(', ')})`;
  }
  // Configured is still not the same as correct. Both of these produce a model
  // name the Sponsor's gateway has never published, and the resulting 404 reads
  // like the gateway is down rather than like a missing value.
  let warn = '';
  if (MODEL === 'SET-ME') warn = ' — MODEL_NAME is still the placeholder';
  else if (!process.env.MODEL_NAME) warn = ` — MODEL_NAME unset, defaulting to ${MODEL}`;
  const vision =
    visionModel() === MODEL ? ' — one model for text and vision' : ` — vision: ${visionModel()}`;
  return `model gateway on — ${serviceLabel()}${vision}${warn}`;
}

// How many times a transient failure is worth re-asking. Kept small on purpose:
// an officer is waiting, and the fixture fallback behind this is a usable answer
// rather than an error page.
const MAX_ATTEMPTS = Number(process.env.MODEL_RETRIES || 3);

/**
 * Is this worth asking again?
 *
 * Only conditions that can differ on a second attempt. A 401 or a 404 is a
 * ConfigMap or a model name — retrying spends the officer's time to reach the
 * same wrong answer, and buries the real cause under a timeout. A parse failure
 * is likewise deterministic: temperature is 0, so the model will say the same
 * thing again.
 */
function retryable(err) {
  if (err.name === 'AbortError') return true;          // our own timeout
  // 429 usually means "slow down", which a retry fixes. It also carries quota
  // exhaustion, which no retry ever fixes — retrying that spends the officer's
  // wait three times over to reach the same billing error.
  if (err.status === 429) return !/insufficient_quota|credit|billing|exceeded your current quota/i.test(err.message);
  if (err.status === 408) return true;
  if (err.status >= 500 && err.status < 600) return true;
  return err.status === undefined && !err.deterministic; // network / DNS / reset
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chat(messages, opts = {}) {
  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await chatOnce(messages, opts);
    } catch (err) {
      last = err;
      if (attempt === MAX_ATTEMPTS || !retryable(err)) break;
      // Backoff, so a gateway shedding load is not hammered by every pod at once.
      await sleep(300 * 2 ** (attempt - 1));
      console.warn(`[model-gateway] attempt ${attempt} failed (${err.message}); retrying`);
    }
  }
  last.attempts = MAX_ATTEMPTS;
  throw last;
}

// Which output-length parameter this gateway's models accept.
//
// The chat-completions wire format changed under us: older models take
// `max_tokens`, the GPT-5 family rejects it outright and requires
// `max_completion_tokens`. A live run against a real endpoint answered
//
//   400 Unsupported parameter: 'max_tokens' is not supported with this model.
//
// on EVERY call, which in the enclave would have meant every translation and
// every document silently falling back to its fixture while the deployment
// reported a healthy gateway. Nothing in a stub catches this, because a stub
// accepts whatever it is sent.
//
// Rather than make it configuration — one more value to get wrong, and the
// enclave publishes two models that may not agree — it is discovered once from
// the gateway's own error and remembered for the process.
let tokenParam = process.env.MODEL_TOKEN_PARAM || 'max_tokens';

/** Does this 400 mean "you used the wrong length parameter"? */
function isTokenParamError(detail) {
  return /max_tokens|max_completion_tokens/i.test(detail) && /unsupported|not supported|unrecognized|invalid/i.test(detail);
}

// Whether this gateway's models accept a temperature at all.
//
// temperature: 0 is deliberate — the same document translated twice should
// produce the same gold copy. But reasoning-family models reject any
// non-default value outright:
//
//   400 Unsupported value: 'temperature' does not support 0 with this model.
//       Only the default (1) value is supported.
//
// Verified live: o4-mini and gpt-5-nano refuse it, gpt-5.2 accepts it. So which
// behaviour the enclave gets depends on which model it publishes, and if it
// refuses, EVERY call 400s and every answer silently becomes a fixture.
//
// Dropping the parameter is the right trade — a non-deterministic translation
// beats no translation and a mute fallback — but it is a real loss, so it is
// announced rather than absorbed quietly.
let sendTemperature = process.env.MODEL_TEMPERATURE !== 'omit';

function isTemperatureError(detail) {
  return /temperature/i.test(detail) && /unsupported|not supported|does not support|invalid/i.test(detail);
}

async function chatOnce(messages, opts = {}) {
  try {
    return await postChat(messages, opts);
  } catch (err) {
    if (err.status !== 400) throw err;

    if (isTokenParamError(err.message)) {
      const swapped = tokenParam === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
      console.warn(`[model-gateway] gateway wants ${swapped}; switching for the rest of this process`);
      tokenParam = swapped;
      return await chatOnce(messages, opts);
    }

    if (sendTemperature && isTemperatureError(err.message)) {
      console.warn(
        '[model-gateway] this model refuses a fixed temperature; omitting it for the rest of ' +
          'this process. NOTE: output is no longer deterministic, so re-running a translation ' +
          'may not reproduce an earlier gold copy verbatim.'
      );
      sendTemperature = false;
      return await chatOnce(messages, opts);
    }

    throw err;
  }
}

async function postChat(messages, { maxTokens = 1200, model = MODEL } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        [tokenParam]: maxTokens,
        ...(sendTemperature ? { temperature: 0 } : {})
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      // Gateways answer errors as JSON. Carrying the raw body forward means the
      // operator reads "429 {" in a log line that has been truncated for width,
      // instead of "You have no credits remaining" — which is the whole message.
      const raw = await res.text();
      let detail = raw.replace(/\s+/g, ' ').trim();
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message || parsed?.message || detail;
      } catch {
        /* not JSON — the flattened body is the best available */
      }
      const err = new Error(`${res.status} ${detail}`.trim());
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content?.trim();
    if (!text) throw new Error('empty completion');
    // A reply cut off at the token ceiling is not a malformed reply, and the
    // two need different fixes — raise the ceiling versus fix the prompt. Both
    // land in the same catch and fall back to the fixture, so without naming
    // this the operator sees "using fixture" and has nothing to act on.
    if (choice.finish_reason === 'length') {
      throw Object.assign(new Error(
        `completion truncated at max_tokens=${maxTokens} — raise it for this document, ` +
          'or the page is too dense for one call'
      ), { deterministic: true });
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull a JSON object out of a completion.
 *
 * Asking for "strict JSON, no prose" gets it most of the time. The rest of the
 * time a model fences it, or writes one polite sentence first. Both are trivial
 * to survive and expensive not to: the parse throws, the route falls back to the
 * fixture, and the enclave concludes the gateway does not work.
 */
function parseJsonReply(raw) {
  const unfenced = raw.replace(/```(?:json)?/gi, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw Object.assign(new Error(`no JSON object in completion: ${unfenced.slice(0, 120)}`), {
      deterministic: true,
    });
  }
  return JSON.parse(unfenced.slice(start, end + 1));
}

/**
 * Ask the gateway what it actually publishes.
 *
 * OpenAI-compatible gateways expose GET /models. It answers with ids and no
 * capability metadata — nothing in the response says which of them can accept
 * an image — so this is used to VALIDATE and DIAGNOSE, not to silently decide.
 *
 * The value is turning the two worst startup failures into sentences. A model
 * name the gateway has never published answers 404 on the first translation,
 * which reads like an outage; and MODEL_NAME_VISION left unset on a multi-model
 * gateway means every scan quietly falls back to stored text. Both are visible
 * here, at startup, before an officer meets them.
 */
async function listModels() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = await res.json();
    return (data.data || []).map((m) => m.id).filter(Boolean);
  } finally {
    clearTimeout(timer);
  }
}

// Ids that a vision call can be pointed at, most preferred first. Matched as
// substrings against whatever the gateway publishes.
//
// This is a HEURISTIC ON NAMES, which is why it never runs unless asked for.
// Choosing a model changes what produced the gold copy, and a bench whose
// provenance depends on what a gateway happened to list that morning is not
// reproducible — the same reason temperature is pinned to 0.
const VISION_PREFERENCE = ['sonnet', 'claude', 'gpt-4o', 'vision', 'vl'];

/**
 * Startup check against the gateway's own catalogue. Returns lines for the log.
 * Never throws: a gateway that will not answer /models is not a reason to
 * refuse to start, only a reason to say so.
 */
async function preflight() {
  if (!enabled()) return [describe()];
  const lines = [describe()];
  let published;
  try {
    published = await listModels();
  } catch (err) {
    lines.push(`  /models unavailable (${err.message}) — names cannot be verified from here`);
    return lines;
  }
  lines.push(`  gateway publishes ${published.length}: ${published.join(', ')}`);

  for (const [label, name] of [['MODEL_NAME', MODEL], ['MODEL_NAME_OCR', visionModel()]]) {
    if (published.length && !published.includes(name)) {
      lines.push(`  WARNING: ${label} "${name}" is not published — calls will 404 and read like an outage`);
    }
  }

  // MODEL_NAME_VISION unset on a multi-model gateway is the failure that costs
  // most and shows least: every scan silently falls back to stored text. Settle
  // it here, ONCE, by asking the gateway rather than guessing from the name.
  if (!OCR_MODEL_ENV && published.length > 1) {
    // Preference order first so the likely answer is found in one call, then
    // everything else — an enclave gateway may publish ids nothing recognises.
    const ranked = [
      ...VISION_PREFERENCE.flatMap((h) => published.filter((m) => m.toLowerCase().includes(h))),
      ...published,
    ];
    const ordered = [...new Set(ranked)];

    let probeError = null;
    let tried = 0;
    for (const candidate of ordered) {
      try {
        tried++;
        if (await probeVision(candidate)) {
          resolvedVision = candidate;
          break;
        }
      } catch (err) {
        // Could not determine — say that, rather than blaming the model.
        probeError = err;
        break;
      }
    }
    if (probeError) {
      lines.push(
        `  could not probe for a vision model (${probeError.message.split('\n')[0].slice(0, 120)}) — ` +
          `scans will use "${visionModel()}" unverified`
      );
    }

    if (resolvedVision && resolvedVision !== MODEL) {
      lines.push(
        // `tried`, not the candidate count: reporting how many models exist as
        // though each had been probed overstates what was actually asked, and a
        // number that large reads like a startup cost nobody would accept.
        `  MODEL_NAME_OCR unset — probed ${tried} of ${ordered.length} published model(s) with a test image; ` +
          `scans will use "${resolvedVision}". Set MODEL_NAME_OCR to pin it.`
      );
    } else if (resolvedVision === MODEL) {
      lines.push(`  MODEL_NAME_OCR unset — "${MODEL}" accepts images, using it for scans too`);
    } else {
      lines.push(
        '  WARNING: no published model accepted a test image — documents will fall back to ' +
          'stored text and the viewer will say so on screen'
      );
    }
  }
  // An explicitly configured OCR model is still worth one test image. Getting
  // this wrong is silent — every document falls back to stored text — and the
  // check costs one call at startup.
  if (OCR_MODEL_ENV) {
    try {
      if (!(await probeVision(OCR_MODEL_ENV))) {
        lines.push(
          `  WARNING: MODEL_NAME_OCR "${OCR_MODEL_ENV}" refused a test image — documents will ` +
            'fall back to stored text. Point it at a model that accepts images.'
        );
      }
    } catch (err) {
      lines.push(
        `  could not verify MODEL_NAME_OCR "${OCR_MODEL_ENV}" (${err.message.split('\n')[0].slice(0, 120)})`
      );
    }
  }

  // Negotiate the wire-format divergences HERE, before anyone is waiting.
  //
  // They are discovered from a 400, and whichever call triggers that pays a
  // wasted round trip. Left to happen naturally, that call is the first
  // officer's first translation. A probe above may already have settled it; if
  // nothing has, spend one trivial request now so the cost lands on pod start
  // rather than on someone's screen.
  if (tokenParam === 'max_tokens' && sendTemperature) {
    try {
      await chatOnce([{ role: 'user', content: 'ok' }], { maxTokens: 1 });
    } catch {
      /* Not a health check — a failure here says nothing about serving. */
    }
  }
  const negotiated = [];
  if (tokenParam !== 'max_tokens') negotiated.push(tokenParam);
  if (!sendTemperature) negotiated.push('no temperature (output is not deterministic)');
  if (negotiated.length) lines.push(`  wire format negotiated: ${negotiated.join(' · ')}`);

  // Restated after probing, because the line above was printed before the
  // gateway had been asked anything.
  lines.push(`  resolved — text: ${MODEL} · scans: ${visionModel()}`);
  return lines;
}

// Full-context translation: the whole thread (or document) goes in one call,
// which is the point of the thread-level unit of work — a sentence translated
// alone loses referents, register, and continuity.
async function translate({ text, srcLang, context }) {
  const system =
    'You are a professional intelligence linguist. Translate the target text into ' +
    'English. Preserve names, numbers, selectors, and dates exactly as written. ' +
    'Do not summarize, explain, or add commentary. Return only the translation.';
  const user = context
    ? `Surrounding thread context (for reference only — do not translate):\n${context}\n\n` +
      `Translate this ${srcLang || 'foreign-language'} message:\n${text}`
    : `Translate this ${srcLang || 'foreign-language'} text:\n${text}`;
  return chat([
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]);
}

// Vision OCR. Requires a raster image (PNG/JPEG) — the demo corpus ships SVG
// "scans", so run `node scripts/rasterize-attachments.js` first; without a
// raster the caller falls back to the fixture.
// The viewer sets each source line beside its own English, so the transcription
// has to come back PAIRED.
//
// The obvious shape — {"lines": [...], "en": [...]} — cannot be trusted. A model
// transcribing a form merges wrapped lines and splits table cells, so it returns
// 55 sources and 54 translations, and every row after the drift point renders the
// wrong English against the wrong source. Nothing about that looks broken on
// screen, which makes it worse than an empty column: an officer would certify a
// pairing the machine never made.
//
// One object per line makes the mismatch impossible to express. Whatever the
// model decides a line is, its translation travels with it.
async function ocr({ dataUri, srcLang }) {
  const system =
    'You are an OCR and document-exploitation engine. Transcribe every line of ' +
    'text in the image exactly as printed, preserving the original script and ' +
    'line order. Give each line its own English rendering. Then provide a ' +
    'single English gloss of the whole document. Return strict JSON: ' +
    '{"lines": [{"src": "...", "en": "..."}], "englishGloss": "..."}. ' +
    'Every element of "lines" must have both keys. No prose.';
  const raw = await chat(
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Transcribe this ${srcLang || ''} document page and gloss it in English.`.trim()
          },
          { type: 'image_url', image_url: { url: dataUri } }
        ]
      }
    ],
    { maxTokens: 2000, model: visionModel() }
  );
  const parsed = parseJsonReply(raw);
  if (!Array.isArray(parsed.lines)) throw new Error('provider returned no lines');
  // Normalise to {src, en} whatever the model actually sent. A gateway running
  // an older prompt returns bare strings; those still transcribe correctly and
  // simply carry no per-line English, so the viewer falls back to the document
  // gloss rather than showing an empty column beside every line.
  const lines = parsed.lines
    .map((l) => (typeof l === 'string' ? { src: l, en: '' } : { src: String(l?.src ?? ''), en: String(l?.en ?? '') }))
    .filter((l) => l.src.trim());
  if (!lines.length) throw new Error('provider returned no usable lines');
  return { ...parsed, lines };
}

module.exports = {
  enabled, serviceLabel, describe, preflight, listModels,
  translate, ocr, probeVision, visionModel, MODEL, BASE_URL,
};
