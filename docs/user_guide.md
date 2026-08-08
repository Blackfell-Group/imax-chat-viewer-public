# User Guide — IMAX Triage Workspace (the Linguist's Bench)

UNCLASSIFIED — Deliverable ④. **This application is a linguist's bench**
(`../hcd/one_output_model.md`): you work a finite stack of threads and documents in your
languages, judge every translation against its source, and produce one thing — the gold
copy of the whole thread. Screens referenced here have live captures in
`../project/evidence/screens/`. All data is fabricated demonstration content, marked by
the banner on every screen.

## The bench at a glance

**Search & Triage** (left): your stack — the queue, scoped to *My languages*, sorted
oldest-first, with the `N of M worked` progress bar — plus corpus-wide search when you
need to find something. The rows carry no buttons: a thread leaves your stack when you
finish it, not when you tick a box. The magnifier in the panel header hides the search
and filter tools entirely when you just want to work the queue — hiding them also clears
any active search, so you always land back on your own stack.
**Chat Log Viewer** (center): the reading and judging surface. **Gold Copy** (right, slim,
collapsible): your finished output. One workflow strip above the thread carries every
thread-level action.

Both side panels **resize**: drag the strip on the edge each one faces the centre across,
or use the arrow keys once it has focus. Double-click it to go back to the default width.
A wide manifest or a long thread can have the room it needs. Widths last for the session —
this application stores nothing between reloads, deliberately, so a refresh puts everything
back where it started.

## Working the stack — the core loop

1. **Open a thread.** It arrives ready: every foreign message is already translated and
   shown **bilingually** — English leads, the original stays beneath it in its own
   script and direction — always. There is no show/hide toggle: you never judge blind,
   and you never click to see a translation.
2. **Judge each message.** **✓ confirm** the machine translation or **✎ correct** it —
   the editor shows the source directly above your draft. The message's edge shows its
   state at a glance: green = confirmed, rose = your correction, dashed = still waiting
   on you. The meter in the strip counts you toward **GOLD-READY**.

   **A verdict can be taken back.** Click ✓ again on a message you have confirmed and it
   returns to the machine translation — a mis-click is not a decision you are stuck with.
   Clearing a *correction* discards what you wrote, so that one asks first.
3. **Add notes where the machine can't.** Code words, source correlation, context — the
   note displays under the message and travels into the gold transcript as a
   `NOTE [analyst]:` line.
4. **Promote to gold.** When every foreign message carries your verdict, *Promote to
   gold* produces the thread's gold copy — the full transcript, original and English
   side by side with verdicts and notes — in the right pane, and marks the thread
   worked. Your stack ticks down; the queue tells you when it's clear.
5. **Export** renders your finished gold copies as full-translation products, each line
   traceable. **Copying confirms itself** — if the clipboard is unavailable the workspace
   says so and offers to select the text instead, rather than failing silently.

**Reading order.** The stream is sorted oldest-first and the header toggles it to newest-
first. Order is decided here rather than taken from the feed, because collection does not
guarantee chronological delivery. A promoted gold copy is always chronological whichever way
you were reading — a record read backwards misleads whoever receives it.

**Long threads.** The stream renders only what is on screen, so a thread of any length opens
and scrolls at the same speed.

**Ordering your gold copies.** Drag the handle on any promoted thread to reorder the tray.
The export follows that order, so when a product draws on several threads the sequence is
yours to decide.

## The workflow strip — every thread decision in one place

- **Flag for targeter** — hand the thread to targeting without leaving your loop.
- **Discard** — a deliberate decision made *after reading*, from here, never from the
  queue (the stack is assigned work).
- **Extract entities** — one time, for the whole thread: names, places, numbers, and
  passports light up as colored chips on each message. Spotting aids, not buttons.
- **Translate *N* remaining** — the button counts the messages still missing a
  translation and re-runs the baseline batch for exactly those (e.g. late arrivals). A
  premium frontier-model retranslation is planned at the production cutover.
- **Promote to gold** — the one gold action, locked until the meter reads GOLD-READY.

## Documents

Threads with a paperclip carry an embedded file; document-lane items *are* files. The
OCR viewer shows the scan beside the extracted text — multi-page documents page both
panes together — with a whole-document English gloss.

**Make it big enough to read.** The viewer maximizes to nearly the full screen, resizes from
its bottom-right corner, and the divider between scan and text drags across. Zoom offers
fit, actual size and 200%, and a zoomed scan pans inside its pane. A dense form — the
five-page Arabic customs declaration in the corpus is the example — is meant to be read at
size, not squinted at.

The **officer annotation** strip is yours: quick tags (`priority`, `identity-doc`,
`matches-open-case`, `follow-up`) or free-text tags, plus a document note. Type a new tag
and press **Add** — or Enter, or simply click away; all three commit it. **A tag you coin is
offered on every document afterwards**, lit when it applies to the one in front of you,
because the whole point of a tag is gathering documents under it. Tags loop back into
Search & Triage as the **Officer tags** facet and filter your queue to threads carrying that
mark (a saved view — worked items stay visible under it).

## Finding things

Type two characters and the search sweeps every message in the corpus, any language,
*including the English translations* of foreign originals (`matched in EN translation`
badge). Entity mode hunts names/numbers/passports; geo-fence and watchlist **groups**
are one-click scopes; facets narrow to messages carrying a signal; the date range
composes with everything. **Flagged** appears with a count once you have handed anything to
targeting, and isolates that pile — a handoff you cannot find again is a handoff you have
lost. *Flagged first* in the sort list lifts them without hiding the rest. Click a hit and the thread opens scrolled to the evidence,
flashed so you don't lose it. **Summarize** gives you an on-demand thread gist that
collapses back out of the way.

## For supervisors

The queue header answers the morning question: `Queue · N new · M worked`, the progress
bar, content-type lanes with corpus counts, and untranslated-first sort. Review edges
make any thread's progress readable over a shoulder. Downstream roles consume the
bench's outputs — flagged threads (targeting) and exported gold copies (production) —
rather than working inside it.
