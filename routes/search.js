// Mock of the enterprise search service: thread discovery, message retrieval,
// and triage search (full-text, entity/selector, groups, date range, facets).
// Contract:
//   GET /api/search/threads?q=&lang=            → { threads: [...] }
//   GET /api/search/threads/:id/messages         → { threadId, messages: [...] }
//   GET /api/search/messages?q=&mode=&lang=&from=&to=&facet=&entityType=&group=
//                                                 → { matches, stats, facetCounts }
//   GET /api/search/groups                        → { groups: [...] }
const express = require('express');
const { threads, messages, translations, entities, groups } = require('../data/seed');

const router = express.Router();

// ---- indexing -------------------------------------------------------------
// Flatten the corpus once so every triage query is a single linear scan with
// message → thread and message → facet lookups already resolved. Production
// binds to the enterprise search index; the shape of what the UI consumes is
// identical.
const threadById = {};
for (const t of threads) threadById[t.threadId] = t;

function facetsFor(m) {
  const ents = entities[m.messageId] || [];
  const types = new Set(ents.map(e => e.type));
  const hasImage = (m.attachments || []).length > 0;
  return {
    'has-geo': types.has('geo'),
    'has-person': types.has('person'),
    'has-selector': types.has('phone'),
    'has-passport': types.has('passport'),
    'has-image': hasImage,
    unenriched: ents.length === 0 && !hasImage
  };
}

const INDEX = [];
// Threads that carry at least one document/image attachment inside them — the
// linguist queue shows a cue so an embedded file is spotted without opening.
const THREAD_HAS_ATTACHMENT = new Set();
for (const t of threads) {
  for (const m of messages[t.threadId] || []) {
    if ((m.attachments || []).length) THREAD_HAS_ATTACHMENT.add(t.threadId);
    INDEX.push({ m, t, ents: entities[m.messageId] || [], facets: facetsFor(m), tr: translations[m.messageId] || null });
  }
}

// Corpus-wide facet counts — the triage signal on each chip ("Has passport (N)").
const CORPUS_FACETS = { 'has-geo': 0, 'has-person': 0, 'has-selector': 0, 'has-passport': 0, 'has-image': 0, unenriched: 0 };
for (const row of INDEX) for (const key of Object.keys(CORPUS_FACETS)) if (row.facets[key]) CORPUS_FACETS[key]++;

// Content-type counts, by thread (a lane is a thread-level property).
const CORPUS_TYPES = { message: 0, transcript: 0, document: 0 };
for (const t of threads) CORPUS_TYPES[t.contentType || 'message'] = (CORPUS_TYPES[t.contentType || 'message'] || 0) + 1;

const groupById = {};
for (const g of groups) groupById[g.id] = g;

// ---- helpers --------------------------------------------------------------
function makeSnippet(source, needleLower) {
  if (!needleLower) return source.slice(0, 120) + (source.length > 120 ? '…' : '');
  const at = source.toLowerCase().indexOf(needleLower);
  if (at < 0) return source.slice(0, 120);
  const start = Math.max(0, at - 55);
  const end = Math.min(source.length, at + needleLower.length + 55);
  return (start > 0 ? '…' : '') + source.slice(start, end) + (end < source.length ? '…' : '');
}

function threadCard(t) {
  return { threadId: t.threadId, title: t.title, network: t.network, contentType: t.contentType || 'message', hasAttachment: THREAD_HAS_ATTACHMENT.has(t.threadId), languages: t.languages, participants: t.participants, lastActivity: t.lastActivity, messageCount: t.messageCount };
}

// ---- routes ---------------------------------------------------------------
router.get('/groups', (req, res) => {
  res.json({ schemaVersion: '1.0', service: 'mock-search', groups });
});

router.get('/threads', (req, res) => {
  const { q, lang, type } = req.query;
  let result = threads;
  if (lang) result = result.filter(t => t.languages.includes(lang));
  if (type) result = result.filter(t => (t.contentType || 'message') === type);
  if (q) {
    const needle = q.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(needle) || t.network.toLowerCase().includes(needle));
  }
  res.json({ schemaVersion: '1.0', service: 'mock-search', typeCounts: CORPUS_TYPES, threads: result.map(threadCard) });
});

router.get('/threads/:threadId/messages', (req, res) => {
  const msgs = messages[req.params.threadId];
  if (!msgs) return res.status(404).json({ error: 'thread not found' });
  res.json({ schemaVersion: '1.0', service: 'mock-search', threadId: req.params.threadId, messages: msgs });
});

