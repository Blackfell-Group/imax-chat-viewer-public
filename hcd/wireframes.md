# Annotated Wireframes — IMAX Chat-Viewer (Deliverable ① HCD artifacts)

UNCLASSIFIED — Annotated from the evaluated Phase 2 demo screens (see
`../demo-state.png` for the captured reference state). Each annotation names the persona
it serves (P1–P4, `personas.md`). The thread-gold additions from
`linguist_workflow_model.md` are marked **[NEW — 31 Jul amendment]**.

## Overall layout — three panels, independent collapse

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ☰ IMAX · Triage Workspace   [UNCLASSIFIED — DEMONSTRATION DATA (FABRICATED)] │  ← banner: yellow,
├────────────────┬─────────────────────────────────────┬───────────────────────┤    center, always on
│ SEARCH &       │  CHAT LOG VIEWER                    │  GOLD COPY            │
│ TRIAGE     ‹   │                                     │              ›        │
│ (312px)        │  (flex)                             │  (320px)              │
│                │                                     │                       │
│ collapse → 40px│  empty state until thread selected  │  collapse → 40px rail │
│ rail, expand   │                                     │  rail keeps clip-count│
│ via nav-expand │                                     │  badge (goldcopy-     │
│                │                                     │  expand)              │
└────────────────┴─────────────────────────────────────┴───────────────────────┘
```
*Collapse serves P2/P3 focus modes: a linguist reading RTL text collapses both side
panels; an exploiter building product keeps Gold Copy pinned open.*

## Left panel — Search & Triage (P1 Dana, P2 Marisol, P4 Priya)

```
┌────────────────────────────┐
│ SEARCH & TRIAGE    Clear ‹ │
│ My languages: [ar][fa][zh] │ ← P2: sticky scope, "which of these are mine"
│ ┌────────────────────────┐ │
│ │ 🔍 query    [dir=auto] │ │ ← RTL-safe input
│ └────────────────────────┘ │
│ mode: (content|entity)     │ ← P3 content sweeps / P4 entity+selector hunts
│ types: msg○ trans○ doc○    │
│ facets: geo(12) person(9)  │ ← P1: corpus triage signal on every chip
│         passport(2) img(4) │
│ groups: ▸Libya Coast       │ ← P4: geo-fence / watchlist = one-click scope
│         ▸Priority Handles  │
│ dates: [from]–[to]         │
├────────────────────────────┤
│ QUEUE  (queue|all)  12/40  │ ← [NEW] N-of-M worked progress; stack-clear
│ ████████░░░░░░░░  worked   │   done-state when the stack empties
│ ✔ t-1001 Harbor Freight 📎 │ ← dispositions (✔ ⚑ ✖) = the stack's done marks;
│ ⚑ t-1002 Caravan Route     │   📎 = embedded doc cue
│   t-1003 Warehouse Manifest│
└────────────────────────────┘
```

## Center panel — Chat Log Viewer (P2 Marisol, P3 Ken)

```
┌──────────────────────────────────────────────┐
│ Harbor Freight Coordination   GreenWire · 9  │
│ translated 6/9 · reviewed 4/9   [Translate   │ ← [NEW] gold-ready meter +
│                                  thread]     │   batch translate (context-
│ ┌──────────────────────────────────────────┐ │   preserving unit of work)
│ │ saqr_92 · ar · 08:14              [RTL]  │ │
│ │ وصلت الشحنة إلى الميناء صباح اليوم…      │ │ ← RTL/mixed-script correct
│ │ 🌐 The shipment arrived at the port…     │ │ ← translate-in-place
│ │ [✓ confirm] [✎ correct]  ✔ linguist-     │ │ ← P2: verdict travels with
│ │                            confirmed     │ │   the text into clips/gold
│ │ entities: [Abu Karim·person]             │ │ ← P4: chips, palette colors
│ │ 📝 note · 📎 bill_of_lading.png → OCR    │ │ ← P3: attachment → OCR dialog
│ │                              [clip ▸]    │ │ ← P3: snippet clip w/ prov.
│ └──────────────────────────────────────────┘ │
│ [∑ Summarize]  scroll-to-hit + 1.8s flash    │
└──────────────────────────────────────────────┘
```

## Right panel — Gold Copy (P3 Ken, P4 Priya; thread gold: P2 Marisol)

```
┌────────────────────────────┐
│ GOLD COPY               ›  │
│ ┌────────────────────────┐ │
│ │ ▸ THREAD GOLD [NEW]    │ │ ← whole-thread unit: full transcript,
│ │  t-1001 9/9 tr · 9/9 rv│ │   original+translation, verdict badges,
│ │  [Promote to gold]     │ │   thread-level provenance header.
│ └────────────────────────┘ │   Promotion ticks the stack (queue 13/40)
│ CLIPS (as evaluated)       │
│ ┌────────────────────────┐ │
│ │ [ENTITY: person]       │ │ ← P3/P4 evidence tray, snippet-level
│ │ Abu Karim              │ │
│ │ thread t-1001 / msg m-3│ │ ← provenance line under every clip —
│ │ @harbor_ops / via mock │ │   traceability without bookkeeping
│ └────────────────────────┘ │
│ [Export ▸]  (disabled when │ ← standardized product template render,
│             tray is empty) │   copy to clipboard
└────────────────────────────┘
```

## Annotation index (wireframe → requirement)

| Annotation | Persona | Source |
|---|---|---|
| My-languages scope, dispositions, queue counts | P1, P2 | Evaluated demo |
| Queue N-of-M progress + stack-clear | P1, P2 | **[NEW]** `linguist_workflow_model.md` |
| Content/entity modes, facets, groups, dates | P3, P4 | Evaluated demo |
| Translate-in-place + review verdicts | P2 | Evaluated demo |
| Translate-thread + gold-ready meter | P2 | **[NEW]** `linguist_workflow_model.md` |
| Snippet clips + provenance + export | P3, P4 | Evaluated demo |
| Thread gold promotion + full-transcript export | P2 | **[NEW]** `linguist_workflow_model.md` |
| RTL/mixed-script rendering | P2, P3 | Evaluated demo |
| OCR dialog + officer annotation loop-back | P3 | Evaluated demo |
