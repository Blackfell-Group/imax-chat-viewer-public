# Walkthrough narration script and capture plan

**TDD data deliverable D6** · Agreement No. 5600002690012
River Hawk Consulting, LLC · UNCLASSIFIED

The delivered walkthrough is a recorded demonstration of the working product. This document
is the script it is narrated from and the shot list it is captured against, so the recording
can be reproduced rather than re-improvised.

> **Written 7 August 2026 to make an existing claim true.** `DELIVERY.md` and the acceptance
> deck both stated that the script and capture pipeline were in the repository. They were
> not. The claim is now accurate.

**Build it in two commands.** The narration text lives in `narration.json`, keyed by the
same scene ids the capture emits:

```sh
npm run dev:ng                          # in another terminal
node scripts/capture-walkthrough.js     # silent capture + cue timings
./scripts/build-walkthrough.sh          # + narration -> narrated mp4
```

**The narration owns the timeline.** Each scene is cut from the silent capture at its cue
boundary and then *held or trimmed to the length of its narration* — a scene captured too
short holds on its final frame rather than ending early, one captured too long is cut. So
the capture only has to be roughly right, which is what makes re-recording cheap. Adapted
from the OpenLake showcase pipeline, which had already solved this.

**The voice** is ElevenLabs when `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are set.
Without them the build falls back to macOS `say` so a checkout with no credential still
produces a complete cut — **that fallback is not the shipping voice**, and the build says so
on the way out. Synthesis is billed per character and cached per voice, so a video-only
rebuild does not re-bill the script.

**The capture paces itself to the narration.** `build-walkthrough.sh` writes
`narration-durations.json` after synthesis, and the next capture holds each scene for as
long as its narration runs. Fifteen of seventeen scenes then land exactly on their voice, so
padding handles almost nothing — before this, a scene whose narration outran its action
froze on its last frame for up to twenty-four seconds. Two scenes still run long and are
trimmed, which cuts real footage rather than freezing it.

A first capture on a clean checkout has no durations to read and runs at its natural length;
build, then capture again, and it converges.

Length: **4:51** with Brian. Brian is *slower* than the macOS fallback, not faster — 249
seconds against 221 — so the fallback under-predicts the shipping length. Shorten by editing
`narration.json`; the picture follows on the next capture.

Every timing below is nominal — the cue sheet carries the real ones.

---

## Structure

| Segment | Nominal | Purpose |
|---|---|---|
| 1. Opening | 0:00–0:15 | What this is, and that everything on screen is fabricated |
| 2. Design findings, before and after | 0:15–1:20 | The three HCD findings shown as changes, not asserted |
| 3. The working product, end to end | 1:20–2:40 | The full mission loop in one pass |
| 4. Close | 2:40–2:55 | What is proven, what is not |

Segment 2 exists because a design change discovered by the audience reads as a deviation,
while a design change shown with its reasoning reads as work. The evaluated build and the
delivered build run the same thread side by side.

---

## Segment 1 — Opening · 0:00–0:15

**Shot.** Application loads, three-panel workspace, banner visible.

> IMAX is a triage workspace for linguists and targeting officers working multi-language
> intercepted communications. Everything you are about to see is fabricated demonstration
> data — every name, number and document. The banner across the top says so on every screen,
> and it is there because a screenshot of this application should never be mistaken for
> intelligence.

---

## Segment 2 — Design findings · 0:15–1:20

### 2a. The unit of gold is the thread · 0:15–0:38

**Shot.** Split screen. Left: evaluated build, clipping a snippet into the tray. Right:
delivered build, gold-ready meter filling as messages are reviewed, then promote-to-gold.

> Human-centred design work during performance changed three things, and this is the one
> that matters most. What you evaluated produced clipped fragments. Working through the
> personas, a linguist's product is not a fragment — it is the whole translated, reviewed
> thread, because the fragment loses the context that makes it mean anything.
>
> So the workspace tracks the thread. The meter fills as each message is translated and
> given a verdict, and only a fully reviewed thread can be promoted. One output, one place.
>
> This removes behaviour you evaluated. The original implementation is retained in the
> repository unmodified, and the removal reverts in a single commit if strict parity is
> preferred.

### 2b. No verdict without the source · 0:38–1:00

**Shot.** Arabic thread opening already bilingual. Correction typed against the original,
verdict badge changing to linguist-edited.

> Second finding. A linguist cannot certify a translation they cannot see the source of.
> Threads open bilingual — English leads, the original stays on screen, and the direction is
> correct for right-to-left script. There is no toggle, because a toggle invites judging a
> translation with the source hidden.
>
> Corrections are written against the source, and the verdict travels with the text into
> everything downstream.

### 2c. A linguist's bench · 1:00–1:20

**Shot.** Queue with find tools collapsed. Disposition from the viewer strip. Stack ticking
down.

> Third. This is a bench, not a dashboard. The queue offers one decision — is this worked —
> and the flag and discard actions live in the viewer, where the officer has actually read
> the thread. The find tools collapse away entirely, so what remains is the stack.

---

## Segment 3 — The working product · 1:20–2:40

### 3a. Triage and search · 1:20–1:42

**Shot.** Working-language scope. Facet filter. Native-script query. Cross-language hit.
Jump to the message, which flashes.

> The queue is scoped to the languages this linguist works. Facets narrow by what a thread
> contains — selectors, passports, people, geography, documents. Search runs across four
> languages in native script and across the translation layer, and a hit lands on the
> evidence itself rather than the top of a thread.

### 3b. Reading and enrichment · 1:42–2:05

**Shot.** Long thread scrolling smoothly. Sort toggle. Entity chips. Summary widget.

> The stream is windowed, so thread length does not cost anything — this is measured against
> a two-thousand-message thread and stays inside a two-hundred-millisecond interaction
> budget. Order is chronological by default and reversible, because collection feeds do not
> arrive in order.
>
> Enrichment runs once for the whole thread: translation, entity extraction, and an
> on-demand summary.

### 3c. Documents · 2:05–2:25

**Shot.** Five-page Arabic customs declaration. Maximize. Page through. Zoom the manifest
table. Tag it. Tag reappears on a second document.

> Documents share the same surface. This is a five-page customs declaration — right-to-left,
> tabular, stamped and signed. The viewer opens to full screen and zooms, because a scan you
> cannot read is a scan you cannot exploit. Extracted text sits beside it with an English
> gloss of the whole document.
>
> The officer's own triage marks become a searchable facet, and a tag coined on one document
> is available on the next.

### 3d. The output · 2:25–2:40

**Shot.** Promote to gold. Reorder in the tray. Export. Copy confirmation.

> Reviewed threads are promoted to the gold copy, ordered by the officer, and exported as
> full verdicted transcripts — every message with its original, its English, who certified
> it, and any note attached along the way. Provenance travels with all of it.

---

## Segment 4 — Close · 2:40–2:55

**Shot.** Deployment manifests, then CI green.

> Six containers: the application and five single-responsibility enrichment services behind
> frozen contracts, so production cutover is a configuration change one service at a time.
> Every push rebuilds the images, scans them, deploys them to a cluster and smokes them.
>
> It has also been deployed and run in the target environment, with that evidence held high
> side. The enrichment services run on fixtures by default and take a live model gateway by
> configuration; pointing them at the one inside the enclave is the step still ahead, and
> every pod says at startup which mode it is in.

---

## Production notes

- **Capture silent.** Narration is muxed afterwards, so a re-record does not require
  re-driving the application.
- **1600×1000, 2× device scale.** Text has to survive a projector.
- **Deliver one recording.** TDD 6.2 and D6 ask for *a* recorded walkthrough, singular. A
  second "capability-only" cut without segment 2 was built and then withdrawn on 8 August:
  it was ours rather than the agreement's, and two files meant two things to review, two to
  keep in step, and a reader having to work out which one to watch.
- **Say what is not proven.** The close is not optional; a demonstration that omits its own
  limits invites the audience to find them.
- **Re-record when the interface changes.** The twelve defects closed on 7 August are all
  visible on screen, which is why the earlier recording was superseded rather than patched.
