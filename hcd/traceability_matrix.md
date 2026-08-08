# Pain-to-Design Traceability Matrix — IMAX Chat-Viewer (Deliverable ① HCD artifacts)

UNCLASSIFIED — TDD subtask 2.4. Each persona pain point joined to the design response that
answers it, the screen where that response lives, and the validation result that proves it
works. Pains are drawn from two places in the research: **Frustrations today** in
`personas.md` and **Pains removed** in `empathy_maps.md`. Validation is the executable
specification that re-runs the claim, per Task 5.2.

This exists so "we addressed the research" is checkable rather than asserted. A row with no
validation column is a design intention; a row with one is a delivered behaviour.

**Reading it:** *Screen* uses the three-panel vocabulary from `wireframes.md` — Left
(Search & Triage), Center (Chat Log Viewer), Right (Gold Copy). *Evidence* names a
screenshot in `project/evidence/screens/` showing the built state.

## P1 — Dana, Collection Management Officer

| Pain | Design response | Screen | Validation | Evidence |
|---|---|---|---|---|
| Cross-tool reconciliation of statistics against content | Counts and content on one screen: new/worked counts above the queue they describe | Left | `queue.spec.js` — *content-type, language scope, and the stack ticks only when work is done* | `day2-queue-only-view.png` |
| Opening threads just to find out whether they are worked | Disposition markers (reviewed / flagged / discarded) as shared team state, visible in the list | Left | `queue.spec.js` — *queue progress ticks via strip decisions and the stack can run clear* | `day2-review-states-strip.png` |
| No cheap way to tell an empty channel from a hot one | Facet counts as corpus-level triage signal, read before opening anything | Left | `search.spec.js` — *facet and group triage filters return scoped results* | `search-1-crosslang.png` |
| Volume without signal; tasking that is hard to defend | Content-type lanes (message / transcript / document) and queue/all toggle | Left | `queue-only.spec.js` — *find tools collapse to leave just the queue; stack controls stay* | `tour-2-working-stack.png` |
| Progress that counts activity rather than completion | The stack ticks only when a thread is actually finished, and can be run clear | Left | `queue.spec.js` — *queue progress ticks via strip decisions and the stack can run clear* | `tour-3-stack-clear.png` |

## P2 — Marisol, Language Officer

| Pain | Design response | Screen | Validation | Evidence |
|---|---|---|---|---|
| Machine translation pasted onward loses its provenance | Verdict badges — linguist-confirmed / linguist-edited — that persist into the output | Center → Right | `enrichment.spec.js` — *translation review and analyst note (smoke-6 review flow, clips removed)* | `day1-bilingual-review.png` |
| Her correction does not travel with the text | One correction, made once, badges the message and lands in the export as written | Center → Right | `enrichment.spec.js` — *the one output: export is locked until a thread is promoted* | `day9-export-thread-gold.png` |
| Judging a translation without its source in view | Bilingual by default: English leads, the source line stays on screen, no toggle | Center | `bilingual.spec.js` — *threads open bilingual: English leads, source always on screen, no toggle* | `day1-bilingual-review.png` |
| Correcting against the translation rather than the original | Correction is written against the source; review state is visible while editing | Center | `bilingual.spec.js` — *correction happens against the source; review state is obvious* | `day2-review-states-strip.png` |
| RTL text breaks in generic viewers | RTL and mixed-script rendering in the thread and the queue | Center | `viewer.spec.js` — *thread queue loads and Arabic message renders RTL* | `day6-viewer-rtl-summary.png` |
| Re-translating already-worked messages | Translations render by default; worked state is visible before opening | Left, Center | `ocr-threadgold.spec.js` — *thread gold: translate thread, review all, promote — the stack ticks* | `day2-review-states-strip.png` |
| Uncertainty about which threads are hers | My-languages scope chips as the only language scope | Left | `queue.spec.js` — *content-type, language scope, and the stack ticks only when work is done* | `day2-queue-only-view.png` |

## P3 — Ken, Subject-Matter Exploiter

