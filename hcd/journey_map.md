# Task Flows & Journey Map — IMAX Chat-Viewer (Deliverable ① HCD artifacts)

UNCLASSIFIED — Companion to `personas.md` and `empathy_maps.md`. The end-to-end triage
journey the prototype supports, the task flow each persona runs inside it, and the success
criteria QA replays. Fabricated composites; no real persons, positions or operations.

TDD subtask 2.2. Success criteria here are the ones re-run as executable specifications in
`tests/ng/` — this document and the test suite are two views of the same claim, which is
what stops it becoming aspirational.

## The journey — one thread, four hands

The take arrives; a thread leaves as reviewed gold. Four roles touch it, in this order,
and the prototype's job is to make each handoff carry its own evidence rather than
requiring the next person to reconstruct it.

```
   TAKE ARRIVES
        │
        ▼
  ┌───────────────┐   what is new, what is worth a linguist's hour?
  │ 1. PRIORITIZE │   P1 Dana — Collection Management Officer
  └───────┬───────┘   queue/all counts · content-type lanes · facet counts
          │           ── hands over: a scoped, defensible work queue
          ▼
  ┌───────────────┐   is the machine translation right, and whose judgment says so?
  │ 2. RENDER     │   P2 Marisol — Language Officer
  │    JUDGMENT   │   my-languages scope · bilingual view · confirm / correct
  └───────┬───────┘   ── hands over: a thread whose text carries a linguist's verdict
          │
          ▼
  ┌───────────────┐   what does it mean, and can I prove it?
  │ 3. EXPLOIT    │   P3 Ken — Subject-Matter Exploiter
  └───────┬───────┘   content search · scroll-to-hit · summary · OCR · notes
          │           ── hands over: substance tied to its source
          ▼
  ┌───────────────┐   who and what, and where else does it appear?
  │ 4. TARGET     │   P4 Priya — Targeting Officer
  └───────┬───────┘   entity search · watchlist / geo-fence groups · date narrowing
          │           ── hands over: a selector hit that is a search result, not a surprise
          ▼
   PROMOTED THREAD GOLD — one output, carrying verdicts, notes and provenance
```

The loop is not strictly linear. Ken's officer tags feed back into Dana's triage facets,
and Priya's entity sweeps re-enter the queue at step 1. The prototype treats that
back-pressure as normal: disposition markers and tags are shared state, not personal state.

## Task flows

### F1 — Prioritize the morning take (P1 Dana)

1. Open the workspace; the queue shows unworked threads by default.
2. Read new vs worked counts; toggle queue/all to see the whole corpus.
3. Scan content-type lanes — message, transcript, document — for where the volume sits.
4. Read facet counts as corpus-level signal before opening anything.
5. Apply scope chips to task the day; disposition markers record the team's decisions.

**Exit:** a work queue someone else can act on without asking what it means.

### F2 — Work a thread in scope (P2 Marisol)

1. Filter to my-languages; the queue narrows to threads she is accountable for.
2. Open a thread. It renders bilingually — English leads, the source stays on screen.
3. Read the machine translation against the original, which is never off-screen.
4. Confirm, or correct against the source. The verdict badges the message.
5. Attach an analyst note where the judgment needs explaining.
6. Promote the thread when it is done. The stack ticks only for completed work.

**Exit:** a thread whose translation carries a named linguist's verdict downstream.

### F3 — Exploit the substance (P3 Ken)

1. Search in content mode across originals *and* English translations.
2. A "matched in translation" badge distinguishes the two kinds of hit.
3. Select a hit; the viewer scrolls to the message and flashes it in context.
4. Request a summary for a long thread, on demand, collapsing it away after.
5. Open an attached document; OCR yields block-level text and an English gloss.
6. Tag and annotate; the tags re-enter triage as facets.

**Exit:** substance tied to its source, without a second tool.

### F4 — Sweep for selectors and entities (P4 Priya)

1. Switch to entity mode; restrict by type — person, geo, selector.
2. Apply a watchlist or geo-fence group as a one-click scope.
3. Narrow by date range.
4. Pivot from an entity chip to every other appearance.
5. Open the hit in its thread; provenance travels with anything exported.

