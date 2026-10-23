#!/usr/bin/env python3
"""Phrase timings for the voice-over takes, from their pauses (no speech-to-text needed).
  python3 docs/media/production/source/vo_align.py        -> prints every phrase with its scene-local start time
Each take is split at pauses of 0.18 s or more; each pause is matched to the punctuation mark (, . : ? ;) whose
position in the text is closest to the pause's position in the audio, so phrase starts land within a word or two.
"""
import csv, pathlib, re, subprocess, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))

PROD = pathlib.Path(__file__).resolve().parents[1]
from compose_audio import VO_LEAD as LEAD  # voice starts this far into the scene, .3 s otherwise


def pauses(path, db=-36, min_len=.18):
    err = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(path), '-af', f'silencedetect=noise={db}dB:d={min_len}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                               capture_output=True, text=True).stdout)
    return list(zip(starts, ends)), dur


def phrases(scene, text):
    take = PROD / 'audio/vo' / f'{scene}.mp3'
    gaps, dur = pauses(take)
    lead_sil = gaps[0][1] if gaps and gaps[0][0] < .05 else 0.0
    tail_sil = dur - gaps[-1][0] if gaps and gaps[-1][1] >= dur - .05 else 0.0
    inner = [(a, b) for a, b in gaps if a > .05 and b < dur - .05]
    speech0, speech1 = lead_sil, dur - tail_sil
    parts = [p.strip() for p in re.split(r'(?<=[,.:?;])\s+', text) if p.strip()]
    # character position where each part after the first begins
    pos, cuts = 0, []
    for p in parts[:-1]:
        pos += len(p) + 1
        cuts.append(pos / len(text))
    # greedy: each punctuation cut takes the unused pause nearest its expected time
    used, starts = set(), [speech0]
    for c in cuts:
        expect = speech0 + c * (speech1 - speech0)
        best = min((i for i in range(len(inner)) if i not in used), key=lambda i: abs((inner[i][0] + inner[i][1]) / 2 - expect), default=None)
        if best is not None and abs((inner[best][0] + inner[best][1]) / 2 - expect) < 1.6:
            used.add(best)
            starts.append(inner[best][1])
        else:
            starts.append(expect)
    starts = sorted(starts)
    lead = LEAD.get(scene, .3)
    return [(round(lead + s, 2), p) for s, p in zip(starts, parts)], round(lead + speech1, 2)


def all_phrases():
    with open(PROD / 'script/narration-cues.csv', newline='') as f:
        rows = list(csv.DictReader(f))
    return {r['scene']: phrases(r['scene'], r['narration']) for r in rows}


if __name__ == '__main__':
    for scene, (ps, end) in all_phrases().items():
        print(f'== {scene} (voice ends {end}s)')
        for t, p in ps:
            print(f'  {t:6.2f}  {p}')
