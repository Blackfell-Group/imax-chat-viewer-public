#!/usr/bin/env bash
#
# Build the narrated walkthrough (TDD deliverable D6).
#
#   node scripts/capture-walkthrough.js   # silent capture + cue timings
#   ./scripts/build-walkthrough.sh        # + narration -> narrated mp4
#
# THE NARRATION OWNS THE TIMELINE. Each scene's clip is cut from the silent
# capture at its cue boundary, then held or trimmed to the length of its
# narration — so the voice is never racing the picture or waiting on it. A
# scene that was captured too short holds on its final frame rather than
# ending early; one captured too long is cut. That means the capture only has
# to be roughly right, which is what makes re-recording cheap.
#
# Adapted from the OpenLake showcase pipeline, which had already solved this.
#
# THE VOICE. With ELEVENLABS_API_KEY set, narration comes from ElevenLabs.
# Without it the build falls back to macOS `say`, so a checkout with no
# credential still produces a complete cut — it just sounds synthetic. That
# fallback is NOT the shipping voice; anything delivered is built with the key.
#
#   export ELEVENLABS_API_KEY=...
#   export ELEVENLABS_VOICE_ID=...   # run with it unset to list the account's voices
#
# Synthesis is billed per character. audio/<id>.<voice>.mp3 is reused unless
# narration.json is newer, so a video-only rebuild does not re-bill the script.
# The voice id is IN THE FILENAME on purpose: keying the cache only on
# narration.json would mean swapping voices hits the cache and silently ships
# the previous voice while reporting success.
set -euo pipefail
cd "$(dirname "$0")/.."

ACC="project/acceptance"
DATE="${CAPTURE_DATE:-$(ls "$ACC" | sed -n 's/^walkthrough-\(.*\)\.cues\.json$/\1/p' | sort | tail -1)}"
[ -n "$DATE" ] || { echo "no walkthrough-*.cues.json in $ACC — run capture-walkthrough.js first" >&2; exit 1; }

CUES="$ACC/walkthrough-$DATE.cues.json"
# One recording. There was a second "capability" cut — the same footage narrated
# without the design derivation — and it was ours, not the agreement's: TDD 6.2
# and D6 ask for A recorded walkthrough, singular. Two files meant two things to
# review, two to keep in step, and a reader having to work out which one to
# watch. Removed 8 Aug.
NARRATION="$ACC/narration.json"
SILENT="$ACC/RiverHawk_IMAX_Walkthrough_${DATE}_silent.mp4"
OUTPUT="$ACC/RiverHawk_IMAX_Walkthrough_${DATE}.mp4"
WORK="$ACC/.build-$DATE"
AUDIO="$ACC/.audio"

for f in "$CUES" "$NARRATION"; do
  [ -f "$f" ] || { echo "missing $f" >&2; exit 1; }
done
command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }

# capture-walkthrough.js writes .webm (that is what Playwright records); every
# step below seeks into the silent source frame-accurately, which webm does not
# do reliably. The transcode used to be a hand-run ffmpeg nobody wrote down, so
# `capture && build` — the two lines in this file's own header — could not
# actually run from a clean tree once the intermediate was cleaned up. Do it
# here, and keep the result as a cache so a rebuild skips it.
WEBM="$ACC/walkthrough-$DATE.webm"
if [ ! -f "$SILENT" ]; then
  [ -f "$WEBM" ] || { echo "missing both $SILENT and $WEBM — run capture-walkthrough.js" >&2; exit 1; }
  echo "==> transcoding capture to a seekable silent master"
  # -g 30 puts a keyframe every second so the per-scene cuts land where asked.
  ffmpeg -y -v error -i "$WEBM" \
    -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -g 30 -an "$SILENT"
fi

mkdir -p "$WORK" "$AUDIO"
EL_MODEL="${ELEVENLABS_MODEL:-eleven_multilingual_v2}"
LEAD_MS="${LEAD_MS:-350}"     # breath before the voice starts
TAIL_S="${TAIL_S:-0.55}"      # and after it stops