**Exit:** a watchlist hit found this week rather than discovered in three.

## Success criteria, and where each is verified

Every criterion below is replayed by a named specification. Task 5.2 records the result;
`traceability_matrix.md` carries the same rows joined to the pain each one answers.

| # | Persona | Success criterion | Verified by (spec file — test name) |
|---|---|---|---|
| S1 | Dana | Content type, language scope and completion state are all readable from the queue | `queue.spec.js` — *content-type, language scope, and the stack ticks only when work is done* |
| S2 | Dana | Progress reflects decisions taken, and the queue can be run clear | `queue.spec.js` — *queue progress ticks via strip decisions and the stack can run clear* |
| S3 | Dana | Triage filters and group scopes return correctly scoped results | `search.spec.js` — *facet and group triage filters return scoped results* |
| S4 | Dana | The find tools collapse away, leaving the queue as a work list | `queue-only.spec.js` — *find tools collapse to leave just the queue; stack controls stay* |
| S5 | Marisol | A thread opens bilingually with the source always on screen | `bilingual.spec.js` — *threads open bilingual: English leads, source always on screen, no toggle* |
| S6 | Marisol | Correction happens against the source, and review state is obvious | `bilingual.spec.js` — *correction happens against the source; review state is obvious* |
| S7 | Marisol | RTL and mixed-script threads render without layout breakage | `viewer.spec.js` — *thread queue loads and Arabic message renders RTL* |
| S8 | Marisol | A correction and an analyst note reach the output as written | `enrichment.spec.js` — *translation review and analyst note (smoke-6 review flow, clips removed)* |
| S9 | Marisol | Enrichment is thread-level, not per-message hand-work | `enrichment.spec.js` — *auto-translation renders and thread-level entity extraction chips every message* |
| S10 | Marisol | Reviewing a whole thread and promoting it ticks the stack | `ocr-threadgold.spec.js` — *thread gold: translate thread, review all, promote — the stack ticks* |
| S11 | Ken | Search matches native script and English translation in one query | `viewer.spec.js` — *message search accepts native-script and cross-language queries* |
| S12 | Ken | Cross-language search holds across all four corpus languages | `search.spec.js` — *4-language search: native scripts, cross-language, stats* |
| S13 | Ken | A hit lands on the evidence, in context | `viewer.spec.js` — *search hit lands on the evidence with a flash* |
| S14 | Ken | Summaries are on demand and collapse away | `viewer.spec.js` — *summary widget renders on demand and collapses out of the way* |
| S15 | Ken | Document text and an English gloss come out of an image, across pages | `multipage-doc.spec.js` — *multi-page Russian document: pages, Cyrillic blocks, and gloss* |
| S16 | Ken | Extracted blocks name the engine that produced them | `ocr-threadgold.spec.js` — *OCR viewer: extracted blocks render with engine caption* |
| S17 | Ken | Officer tags feed back into triage | `ocr-threadgold.spec.js` — *officer document annotation: tag + note, and the tag filters the queue* |
| S18 | Priya | A group scope implies selector search, and the hit opens its thread | `search.spec.js` — *entity mode with a group implies selector search; hit opens the thread* |
| S19 | Priya | A flagged-number sweep surfaces the contract | `multipage-doc.spec.js` — *the contract surfaces in a flagged-numbers watchlist sweep* |
| S20 | All | One output: export is locked until a thread is promoted, then carries verdicts and notes | `enrichment.spec.js` — *the one output: export is locked until a thread is promoted, then carries verdicts and notes* |

## What changed during performance

Three findings altered this journey after the evaluated Phase 2 demonstration. Each is
recorded as its own artifact with rationale and a restoration path:

- **The unit of gold is the thread, not a snippet** (`linguist_workflow_model.md`) —
  step 2 ends in a promoted thread rather than a tray of clips.
- **No verdict without the source** (`bilingual_display_model.md`) — step 2 reads
  bilingually by default; the source never leaves the screen.
- **A linguist's bench, one output** (`one_output_model.md`) — the journey has a single
  exit, and the evidence-clip path was removed.

The third removes evaluated behavior. The React reference implementation in this
repository is untouched and retains it, so strict parity is a single-commit revert.
