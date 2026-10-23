#!/usr/bin/env python3
"""V4 audio: synthesized SFX library + an original 120 BPM music bed (no licensing risk).
  python3 audio_production.py --sfx     -> audio/sfx/*.wav
  python3 audio_production.py --music   -> audio/music-bed.wav (297.5 s: tense pain half, driving solution half)
Swap the bed for a licensed track if preferred; keep the same 120 BPM grid so the slides land on the beat.
"""
import pathlib, sys, wave
import numpy as np

OUT = pathlib.Path(__file__).resolve().parents[1] / 'audio'
SR = 48000
rng = np.random.default_rng(7)


def write(path, a):
    if a.ndim == 1:
        a = np.repeat(a[:, None], 2, axis=1)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((np.clip(a, -1, 1) * 32767).astype('<i2').tobytes())


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env(x, attack=0.002, decay=0.05):
    return (1 - np.exp(-x / attack)) * np.exp(-x / decay)


def lowpass(a, k):
    return np.convolve(a, np.ones(k) / k, mode='same')


def sfx():
    lib = {}
    x = t(0.05); lib['click'] = (lowpass(rng.normal(0, 1, len(x)), 3) * env(x, .0005, .006) + np.sin(2 * np.pi * 2400 * x) * env(x, .0003, .004)) * .6
    x = t(0.05); lib['tap'] = np.sin(2 * np.pi * 1800 * x) * env(x, .0005, .008) * .45
    x = t(0.45); sweep = lowpass(rng.normal(0, 1, len(x)), 6) * np.sin(np.pi * x / x[-1]) ** 2
    lib['whoosh'] = sweep * (0.25 + 0.75 * x / x[-1]) * .35
    x = t(0.12); f = 900 * np.exp(-x * 18) + 500; lib['pop'] = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(x, .001, .03) * .5
    x = t(0.25); lib['thud'] = (np.sin(2 * np.pi * 70 * x) * env(x, .002, .08) + lowpass(rng.normal(0, 1, len(x)), 30) * env(x, .001, .02) * .4) * .8
    x = t(0.08); lib['tick'] = (np.sin(2 * np.pi * 1250 * x) + .5 * np.sin(2 * np.pi * 2900 * x)) * env(x, .0004, .012) * .4
    x = t(0.9)
    lib['chime'] = (np.sin(2 * np.pi * 1318.5 * x) * env(x, .002, .35) + np.where(x > .09, np.sin(2 * np.pi * 1975.5 * (x - .09)) * env(np.maximum(x - .09, 0), .002, .4), 0)) * .3
    x = t(1.2); shimmer = sum(np.sin(2 * np.pi * f0 * x) * env(x, .003, .5) for f0 in (2093, 2637, 3136, 4186)) / 4
    lib['cash'] = (shimmer + np.sin(2 * np.pi * 1046.5 * x) * env(x, .002, .25)) * .35
    x = t(3.0); lib['riser'] = lowpass(rng.normal(0, 1, len(x)), 4) * (x / x[-1]) ** 2.5 * .4
    x = t(1.5); lib['impact'] = (np.sin(2 * np.pi * 45 * x) * env(x, .002, .45) + lowpass(rng.normal(0, 1, len(x)), 12) * env(x, .001, .06) * .6) * .9
    x = t(0.3); lib['paper'] = lowpass(rng.normal(0, 1, len(x)), 2) * np.sin(np.pi * x / x[-1]) * .15
    x = t(0.25); lib['stamp'] = lib['thud'][:len(x)] * .8 + lowpass(rng.normal(0, 1, len(x)), 3) * env(x, .001, .015) * .3
    x = t(1.6); ring = np.sin(2 * np.pi * 440 * x) * np.sin(2 * np.pi * 480 * x) * (np.sin(2 * np.pi * 20 * x) > 0)
    lib['phone'] = ring * np.where(x < 1.0, 1, 0) * .25
    for name, a in lib.items():
        write(OUT / 'sfx' / f'{name}.wav', a)
    print('SFX:', ', '.join(sorted(lib)))


BPM, DUR = 120, 297.5   # film length, rev. C
BEAT = 60 / BPM
PAIN_END = 74          # S1–S3 tense half-time; riser 71–74; drop on the logo at 74 s (01:14)
OUTRO = 284.5          # S14: lighter arrangement, resolve at the end


