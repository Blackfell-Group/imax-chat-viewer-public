# IMAX Chat Viewer — Prototype

River Hawk Consulting, LLC · IMAX HCD Prototype OT · UNCLASSIFIED (all demonstration data is fabricated)

A responsive single-page application for the IMAX chat-viewer requirement: a
three-panel triage workspace (thread queue / chat log viewer / gold-copy
production) with on-demand AI-enabled enrichments — inline translation,
entity extraction, thread summarization, and an OCR image viewer — served by
a schema-pinned mock service layer that stands in for the production enrichment
enrichment services.

## Run it

```bash
npm install
npm run dev        # mock services on :5177 + Vite dev server on :5273
```

Open http://localhost:5273.

## Test it

```bash
npx playwright install chromium   # first time only
npm test                          # end-to-end smoke tests (boots both servers)
```

## Architecture

- `src/` — the SPA (React 18 + MUI 6 + Vite + React Router)
  - `App.jsx` — three-panel layout, clip state, provenance flow
  - `components/NavPanel.jsx` — thread queue: filter/sort/triage
  - `components/ChatViewer.jsx` + `MessageBubble.jsx` — mixed-script/RTL
    message stream, in-place translation, entity chips, summary widget
  - `components/OcrDialog.jsx` — split-pane OCR viewer
  - `components/GoldCopyPanel.jsx` — clips with provenance, product export
- `server.js` + `routes/` — mock enrichment service layer. Each route module
  emulates one production enrichment service behind a pinned JSON contract
  (search, translate, entities, summarize, ocr). At production cutover each
  mock is replaced by its live enterprise hook — no client rework.
- `data/seed.js` — fabricated unclassified multi-language corpus (Arabic,
  Farsi, Chinese, English) plus enrichment fixtures.
- `tests/` — Playwright end-to-end smoke tests.

This directory is self-contained (no imports from the surrounding repository)
so it can be extracted verbatim into the deliverable GitHub repository.