# Every narration id must exist in the cue sheet and vice versa. Catching a
# mismatch here beats discovering a silent scene in the finished cut.
python3 - "$CUES" "$NARRATION" <<'PY'
import json, sys
cues = json.load(open(sys.argv[1]))['cues']
narr = json.load(open(sys.argv[2]))
cue_ids = [c['id'] for c in cues]
nar_ids = [n['id'] for n in narr]
missing = [i for i in cue_ids if i not in nar_ids]
extra   = [i for i in nar_ids if i not in cue_ids]
if missing: sys.exit(f"cue ids with no narration: {missing}")
if extra:   sys.exit(f"narration ids not in the capture: {extra}")
print(f"  {len(cue_ids)} scenes, cue sheet and narration agree")
PY

if [ -n "${ELEVENLABS_API_KEY:-}" ] && [ -z "${ELEVENLABS_VOICE_ID:-}" ]; then
  echo "ELEVENLABS_VOICE_ID is not set. Voices on this account:" >&2
  curl -sS -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices \
    | python3 -c "
import json,sys
for v in json.load(sys.stdin).get('voices', []):
    print(f\"  {v['voice_id']}  {v['name']:<24} {v.get('labels',{}).get('description','')}\")" >&2
  exit 1
fi

VOICE="${ELEVENLABS_VOICE_ID:-macos-say}"
ids=$(python3 -c "
import json; [print(n['id']) for n in json.load(open('$NARRATION'))]")

# 1) Narration -> padded per-scene wav. These durations ARE the timeline.
echo "==> narration"
: > "$WORK/durations.txt"
for id in $ids; do
  text=$(python3 -c "
import json,sys
segs={n['id']:n['text'] for n in json.load(open('$NARRATION'))}
sys.stdout.write(segs['$id'])")

  if [ -n "${ELEVENLABS_API_KEY:-}" ]; then
    src="$AUDIO/$id.full.$VOICE.mp3"
    # VALIDATE THE CACHE, not just fresh responses. A call interrupted partway
    # — a dropped connection, or the account's quota running out mid-script —
    # leaves a truncated or error-body file behind under the name of a good
    # one. Checking only new downloads means that file is trusted forever and
    # every later build fails on it, or worse, ships a mute scene. Anything
    # cached that is not decodable audio is discarded and re-fetched.
    if [ -f "$src" ] && ! ffprobe -v error -select_streams a:0 \
         -show_entries stream=codec_type -of csv=p=0 "$src" 2>/dev/null | grep -q audio; then
      echo "  discarding unusable cached audio for $id" >&2
      rm -f "$src"
    fi
    if [ ! -f "$src" ] || [ "$NARRATION" -nt "$src" ]; then
      python3 -c "
import json,sys
print(json.dumps({'text': sys.argv[1], 'model_id': sys.argv[2],
                  'voice_settings': {'stability': 0.45, 'similarity_boost': 0.75,
                                     'style': 0.0, 'use_speaker_boost': True}}))" \
        "$text" "$EL_MODEL" > "$WORK/$id.req.json"
      curl -sS --fail-with-body -X POST \
        "https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}" \
        -H "xi-api-key: $ELEVENLABS_API_KEY" \
        -H "Content-Type: application/json" \
        --data @"$WORK/$id.req.json" -o "$src"
      rm -f "$WORK/$id.req.json"
      # A failed call still writes a file — the API returns a small JSON error
      # body, which ffmpeg would either reject or turn into silence. A build
      # that "succeeds" with a mute scene is the worst outcome, so prove it is
      # audio before going on.
      if ! ffprobe -v error -select_streams a:0 -show_entries stream=codec_type \
           -of csv=p=0 "$src" 2>/dev/null | grep -q audio; then
        echo "ElevenLabs returned no audio for $id:" >&2
        head -c 400 "$src" >&2; echo >&2
        rm -f "$src"; exit 1
      fi
      echo "  synthesized $id"
    else
      echo "  cached      $id"
    fi
  else
    src="$AUDIO/$id.full.say.aiff"
    [ -f "$src" ] && [ "$NARRATION" -ot "$src" ] || say -v "${SAY_VOICE:-Zoe (Premium)}" -o "$src" "$text"
    echo "  say         $id"
  fi

  ffmpeg -y -v error -i "$src" \
    -af "adelay=${LEAD_MS}|${LEAD_MS},apad=pad_dur=${TAIL_S}" \
    -ar 48000 -ac 2 "$WORK/$id.wav"
  printf '%s %s\n' "$id" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/$id.wav")" \
    >> "$WORK/durations.txt"
done

# Publish the measured durations. capture-walkthrough.js reads these and paces
# each scene to its narration, so the next capture needs almost no padding —
# which is the difference between a shot that breathes and one that freezes.
python3 -c "
import json,sys
rows=[l.split() for l in open('$WORK/durations.txt') if l.strip()]
json.dump({r[0]: float(r[1]) for r in rows}, open('$ACC/narration-durations.json','w'), indent=2)
print('  wrote narration-durations.json')"

# 2) Cut the silent capture at cue boundaries, then hold or trim each scene to
#    its narration length.
echo "==> picture"
python3 - "$CUES" "$WORK/durations.txt" "$SILENT" "$WORK" <<'PY'
import json, subprocess, sys, os
cues_path, durs_path, silent, work = sys.argv[1:5]
data = json.load(open(cues_path))
cues = data['cues']
total = data['totalMs'] / 1000.0
durs = {l.split()[0]: float(l.split()[1]) for l in open(durs_path) if l.strip()}

for i, c in enumerate(cues):
    start = c['at'] / 1000.0
    end = cues[i + 1]['at'] / 1000.0 if i + 1 < len(cues) else total
    want = durs[c['id']]
    out = os.path.join(work, f"{c['id']}.mp4")
    # tpad clones the final frame so a scene captured SHORTER than its
    # narration holds there instead of ending early; trim cuts one that ran
    # long. Either way the scene comes out exactly `want` seconds.
    # BOTH seeks are INPUT options, before -i. As an output option, -t
    # truncates the result AFTER the filter graph — which cut every padded
    # clip straight back to its capture length and silently undid the tpad.
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error',
        '-ss', f'{start:.3f}', '-t', f'{max(end - start, 0.1):.3f}',
        '-i', silent,
        '-an',
        '-vf', (f'fps=30,tpad=stop_mode=clone:stop_duration={want:.3f},'
                f'trim=duration={want:.3f},setpts=PTS-STARTPTS,format=yuv420p'),
        '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', out,
    ], check=True)
    # Trust nothing: measure what came out. A clip that is not its narration's
    # length desynchronises everything after it, and the failure is silent.
    got = float(subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
    flag = '' if abs(got - want) < 0.15 else f'  <-- MISMATCH (got {got:.1f}s)'
    print(f"  {c['id']:<14} capture {end-start:5.1f}s -> narration {want:5.1f}s{flag}")
    if flag:
        sys.exit(f"clip {c['id']} is {got:.2f}s but its narration is {want:.2f}s")
PY

# 3) Concatenate picture and voice.
echo "==> mux"
: > "$WORK/vlist.txt"; : > "$WORK/alist.txt"
for id in $ids; do
  echo "file '$id.mp4'" >> "$WORK/vlist.txt"
  echo "file '$id.wav'" >> "$WORK/alist.txt"
done
ffmpeg -y -v error -f concat -safe 0 -i "$WORK/vlist.txt" -c copy "$WORK/video.mp4"
ffmpeg -y -v error -f concat -safe 0 -i "$WORK/alist.txt" -c copy "$WORK/voice.wav"
ffmpeg -y -v error -i "$WORK/video.mp4" -i "$WORK/voice.wav" \
  -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "$OUTPUT"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT")
# Prove the delivered file actually carries a voice. A silent "narrated" cut is
# the failure this whole script exists to avoid.
ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "$OUTPUT" \
  | grep -q audio || { echo "ERROR: no audio stream in $OUTPUT" >&2; exit 1; }

printf '\n  %s\n  %.0f seconds · voice: %s\n' "$OUTPUT" "$DUR" "$VOICE"
[ -z "${ELEVENLABS_API_KEY:-}" ] && \
  echo "  NOTE: built with the macOS fallback voice — not the shipping voice." >&2
rm -rf "$WORK"
