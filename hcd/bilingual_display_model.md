# Workflow Model: No Verdict Without the Source (Deliverable ① HCD artifact)

UNCLASSIFIED — HCD finding and design response, recorded 31 July 2026.
Status: **adopted for the Phase 3 build (additive)**; to be validated with the Sponsor at
touchpoint #1 (Mon 3 Aug) alongside `linguist_workflow_model.md`.

## The finding

The evaluated demo's translate-in-place is a **swap**: the English replaces the original,
and an undo button brings the original back. That is the right ergonomics for a
*reader* — an exploiter who wants the thread in English. It is the wrong surface for a
*judge*. The linguist's core act in this tool is a review verdict — confirm or correct
the machine translation — and in the swap model that verdict is rendered **while the
source text is hidden**. A native speaker never signs off on a translation they cannot
see the original of; every professional translation environment (CAT tools, review
benches) shows **bitext** — source and target together — for exactly this reason.

This is the same principle family as `linguist_workflow_model.md`: translation judgment
lives in context. That artifact fixed the granularity of the *output* (the unit of gold
is the thread); this one fixes the granularity of the *view* (the unit of judgment is the
source-target pair).

**Principle: no verdict without the source.** Whenever a translation is displayed —
reading, confirming, or correcting — the original stays on screen with it.

## Persona mapping

| Persona | Swap view (as evaluated) | Bilingual view (this finding) |
|---|---|---|
| P2 Marisol (Language Officer) | Verdicts rendered blind to the source | Confirms/corrects against the source line every time |
| P3 Ken (SME exploiter) | Reads in English — fine | Unchanged: English leads, source is a quiet secondary line |
| P4 Priya (Targeting Officer) | Selector strings can differ between source and MT | Sees the original selector string alongside the English |

## Design response (additive — the evaluated swap semantics are unchanged)

1. **Translated view becomes bilingual.** When a message shows its English (machine or
   linguist version), the **original stays visible beneath it** as a quoted secondary
   line in its own script and direction. The English leads (reader ergonomics
   preserved); the source never leaves the screen (judge ergonomics gained).
2. **Correction happens against the source.** The correction editor renders with the
   original directly above the draft — the linguist edits while reading the source, not
   from memory.
3. Thread-gold transcripts already comply (`ORIG:` / `EN [verdict]:` per message) —
   this finding brings the live reading surface in line with the gold output.

New testid (addition only, no renames): `original-<messageId>` on the persistent source
line. *(As first recorded on 31 Jul this response kept the evaluated show/hide toggle;
the 1 Aug update below removed it — bilingual is the only translated view.)*

## Update (1 Aug) — translations render by default, and review state is visible

Three follow-on decisions from design review:

1. **Auto-render the baseline translation — and drop the toggle.** Machine translation
   is cheap; making the linguist click per message (or per thread) to see it was
   friction without judgment value. Threads now open in the bilingual view with the
   baseline MT already rendered, and the per-message show/hide toggle was removed
   outright: the source is always on screen, so "show original" had nothing left to
   show. **Tiered translation is the production seam**: the auto-rendered baseline is the fast tier; a premium
   frontier-LLM retranslation on demand (per message or per thread) is the documented
   cutover behavior — not mocked in the prototype, named in the developer guide's
   production-cutover note.
2. **Review state at a glance.** Each message carries a colored edge: green
   (linguist-confirmed), amber (linguist-edited), dashed grey (translated, awaiting
   review). A thread's progress toward gold-ready is scannable without reading badges.
3. **"Gold" is reserved for promotion.** There is exactly one gold action — promote the
   thread from the viewer strip. Snippet clipping remains (exploiter/targeting
   workflow) but is labeled **evidence**, with its own tray section, so the two outputs
   can't be confused.

*(Decision 3's "evidence" relabeling was superseded the same day by
`one_output_model.md`, which removed snippet clipping from the bench entirely.)*

## Contract posture

The 31 Jul source line was additive; the 1 Aug default-on + toggle-removal steps change
evaluated behavior (`translate-*` per-message controls no longer exist in the Angular
build). Logged with `one_output_model.md` as the linguist-bench deviation set: ported
specs 2/6/7 amended, 1/3/4/5 verbatim, React reference app untouched, single-commit
restoration path if the Sponsor requires strict parity.
