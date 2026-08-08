# Workflow Model: A Linguist's Bench, One Output (Deliverable ① HCD artifact)

UNCLASSIFIED — HCD finding and design response, recorded 1 August 2026.
Status: **adopted for the Phase 3 build**; on the touchpoint-#1 agenda (Mon 3 Aug) with
the two 31 July findings. This artifact supersedes the "evidence clips" terminology in
the 1 Aug updates of `linguist_workflow_model.md`.

## The finding

The evaluated demo was a multi-role console: linguist review, analyst evidence-clipping,
and targeting sweeps sharing one screen, with clip scissors on every message and two
competing output paths (snippet tray vs. promoted thread). Design review asked a simple
question — *"what does clip-to-evidence do?"* — and the honest answer exposed the
problem: the workspace's primary user could not tell, because it wasn't for them.

**This application is a linguist's bench.** The linguist works a finite stack, judges
translations against the source, and produces exactly one thing: the **gold copy of the
whole thread** — full transcript, verdicts, analyst notes. Everything else that other
roles need is a *downstream consumption* of that output or of the linguist's hand-offs:

| Downstream need | Served by |
|---|---|
| Targeting follow-up | **Flag for targeter** (thread strip) + entity chips as spotting aids |
| Product building (exploiter) | **Gold copy export** — full verdicted transcripts with NOTE lines |
| Supervision (CMO) | Queue counts, N-of-M progress, review edges |

## Design response

1. **Evidence clips removed.** No scissors anywhere; the gold pane holds promoted thread
   gold only; export renders full translations. Analyst notes survive — they annotate
   the translation and travel into the gold transcript as `NOTE [analyst]:` lines.
2. **Enrichment is thread-level, once.** Entity extraction joins translate-thread in the
   workflow strip: one action for the whole thread (the same context principle — the
   unit of enrichment is the unit of work). Chips render on messages as display-only
   spotting aids.
3. **The stack has no buttons.** Queue rows carry no actions at all. A queue-side
   "mark reviewed" let a linguist declare work done *without doing it* — the thread
   wasn't translated, judged, or promoted. **Done means promoted to gold**, or a
   deliberate flag/discard taken in the viewer strip after reading. Rows still show
   state (reviewed / flagged badges, strikethrough on discarded); they just don't
   accept decisions.
4. **Sort options match a work queue.** *Untranslated first* died with auto-translation
   (everything arrives translated). The queue now defaults to **Oldest first** — a
   stack is worked in arrival order — with *Most recent* and *Message count* as
   alternates.
5. **Find tools collapse; the stack stays.** The panel separates *stack controls*
   (My languages, sort — properties of the queue) from *find tools* (search, content/
   entity modes, content-type lanes, date range, facets, geo-fence/watchlist groups,
   officer tags — discovery). One toggle in the panel header hides the find tools,
   leaving a queue-only bench: the stack goes from five visible rows to fourteen.
   Hiding also clears any active query, facet, group, or tag filter — "hide search"
   always returns the linguist to their own stack, never to a filtered subset.
   Default is expanded (search remains a first-class capability, and the ported
   search acceptance flows run untouched); the collapsed state is one click away.
   **This is also the preview surface** if Sponsor feedback directs removing corpus
   search from the linguist build: the queue-only view *is* that product, so the trim
   can be evaluated before it is committed to.
6. Combined with the prior findings, the bench now reads in one sentence: *open a thread
   from your stack; it arrives translated and bilingual; judge every message against the
   source; promote to gold; the stack ticks down.*

## Contract posture (logged deviation #2)

This removes evaluated behavior (snippet clip → tray → product export), a larger step
than the additive findings. Logged accordingly:
- The React reference app is untouched and retains the full evaluated clip flow.
- Ported acceptance specs 2, 5, 6, and 7 are amended: clip/export beats removed and
  smoke-5's queue-side disposition beat replaced by the real bench path (review the
  thread → promote → the stack ticks); review / entity / annotation / tag-facet /
  scope / content-type beats retained. Specs 1, 3, 4 remain verbatim.
- Restoration path if the Sponsor requires strict parity: the clip layer was removed in
  a single commit and reverts cleanly.
- Sponsor validation: touchpoint #1 presents the bench model with the parity fallback
  explicit.