| Pain | Design response | Screen | Validation | Evidence |
|---|---|---|---|---|
| Search that stops at metadata | Content-mode search across originals and English translations in one query | Left | `viewer.spec.js` — *message search accepts native-script and cross-language queries* | `search-1-crosslang.png` |
| Cannot tell a source hit from a translation hit | "Matched in translation" badge distinguishes the two | Left | `search.spec.js` — *4-language search: native scripts, cross-language, stats* | `search-1-crosslang.png` |
| Losing thread context when quoting one message | Scroll-to-hit lands on the message and flashes it, in its thread | Center | `viewer.spec.js` — *search hit lands on the evidence with a flash* | `day6-hit-flash-landing.png` |
| Long threads that must be read end to end | Summary on demand, collapsing out of the way after | Center | `viewer.spec.js` — *summary widget renders on demand and collapses out of the way* | `day6-viewer-rtl-summary.png` |
| Attachments require a second tool | OCR viewer with block-level extraction and English gloss, multi-page | Center | `multipage-doc.spec.js` — *multi-page Russian document: pages, Cyrillic blocks, and gloss* | `day9-ocr-annotation.png` |
| Hand-built evidence trails | Officer tags and notes feed back into search and into the single output | Center → Right | `ocr-threadgold.spec.js` — *officer document annotation: tag + note, and the tag filters the queue* | `day9-thread-gold-promoted.png` |
| Any excerpt he cannot trace | Provenance line under everything that leaves the workspace | Right | `enrichment.spec.js` — *the one output: export is locked until a thread is promoted* | `day9-export-thread-gold.png` |

## P4 — Priya, Targeting Officer

| Pain | Design response | Screen | Validation | Evidence |
|---|---|---|---|---|
| Selector lists checked by hand against exports | Entity-mode search with type restriction (person / geo / selector) | Left | `search.spec.js` — *entity mode with a group implies selector search; hit opens the thread* | `search-2-watchlist.png` |
| A list checked weekly is checked too late | Watchlist and geo-fence groups as first-class one-click scopes | Left | `multipage-doc.spec.js` — *the contract surfaces in a flagged-numbers watchlist sweep* | `search-2-watchlist.png` |
| Geographic questions answered by keyword guesswork | Geo-fence group scope rather than free-text guessing | Left | `search.spec.js` — *facet and group triage filters return scoped results* | `search-2-watchlist.png` |
| Cannot pivot from a mention to every appearance | Entity chips with confidence, pivoting to all appearances; date-range narrowing | Left, Center | `search.spec.js` — *entity mode with a group implies selector search; hit opens the thread* | `tour-1-thread-open.png` |
| Exported entities lose their origin | Export carries the entity provenance line | Right | `enrichment.spec.js` — *the one output: export is locked until a thread is promoted* | `day9-export-thread-gold.png` |

## Coverage

| | |
|---|---|
| Pain points traced (from `personas.md` **Frustrations today** and `empathy_maps.md` **Pains removed**) | 24 |
| Traced to a design response and a screen | 24 (100%) |
| Carrying an executable validation result | 24 (100%) |
| Carrying a built-state screenshot | 24 (100%) |
| Distinct specifications cited | 9 of the 9 Angular e2e spec files |

Every pain traces to something that runs. That is the claim this document exists to make
checkable — and the reason each row names a specification rather than a paragraph.

Two rows are approximate rather than exact matches, and are marked here rather than left
for a reader to notice: *"Volume without signal; tasking that is hard to defend"* is
evidenced by the queue-only view rather than by a test of the lanes themselves, and
*"Re-translating already-worked messages"* is evidenced by the promote-the-thread flow
rather than by a test that re-opening a worked thread skips translation. Both behaviours
exist; neither has a specification aimed squarely at it.

## Caveats, stated rather than smoothed

- **Personas are composites, not interviews.** Direct end-user access was not assumed and
  was not granted; personas derive from the Phase 2 solution demonstration and its
  evaluated workflows. Everything they assert is an inference from that material, and the
  assumptions carrying the most weight are logged in `assumption_log.md`.
- **Validation is against fabricated demonstration data.** The specifications prove the
  behaviour, not that the behaviour is right for real traffic at real volume.
- **Three rows describe behaviour that changed during performance.** The bilingual default,
  thread-level gold, and the single output path each replaced an evaluated behaviour; the
  rationale and restoration path are in the three workflow-model artifacts.
- **Not validated with the Sponsor.** Touchpoint #1 had not occurred at time of delivery.
  These are findings offered for validation, not findings the Government has accepted.
