#!/usr/bin/env python3
"""V4 compositor: builds the 4:50 film from the shot lists in compose_act*.py.
  python3 docs/media/production/source/compose.py                 -> render/medcore-v4.mp4 (picture + mix)
  python3 docs/media/production/source/compose.py --still 95.5    -> render/stills/095.50.png (one frame, for checking)
  python3 docs/media/production/source/compose.py --audio         -> re-mix the sound only and re-mux
Voice-over: audio/vo/S1.wav … S14.wav (ElevenLabs, one take per scene) are used when present; otherwise a
temporary macOS `say` read is generated into render/vo-scratch/ so the edit can be timed and reviewed.
"""
import pathlib, subprocess, sys
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from compose_lib import W, H, FPS, Chrome, Clip, ease_out
import compose_act1 as a1, compose_act3 as a3, compose_act4 as a4
from compose_shots import PROD

RENDER = PROD / 'render'
LOGOS = PROD.parent / 'assets/logos'
# Scene order. Since rev. D (2026-10-23) every scene is cut to its ElevenLabs take: starts are summed from the shots,
# and each shot inside a scene is timed to the take's phrases (see vo_align.py).
SCENE_NAMES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14']


def logos():
    badge = Image.open(LOGOS / 'MedCore_Badge_Logo.png').convert('RGBA')
    badge.thumbnail((340, 340))
    word = Image.open(LOGOS / 'MedCore_Text_logo.png').convert('RGBA')
    word.thumbnail((640, 150))
    return badge, word


def timeline():
    badge, word = logos()
    s4_desk = Chrome('desktop', 1100)
    s4_phone = Chrome('iphone', 840)
    s4 = a1.s4(badge, word, s4_desk, s4_phone,
               a3.dash_clip('dash-overview', [(15.0, 19.8, 1)]),
               Clip(PROD / 'footage/mobile/mob-bill.mp4', [(0, 2.2, .55)], size=s4_phone.screen))
    scenes = [a1.s1(), a1.s2(), a1.s3(), s4, a3.s5(), a3.s6(), a3.s7(), a3.s8(), a3.s9(), a3.s10(),
              a4.s11(), a4.s12(badge, word), a4.s13(), a4.s14(badge, word)]
    shots, starts, t = [], [], 0.0
    for name, group in zip(SCENE_NAMES, scenes):
        starts.append((name, round(t, 3)))
        for sh in group:
            sh.start = t
            shots.append(sh)
            t += sh.dur
    global SCENES, DUR
    SCENES, DUR = starts, round(t, 3)
    return shots


def frame_at(shot, prev_last, t):
    """Render one frame of `shot` at shot-local time t, sliding over the previous shot's last frame on entry."""
    layer = shot.render(t)
    if shot.enter == 'cut' or prev_last is None or t >= .42:
        return layer
    sign = -1 if shot.enter == 'left' else 1  # 'left' = enters from the left edge
    p, q = ease_out(t / .42), ease_out(t / .36)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    out.alpha_composite(prev_last, (int(-sign * q * W * .85), 0))
    out.alpha_composite(layer, (int(sign * (1 - p) * W), 0))
    return out


def render_video(path):
    shots = timeline()
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                            '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
                            '-movflags', '+faststart', str(path)], stdin=subprocess.PIPE)
    prev_last, n = None, 0
    for i, s in enumerate(shots):
        frames = round((s.start + s.dur) * FPS) - round(s.start * FPS)
        for k in range(frames):
            im = frame_at(s, prev_last, k / FPS)
            enc.stdin.write(im.convert('RGB').tobytes())
            n += 1
        prev_last = im
        print(f'\r{n / FPS:6.1f}s / {DUR}s  shot {i + 1}/{len(shots)}', end='', flush=True)
    enc.stdin.close()
    enc.wait()
    print()
    return shots


def still(sec):
    shots = timeline()
    prev_last = None
    for s in shots:
        if s.start <= sec < s.start + s.dur:
            n = int(round((sec - s.start) * FPS))
            for k in range(n + 1):  # clips decode sequentially, so step up to the frame
                im = frame_at(s, prev_last, k / FPS)
            out = RENDER / 'stills' / f'{sec:06.2f}.png'
            out.parent.mkdir(parents=True, exist_ok=True)
            im.convert('RGB').save(out)
            print(out)
            return
        prev_last = None


if __name__ == '__main__':
    RENDER.mkdir(exist_ok=True)
    if '--still' in sys.argv:
        for v in sys.argv[sys.argv.index('--still') + 1:]:
            still(float(v))
        raise SystemExit
    import compose_audio
    (RENDER / 'work').mkdir(exist_ok=True)
    picture = RENDER / 'work/picture-no-sound.mp4'  # intermediate; the film with sound is render/medcore-v4.mp4
    if '--audio' not in sys.argv:
        shots = render_video(picture)
    else:
        shots = timeline()
    mix = compose_audio.mix(shots, SCENES, DUR)
    compose_audio.mux(picture, mix, RENDER / 'medcore-v4.mp4')
