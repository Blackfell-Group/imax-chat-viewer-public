// IMAX mock enrichment service layer.
//
// Stands in for the production enrichment services (search, translation, entity
// extraction, summarization, OCR) behind the exact JSON contracts the SPA is
// built against. Production cutover replaces the base URL per service — no
// client rework. Runs as a plain local process for the demo; each route
// module maps one-to-one onto a containerized the target environment pod at delivery.
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

app.use('/static', express.static(path.join(__dirname, 'static')));

app.use('/api/search', require('./routes/search'));
app.use('/api/translate', require('./routes/translation'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/summarize', require('./routes/summarize'));
app.use('/api/ocr', require('./routes/ocr'));

app.get('/healthz', (req, res) => res.json({ ok: true, services: ['search', 'translate', 'entities', 'summarize', 'ocr'] }));

const PORT = process.env.PORT || 5177;
app.listen(PORT, () => console.log(`imax mock services listening on :${PORT}`));