def music(pain_end=None, outro=None, dur=None, out=None):
    """pain_end/outro/dur default to the constants above; compose_audio.py passes the film's real timeline."""
    PAIN_END = pain_end or globals()['PAIN_END']
    OUTRO = outro or globals()['OUTRO']
    DUR = dur or globals()['DUR']
    n = int(SR * DUR)
    mix = np.zeros((n, 2))

    def add(at, a, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= n:
            return
        a = a[: n - i] * gain
        mix[i:i + len(a), 0] += a * np.sqrt((1 - pan) / 2) * 1.41
        mix[i:i + len(a), 1] += a * np.sqrt((1 + pan) / 2) * 1.41

    def tone(freq, dur, attack=.005, decay=.3, harm=(1, .3, .1)):
        x = t(dur)
        return sum(h * np.sin(2 * np.pi * freq * (k + 1) * x) for k, h in enumerate(harm)) * env(x, attack, decay)

    def midi(m):
        return 440 * 2 ** ((m - 69) / 12)

    kick = (lambda x: np.sin(2 * np.pi * np.cumsum(150 * np.exp(-x * 30) + 45) / SR) * env(x, .001, .18))(t(.4))
    clap = lowpass(rng.normal(0, 1, int(.15 * SR)), 2) * env(t(.15), .001, .04)
    hat = (lambda a: a - lowpass(a, 4))(rng.normal(0, 1, int(.05 * SR))) * env(t(.05), .0005, .012)
    minor = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]     # Am F G Em (pain)
    major = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]     # C G Am F (solution)
    hook = [72, 76, 79, 76, 74, 72, 74, 76]                                 # plucked eighth-note motif

    bar = 4 * BEAT
    # Pain bars run on a grid from 0:00; solution bars restart on the drop so the groove lands on the logo hit.
    times = [b * bar for b in range(int(PAIN_END / bar) + 1)] + [PAIN_END + k * bar for k in range(int((DUR - PAIN_END) / bar) + 1)]
    for b, at in enumerate(times):
        if at >= DUR:
            break
        if at < PAIN_END - 3:                       # --- pain: sub pulse, ticking hats, muted stabs
            ch = minor[b % 4]
            add(at, tone(midi(ch[0] - 24), bar, .02, 1.2, (1, .2)), .22)
            for k in range(8):
                add(at + k * BEAT / 2, hat, .05 if k % 2 else .08)
            if b % 2 == 0:
                for m in ch:
                    add(at + 2 * BEAT, tone(midi(m), .5, .004, .12), .05)
            continue
        if at < PAIN_END:                           # riser bars are handled below
            continue
        ch = major[b % 4]
        light = at >= OUTRO
        for k in range(4):                          # four-on-the-floor + claps on 2 and 4
            if not light or k == 0:
                add(at + k * BEAT, kick, .55)
            if k in (1, 3):
                add(at + k * BEAT, clap, .18 if not light else .1)
            add(at + k * BEAT + BEAT / 2, hat, .07)
        bass = tone(midi(ch[0] - 24), BEAT * .9, .005, .25, (1, .5, .2))
        for k in range(8):                          # off-beat side-chained bass
            add(at + k * BEAT / 2 + .02, bass[: int(BEAT / 2 * SR)], .28 if k % 2 else .16)
        for m in ch:                                # pad, ducked by the kick
            pad = tone(midi(m), bar, .08, 3, (1, .25, .08))
            pump = 0.45 + 0.55 * np.minimum(1, ((t(bar) % BEAT) / (BEAT * .6)))
            add(at, pad * pump, .045, (m - 64) / 20)
        if not light or b % 2 == 0:
            for k, m in enumerate(hook):            # plucked hook
                add(at + k * BEAT / 2, tone(midi(m + (0 if b % 8 < 4 else 2)), .35, .002, .09, (1, .4, .2, .1)), .07, .25 if k % 2 else -.25)

    x = t(3)                                        # riser into the drop + impact on the logo
    add(PAIN_END - 3, lowpass(rng.normal(0, 1, len(x)), 4) * (x / 3) ** 2.5, .18)
    for k in range(12):
        add(PAIN_END - 3 + k * 0.25 * (1 - k / 30), clap, .05 + k * .01)
    add(PAIN_END, (lambda x: np.sin(2 * np.pi * 45 * x) * env(x, .002, .5))(t(1.5)), .6)
    for m in (60, 67, 72, 76):                      # final resolve chord
        add(DUR - 4, tone(midi(m), 4, .01, 1.6), .06)

    mix[:SR] *= np.linspace(0, 1, SR)[:, None]
    mix[-2 * SR:] *= np.linspace(1, 0, 2 * SR)[:, None]
    mix *= 0.6 / max(1e-9, np.abs(mix).max())
    write(out or OUT / 'music-bed.wav', mix)
    print(f'Music bed: {DUR} s at {BPM} BPM, drop at {PAIN_END} s')


if __name__ == '__main__':
    if '--sfx' in sys.argv:
        sfx()
    if '--music' in sys.argv:
        music()