// Unified triage search. Filters compose: language, date range, and facet tag
// narrow the candidate set; then mode decides how the query/group is matched.
//  - mode=content  : q matches message text OR its English translation.
//  - mode=entity   : match detected entities (person/geo/phone/passport). q is
//    a free-text entity value; group expands a geo-fence or selector watchlist
//    to its members; entityType restricts to one kind.
// With no q/group but a facet set, returns every message carrying that facet —
// the "show me everything with a passport" triage move.
router.get('/messages', (req, res) => {
  const started = Date.now();
  const { q = '', mode = 'content', lang, from, to, facet, entityType, group, type } = req.query;
  const needle = q.toString().trim();
  const needleLower = needle.toLowerCase();
  const fromTs = from ? `${from}T00:00:00Z` : null;
  const toTs = to ? `${to}T23:59:59Z` : null;
  const grp = group ? groupById[group] : null;
  const memberSet = grp ? new Set(grp.members.map(v => v.toLowerCase())) : null;
  // A group is inherently an entity/selector match, so selecting one implies
  // entity mode even if the caller left mode at its "content" default.
  const effectiveMode = grp ? 'entity' : mode;

  const matches = [];
  let scanned = 0;
  const threadsHit = new Set();
  const LIMIT = 80;

  for (const row of INDEX) {
    const { m, t } = row;
    if (lang && !t.languages.includes(lang)) continue;
    if (type && (t.contentType || 'message') !== type) continue;
    if (fromTs && m.ts < fromTs) continue;
    if (toTs && m.ts > toTs) continue;
    if (facet && !row.facets[facet]) continue;
    scanned++;

    let hit = null;
    if (effectiveMode === 'entity') {
      // Match against detected entities. selector = phone (a number is a
      // selector); a watchlist may target handles too, matched via sender.
      const wantType = entityType && entityType !== 'selector' ? entityType : null;
      for (const e of row.ents) {
        if (wantType && e.type !== wantType) continue;
        if (entityType === 'selector' && e.type !== 'phone') continue;
        const val = e.text.toLowerCase();
        const groupOk = !memberSet || memberSet.has(val);
        const queryOk = !needleLower || val.includes(needleLower);
        if (groupOk && queryOk) { hit = { field: 'entity', entity: e, source: m.text, dir: m.dir }; break; }
      }
      // Watchlists can also target the sending selector (handle).
      if (!hit && memberSet && memberSet.has(m.sender.handle.toLowerCase())) {
        const queryOk = !needleLower || m.sender.handle.toLowerCase().includes(needleLower);
        if (queryOk) hit = { field: 'selector', entity: { type: 'handle', text: m.sender.handle }, source: m.text, dir: m.dir };
      }
      // Facet-only sweep (no q, no group): any indexed entity qualifies.
      if (!hit && !needleLower && !memberSet && facet && row.ents.length) {
        const e = row.ents[0];
        hit = { field: 'entity', entity: e, source: m.text, dir: m.dir };
      }
    } else {
      if (needleLower) {
        if (m.text.toLowerCase().includes(needleLower)) hit = { field: 'text', source: m.text, dir: m.dir };
        else if (row.tr && row.tr.toLowerCase().includes(needleLower)) hit = { field: 'translation', source: row.tr, dir: 'ltr' };
      } else if (facet) {
        hit = { field: 'text', source: m.text, dir: m.dir }; // facet-only content sweep
      }
    }

    if (hit && matches.length < LIMIT) {
      threadsHit.add(t.threadId);
      matches.push({
        threadId: t.threadId,
        thread: threadCard(t),
        messageId: m.messageId,
        ts: m.ts,
        sender: m.sender.handle,
        lang: m.lang,
        dir: hit.dir,
        field: hit.field,
        entity: hit.entity || null,
        contentType: t.contentType || 'message',
        tags: Object.keys(row.facets).filter(k => k !== 'unenriched' && row.facets[k]),
        snippet: makeSnippet(hit.source, hit.field === 'entity' || hit.field === 'selector' ? '' : needleLower)
      });
    }
  }

  res.json({
    schemaVersion: '1.0',
    service: 'mock-search',
    query: needle,
    mode: effectiveMode,
    group: grp ? { id: grp.id, label: grp.label, kind: grp.kind } : null,
    stats: { scanned, threadsHit: threadsHit.size, corpusMessages: INDEX.length, corpusThreads: threads.length, tookMs: Date.now() - started, truncated: matches.length >= LIMIT },
    facetCounts: CORPUS_FACETS,
    typeCounts: CORPUS_TYPES,
    matches
  });
});

module.exports = router;
