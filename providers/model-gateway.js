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
const TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 20000);

function enabled() {
  return !!BASE_URL && !!process.env.MODEL_API_KEY;
}

// Provenance label that travels into the gold copy: the officer can always
// see which engine produced a translation, and from which gateway.
function serviceLabel() {
  const host = BASE_URL.replace(/^https?:\/\//, '').split('/')[0];
  return `${host}:${MODEL}`;
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
  return `model gateway on — ${serviceLabel()}${warn}`;
}

async function chat(messages, { maxTokens = 1200 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature: 0 }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('empty completion');
    return text;
  } finally {
    clearTimeout(timer);
  }
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
async function ocr({ dataUri, srcLang }) {
  const system =
    'You are an OCR and document-exploitation engine. Transcribe every line of ' +
    'text in the image exactly as printed, preserving the original script and ' +
    'line order. Then provide a single English gloss of the whole document. ' +
    'Return strict JSON: {"lines": ["..."], "englishGloss": "..."}. No prose.';
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
    { maxTokens: 2000 }
  );
  const json = raw.replace(/^```(?:json)?|```$/g, '').trim();
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.lines)) throw new Error('provider returned no lines');
  return parsed;
}

module.exports = { enabled, serviceLabel, describe, translate, ocr, MODEL, BASE_URL };
