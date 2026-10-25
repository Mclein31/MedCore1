#!/usr/bin/env python3
"""Derive narration.txt and narration-cues.csv from script/MEDCORE_SCRIPT_V4.md (the single source of truth).
Run after every script edit: python3 docs/media/production/source/build_narration.py
"""
import csv, pathlib, re
SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'script'
md = (SCRIPT / 'MEDCORE_SCRIPT_V4.md').read_text()
scenes = re.findall(r'^### (S\d+) · (.+?) · (\d\d:\d\d(?:\.\d)?)–(\d\d:\d\d(?:\.\d)?) \(([\d.]+) s\)(.*?)(?=^### |\Z)', md, re.S | re.M)
rows, txt = [], [
    'MEDCORE — CLEAR THE WAY FOR CARE — Narration V4 (4:30)',
    'Read only the quoted lines. Scene headings are not spoken. Say "MedCore" as "Med Core", "HMO" as "H M O", '
    '"PWD" as "P W D", "CF4" as "C F four", "RA 9439" as "R A ninety-four thirty-nine". Ilokano = ee-lo-KAH-no.',
    'Tone: S1–S3 quiet, close and personal; from S4 brighter and confident, never salesy.', '']
for sid, title, start, end, dur, body in scenes:
    m = re.search(r'\*\*VO:\*\* "(.+?)"\s*$', body, re.M)
    vo = m.group(1) if m else ''
    words = len(vo.split())
    rows.append(dict(scene=sid, title=title, start=start, end=end, seconds=dur, words=words,
                     words_per_second=round(words / float(dur), 2), narration=vo))
    txt += [f'{sid} — {title} | {start}–{end} | {dur} s', f'"{vo}"', '']
with open(SCRIPT / 'narration-cues.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
(SCRIPT / 'narration.txt').write_text('\n'.join(txt))
total = round(sum(float(r['seconds']) for r in rows), 1)
assert total == 270.0, total
dense = [r['scene'] for r in rows if r['words_per_second'] > 2.7]
print(f"{len(rows)} scenes, {total} s, {sum(r['words'] for r in rows)} words" + (f'; too dense: {dense}' if dense else ''))
