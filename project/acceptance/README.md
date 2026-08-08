# Acceptance Package (Deliverable ⑥) — DRAFT for staff review and direction

UNCLASSIFIED — Assembled early (day 1) so the team can review before Sponsor touchpoints;
finalized at freeze (day 14).

| Artifact | File | Status |
|---|---|---|
| **Demo (primary)** | `RiverHawk_IMAX_Walkthrough_2026-08-07.mp4` (4:05, 1600×1000) | ✅ narrated — the working product end to end, with each design finding explained where it shows on screen |
| Capability-only cut | `RiverHawk_IMAX_Walkthrough_2026-08-07_capability.mp4` (3:49) | Same footage without the design derivation, for audiences who want the capability and not the reasoning |
| Slide deck | `acceptance_deck.md` | 🟡 draft — objectives, build summary, test results, open issues |
| Sprint board export | `board_export_2026-07-31.md` | ✅ point-in-time (live board = GitHub issues) |
| Burndown | `../burndown.md` | ✅ live, daily |
| Risk register | `../risk_register.md` | ✅ live |
| Test results + screenshots | `../evidence/` | ✅ current (7/7 acceptance, 26 e2e, cluster proof) |

**Design-evolution segments** (first 69 s of the primary demo). Each finding is shown,
not described: the evaluated July build runs live, then the delivered bench runs live on
the same thread. Title cards carry the reasoning so the cut reads without narration.

| Finding | Before (evaluated build) | After (delivered build) |
|---|---|---|
| The unit of output is the whole thread | Clip an entity → a fragment lands in the tray; export is a list of fragments | Confirm every message → promote → full verdicted transcript, exported as a translation product |
| No verdict without the source | Translate-in-place **replaces** the Arabic; the verdict is rendered blind | Always bilingual; the correction editor renders the source above the draft |
| A linguist's bench | Scissors on every message, three buttons per queue row, "reviewed" without doing the work | Review actions only, every decision in one strip, a button-free stack, queue-only view |

**Capability tour flow** (the Phase 2 runbook script + the HCD findings): facets →
geo-fence → watchlist → date range → 4-language search → jump-to-evidence flash →
**translate (bilingual view: source stays on screen) + verdict + correction-against-
source** → entity clip → analyst note → OCR + officer annotation → **translate thread →
gold-ready → promote to gold → stack ticks** → summary → export with THREAD GOLD and
sourced clips.

**How to give feedback:** comment on the PR that carries this package, or drop notes in
issue #13 (Day 13 — Acceptance package). Specific asks are in the deck's §5.
