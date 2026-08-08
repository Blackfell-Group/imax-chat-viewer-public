// Mock of the production entity-extraction service.
// Contract: POST /api/entities { messageId } → { messageId, entities: [{ type,
// text, confidence }], service, schemaVersion }
const express = require('express');
const { entities } = require('../data/seed');

const router = express.Router();

router.post('/', (req, res) => {
  const { messageId } = req.body || {};
  res.json({
    schemaVersion: '1.0',
    service: 'mock-entities',
    messageId,
    entities: entities[messageId] || []
  });
});

module.exports = router;
