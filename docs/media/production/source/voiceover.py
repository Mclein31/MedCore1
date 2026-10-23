#!/usr/bin/env python3
  python3 docs/media/production/source/voiceover.py S1 S10      # named scenes
  python3 docs/media/production/source/voiceover.py --all        # every scene without a take yet
  python3 docs/media/production/source/voiceover.py --redo S5    # replace an existing take (costs credits again)
Each take costs about one credit per character on eleven_multilingual_v2; the script prints the cost before generating.
Reads ELEVENLABS_API_KEY from the repo .env.
"""
import csv, json, pathlib, ssl, subprocess, sys, urllib.request

PROD = pathlib.Path(__file__).resolve().parents[1]
ROOT = PROD.parents[2]
OUT = PROD / 'audio/vo'
MODEL = 'eleven_multilingual_v2'
# Mara tells S1–S2 (Tala, Filipino-American, warm); the narrator takes over from S3 (Neil, calm, neutral Filipino accent).
# Both are library voices: the API needs a paid plan for them, so on the free plan the takes are made in the website
# (script/ELEVENLABS_TAKES.md) and saved into audio/vo/ by hand.
MARA, NARRATOR = 'Hybl6rg76ZOcgqZqN5WN', 'iW5UKo8wEfpqHg3Xw3i3'
VOICE = {'S1': MARA, 'S2': MARA}
SETTINGS = {'stability': .5, 'similarity_boost': .75, 'style': 0, 'use_speaker_boost': True}
CTX = ssl.create_default_context(cafile='/etc/ssl/cert.pem')


def key():
    for line in (ROOT / '.env').read_text().splitlines():
        if line.startswith('ELEVENLABS_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('ELEVENLABS_API_KEY missing from .env')


def scenes():
    with open(PROD / 'script/narration-cues.csv', newline='') as f:
        return list(csv.DictReader(f))


def credits_left(k):
    d = json.load(urllib.request.urlopen(req, context=CTX))
    return d['character_limit'] - d['character_count']


def generate(k, rows, i):
    r = rows[i]
    body = {'text': r['narration'], 'model_id': MODEL, 'voice_settings': SETTINGS,
            # Neighbouring lines from the same voice keep the intonation continuous across scene cuts.
            'previous_text': rows[i - 1]['narration'] if i and VOICE.get(rows[i - 1]['scene'], NARRATOR) == VOICE.get(r['scene'], NARRATOR) else None,
            'next_text': rows[i + 1]['narration'] if i + 1 < len(rows) and VOICE.get(rows[i + 1]['scene'], NARRATOR) == VOICE.get(r['scene'], NARRATOR) else None}
    req = urllib.request.Request(url, json.dumps(body).encode(), {'xi-api-key': k, 'Content-Type': 'application/json'})
    out = OUT / f"{r['scene']}.mp3"
    out.write_bytes(urllib.request.urlopen(req, timeout=300, context=CTX).read())
    secs = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)],
                                capture_output=True, text=True).stdout)
    slot = float(r['seconds']) - (.5 if r['scene'] in ('S1', 'S4') else .3)
    flag = '' if secs <= slot else f'  ← over by {secs - slot:.1f}s'
    print(f"{r['scene']}: {secs:.1f}s for a {slot:.1f}s slot{flag}")


if __name__ == '__main__':
    args = sys.argv[1:]
    redo = '--redo' in args
    rows = scenes()
    want = [r['scene'] for r in rows] if '--all' in args else [a for a in args if not a.startswith('--')]
    todo = [i for i, r in enumerate(rows) if r['scene'] in want and (redo or not (OUT / f"{r['scene']}.mp3").exists())]
    if not todo:
        sys.exit('nothing to generate (use --redo to replace a take)')
    k = key()
    cost = sum(len(rows[i]['narration']) for i in todo)
    left = credits_left(k)
    print(f"{len(todo)} take(s), ≈{cost} credits; {left} left")
    if cost > left:
        sys.exit('not enough credits')
    OUT.mkdir(parents=True, exist_ok=True)
    for i in todo:
        generate(k, rows, i)
