# Workflow Model: The Linguist's Finite Stack (Deliverable ① HCD artifact)

UNCLASSIFIED — HCD finding and design response, recorded 31 July 2026.
Status: **adopted for the Phase 3 build (additive)**; to be validated with the Sponsor at
touchpoint #1 (Mon 3 Aug).

## The finding

A Language Officer's work is a **finite stack**: a queue of threads and documents in their
languages, worked one at a time, each one *done when it's done* — fully translated and
reviewed — until the stack is clear. This is the working model of every mature translation
workflow (CAT/TMS tools are built on it), and it is how linguists describe their own day.

The Phase 2 demo already embodies half of this model: the triage queue with My-languages
scope, new/worked counts, and dispositions (reviewed / flagged / discarded) *is* the stack.
What it gets wrong is the **granularity of the output**. The Gold Copy pane collects
snippets — one message, one entity, one OCR gloss at a time. That is an *analyst's*
evidence tray (personas P3 Ken and P4 Priya, see `personas.md`), and it is the right tool
for building an intelligence product from worked material. But it is not what a linguist
produces. A linguist's gold copy is the **entire translated thread or document** — because
translation quality lives in context. A sentence translated in isolation loses referents,
register, and continuity; the same reason machine translation of a whole document beats
sentence-by-sentence translation. Clipping snippet-by-snippet strips exactly the context
that makes the linguist's judgment trustworthy.

**Principle: the unit of gold must match the unit of context.** For the linguist, that
unit is the thread.

## Persona mapping

| Persona | Unit of work | Unit of output | Served today by |
|---|---|---|---|
| P2 Marisol (Language Officer) | Thread from her stack | **Whole-thread gold copy** (full transcript, translations, her verdicts) | *Gap — closed by this amendment* |
| P3 Ken (SME exploiter) | Evidence trail across threads | Snippet clips with provenance | Gold Copy clip tray (as evaluated) |
| P4 Priya (Targeting Officer) | Selector/entity hits | Entity clips with provenance | Gold Copy clip tray (as evaluated) |
| P1 Dana (CMO) | The stack itself | Queue state (worked/unworked counts) | Triage queue + dispositions |

## Design response (additive — the evaluated clip flow is unchanged)

1. **Translate thread** — batch translate-in-place across every message in the thread
   (prototype iterates the per-message mock service; the production seam would pass
   full-thread context to the translation service, per the principle above).
2. **Thread review completion** — the thread header shows `translated n/m · reviewed n/m`;
   a thread is *gold-ready* when every message carries a linguist verdict
   (linguist-confirmed or linguist-edited).
3. **Promote thread to Gold** — one action producing a thread-level gold copy: full
   transcript (original + translation side by side), verdict badges, and a thread-level
   provenance header (thread, network, participants, date range, services, timestamps).
   Rendered in the Gold Copy pane above the clip tray; exportable through the existing
   export dialog as a full-translation product.
4. **The stack ticks down** — promoting a thread to gold marks it worked; the queue shows
   `N of M worked` progress and an explicit stack-clear done-state. "When it's done, it's
   done" becomes visible.

New testids (additions only, no renames): `thread-translate-all`, `thread-gold-ready`,
`promote-thread-gold`, `thread-gold-*`, `queue-progress`, `stack-clear`.

## Update (1 Aug) — the stack only marks work done

Design review sharpened the disposition semantics: **a linguist does not discard work
from the queue.** The stack is assigned work; the only queue-side action is *reviewed*
(worked). Flag-to-targeter and discard are thread-level judgments that require having
read the thread, so they live in the viewer's workflow strip — the same single place as
promote-to-gold. All thread decisions in one strip; the queue stays a stack. The gold
pane also slimmed (280px) — it is an output surface, not a working surface — and
collapses to a rail. Queue-side flag/discard testids moved to the strip unchanged; the
ported acceptance suite only ever used the queue's reviewed action, so smoke-5 is
untouched.

## Contract posture

The evaluated Phase 2 baseline (three panels, snippet clips, export) ships with visual
parity. This model is an HCD-driven **addition** (~1 person-day), presented to the Sponsor
at touchpoint #1 as a finding from persona work, and logged in the acceptance package. If
the Sponsor prefers strict parity, the addition is cleanly removable — it touches no
evaluated behavior.
