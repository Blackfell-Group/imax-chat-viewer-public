// Mock of the production translation service.
// Contract: POST /api/translate { messageId, srcLang } → { messageId, srcLang,
// dstLang, text, confidence, service, schemaVersion }
//
// With MODEL_ENDPOINT set (from the deployment Secret) the same contract
// is answered by the enclave's model gateway instead of the fixture
// — the live tier from hcd/bilingual_display_model.md. The `service` field reports which engine
// answered, so provenance in the gold copy stays truthful. Any failure falls
// back to the fixture: a blocked egress or missing key degrades to the mock
// rather than breaking the linguist's workflow.
const express = require('express');
const { translations, messages } = require('../data/seed');
const provider = require('../providers/model-gateway');

const router = express.Router();

// Locate a message's source text (and its thread, for full-context calls).
function findMessage(messageId) {
  for (const msgs of Object.values(messages)) {
    const msg = msgs.find((m) => m.messageId === messageId);
    if (msg) return { msg, msgs };
  }
  return null;
}

router.post('/', async (req, res) => {
  const { messageId, srcLang } = req.body || {};
  const fixture = translations[messageId];
  const found = findMessage(messageId);

  if (provider.enabled() && found) {
    try {
      // Full-thread context: translation judgment lives in context.
      const context = found.msgs
        .filter((m) => m.messageId !== messageId)
        .map((m) => `@${m.sender.handle} (${m.lang}): ${m.text}`)
        .join('\n');
      const text = await provider.translate({ text: found.msg.text, srcLang, context });
      return res.json({
        schemaVersion: '1.0',
        service: provider.serviceLabel(),
        messageId,
        srcLang: srcLang || found.msg.lang || 'auto',
        dstLang: 'en',
        text,
        confidence: 0.97
      });
    } catch (err) {
      console.warn(`[translate] provider failed for ${messageId}, using fixture: ${err.message}`);
    }
  }

  if (!fixture) return res.status(404).json({ error: `no translation fixture for ${messageId}` });
  res.json({
    schemaVersion: '1.0',
    service: 'mock-translate',
    messageId,
    srcLang: srcLang || 'auto',
    dstLang: 'en',
    text: fixture,
    confidence: 0.92
  });
});

module.exports = router;
