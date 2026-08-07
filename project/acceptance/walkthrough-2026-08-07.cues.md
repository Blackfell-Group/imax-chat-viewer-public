# Walkthrough cue sheet — 2026-08-07

**TDD data deliverable D6** · River Hawk Consulting, LLC · UNCLASSIFIED

Capture: `walkthrough-2026-08-07.webm` · total **04:19** · 1600×1000 @2x, silent, pace 2.6.

Real elapsed timings from the capture, not the nominal ones in
`narration_script.md`. Narration is cut to these.

| At | Id | Segment | On screen |
|---|---|---|---|
| 00:00 | `01_opening` | 1 | Opening — workspace and the UNCLASS banner |
| 00:19 | `02_bilingual` | 2b | Arabic thread opens bilingual, source stays on screen |
| 00:32 | `03_correction` | 2b | Correction written against the source; verdict badge changes |
| 00:45 | `04_bench` | 2c | Find tools collapse to leave the stack |
| 00:53 | `05_disposition` | 2c | Disposition from the viewer strip, where the thread was read |
| 01:05 | `06_facet` | 3a | Facet narrows the queue by what a thread contains |
| 01:23 | `07_search` | 3a | Native-script query across four languages |
| 01:32 | `08_evidence` | 3a | Hit lands on the evidence and flashes |
| 01:41 | `09_stream` | 3b | Windowed stream; sort order is reversible |
| 02:00 | `10_enrichment` | 3b | Thread-level enrichment and the on-demand summary |
| 02:15 | `11_document` | 3c | Five-page Arabic customs declaration |
| 02:24 | `12_maximize` | 3c | Maximize — a scan you cannot read is a scan you cannot exploit |
| 02:37 | `13_paging` | 3c | Page through the manifest; zoom the table |
| 02:55 | `14_tagging` | 3c | Officer's triage mark becomes a searchable facet |
| 03:06 | `15_promote` | 3d | Review the thread through and promote it to gold |
| 03:25 | `16_export` | 3d | Export the full verdicted transcript; copy confirms |
| 03:48 | `17_close` | 4 | Close |

## Mux the narration

```sh
ffmpeg -i walkthrough-2026-08-07.webm -i narration-2026-08-07.mp3 \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  RiverHawk_IMAX_Walkthrough_2026-08-07.mp4
```

A capability-only cut drops segment 2 (the design findings) for audiences
that do not need the derivation.
