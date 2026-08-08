// Mock of the production summarization service.
// Contract: POST /api/summarize { threadId } → { threadId, summary, service,
// schemaVersion }
const express = require('express');
const { summaries } = require('../data/seed');

const router = express.Router();

router.post('/', (req, res) => {
  const { threadId } = req.body || {};
  const summary = summaries[threadId];
  if (!summary) return res.status(404).json({ error: `no summary fixture for ${threadId}` });
  res.json({ schemaVersion: '1.0', service: 'mock-summarize', threadId, summary });
});

module.exports = router;
