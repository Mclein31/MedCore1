"""V4 sound mix: music bed + per-scene voice-over + shot SFX, ducked and mastered to −14 LUFS / −1 dBTP."""
import csv, re, subprocess, wave
import numpy as np
from compose_shots import PROD

SR = 48000
AUDIO = PROD / 'audio'
SCRATCH = PROD / 'render/vo-scratch'
# Seconds of picture before each take starts (default 0.3). S1 opens on the ticking clock; S4 on the logo hit.
VO_LEAD = {'S1': 1.5, 'S4': .8}
# Temporary voices until the ElevenLabs takes exist: Mara (S1–S2), then a neutral narrator.
SCRATCH_VOICE = {'S1': 'Flo (English (US))', 'S2': 'Flo (English (US))'}
NARRATOR = 'Eddy (English (US))'
SAY_FIXES = [(r'\bMedCore\b', 'Med Core'), (r'\bHMOs\b', 'H M Oz'), (r'\bHMO\b', 'H M O'), (r'\bPWD\b', 'P W D'),
             (r'\bRCM\b', 'R C M'), (r'\bIlokano\b', 'Ee-lo-kah-no'), (r'\bTatay\b', 'Tah-tie'), (r'\bDTI\b', 'D T I')]


def read_wav(path):
    """Any audio file → float32 stereo at 48 kHz (decoded by ffmpeg)."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def cues():
    with open(PROD / 'script/narration-cues.csv', newline='') as f:
        return {r['scene']: r for r in csv.DictReader(f)}


def voice(scene, seconds):
    """ElevenLabs take if present, otherwise a scratch read paced to fit the scene."""
    for ext in ('wav', 'mp3'):
        p = AUDIO / 'vo' / f'{scene}.{ext}'
        if p.exists():
            a = read_wav(p)
            if len(a) / SR > seconds:  # tighten a slightly long take, never more than 8 % so the voice stays natural
                SCRATCH.mkdir(parents=True, exist_ok=True)
                fit = SCRATCH / f'{scene}-take-fit.wav'
                rate = min(1.08, len(a) / SR / seconds)
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-af', f'atempo={rate:.4f}', str(fit)], check=True)
                a = read_wav(fit)
            return a, False
    SCRATCH.mkdir(parents=True, exist_ok=True)
    row = cues()[scene]
    line = row['narration']
    for a, b in SAY_FIXES:
        line = re.sub(a, b, line)
    wpm = min(260, max(140, int(row['words']) / max(1, seconds - 1.2) * 60 * 1.12))  # say runs ~10 % long
    out = SCRATCH / f'{scene}.aiff'
    subprocess.run(['say', '-v', SCRATCH_VOICE.get(scene, NARRATOR), '-r', str(int(wpm)), '-o', str(out), line], check=True)
    a = read_wav(out)
    if len(a) / SR > seconds:  # scratch only: squeeze an overrun into the slot
        fit = SCRATCH / f'{scene}-fit.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out), '-af', f'atempo={len(a) / SR / seconds:.4f}', str(fit)], check=True)
        a = read_wav(fit)
    return a, True


def place(mix, at, a, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(mix) or i < 0:
        return
    a = a[: len(mix) - i] * gain
    if pan:
        a = a * np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)]) * 1.41
    mix[i:i + len(a)] += a


def mix(shots, scenes, dur):
    n = int(SR * dur)
    # Rebuild the procedural bed on this timeline: drop on the MedCore logo (S4), lighter outro from S14.
    import audio_production
    starts = dict(scenes)
    bed = PROD / 'render/work/music.wav'
    audio_production.music(pain_end=starts['S4'], outro=starts['S14'], dur=dur, out=bed)
    music = read_wav(bed)[:n]
    if len(music) < n:
        music = np.vstack([music, np.zeros((n - len(music), 2), np.float32)])
    vo = np.zeros((n, 2), np.float32)
    scratch = False
    ends = [s for _, s in scenes[1:]] + [dur]
    for (name, start), end in zip(scenes, ends):
        lead = VO_LEAD.get(name, .3)
        a, temp = voice(name, end - start - lead)
        scratch |= temp
        if len(a) / SR > end - start - lead + .3:
            print(f'warning: {name} voice runs {len(a) / SR:.1f}s for a {end - start - lead:.1f}s slot')
        a = a / max(1e-6, np.abs(a).max()) * .85
        place(vo, start + lead, a)
    sfx = np.zeros((n, 2), np.float32)
    lib = {}
    for s in shots:
        for t, name, gain, pan in s.sfx:
            if name not in lib:
                lib[name] = read_wav(AUDIO / 'sfx' / f'{name}.wav')
            place(sfx, s.start + t, lib[name], gain * .55, pan)
    # Side-chain duck: −6 dB on the music wherever the voice is speaking (60 ms attack, 400 ms release).
    env = np.abs(vo).max(axis=1)
    k = int(.4 * SR)
    active = np.convolve((env > .02).astype(np.float32), np.ones(k) / k, 'same') > 0
    target = np.where(active, .5, 1.0).astype(np.float32)
    duck = np.empty_like(target)
    g = 1.0
    a_up, a_dn = 1 / (.4 * SR), 1 / (.06 * SR)
    for i in range(0, n, 480):  # 10 ms control rate
        tg = target[i]
        g += (tg - g) * min(1, (a_dn if tg < g else a_up) * 480)
        duck[i:i + 480] = g
    out = music * .5 * duck[:, None] + vo + sfx
    path = PROD / 'render/work/mix.wav'
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((np.clip(out / max(1, np.abs(out).max()), -1, 1) * 32767).astype('<i2').tobytes())
    print('mix:', path, '(scratch voice: temporary macOS read)' if scratch else '(ElevenLabs voice)')
    return path


def mux(picture, mix_wav, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(picture), '-i', str(mix_wav),
                    '-af', 'loudnorm=I=-14:TP=-1:LRA=11', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', str(out)], check=True)
    print('film:', out)
