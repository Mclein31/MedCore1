"""Shot types for the V4 compositor. A shot owns its own full-frame layer; compose.py slides layers between shots.
Text drawing, chips and pain cards come from storyboard.py so the film and the storyboard share one look.
"""
import pathlib
from PIL import Image, ImageOps
from compose_lib import W, H, Chrome, Clip, crop_zoom, ease_out, ease_io, lerp_rect, touch_dot
from storyboard import text, chip, pain_card, NAVY, MUTED, BG, CREAM

PROD = pathlib.Path(__file__).resolve().parents[1]
BGS = {'pain': '#0B1F38', 'solution': BG, 'story': CREAM, 'black': '#05080F', 'white': '#FFFFFF'}


class Overlay:
    """A static drawing that rises 24 px and fades in over 280 ms at t0, and fades out over 200 ms at t1."""

    def __init__(self, t0, t1, fn, rise=24):
        self.t0, self.t1, self.fn, self.rise, self.img = t0, t1, fn, rise, None

    def draw(self, layer, t):
        if not (self.t0 <= t < self.t1):
            return
        if self.img is None:
            full = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            self.fn(full)
            box = full.getbbox() or (0, 0, 1, 1)
            self.img, self.at = full.crop(box), box[:2]
        p = ease_out((t - self.t0) / .28)
        a = min(p, min(1, (self.t1 - t) / .2))
        im = self.img
        if a < 1:
            im = im.copy()
            im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
        layer.alpha_composite(im, (self.at[0], int(self.at[1] + self.rise * (1 - p))))


def caption(t0, t1, s, xy=(90, 40), size=44, color=NAVY, width=1700):
    return Overlay(t0, t1, lambda im: text(im, xy, s, size, color, True, width=width))


def proof(t0, t1, s):
    return Overlay(t0, t1, lambda im: chip(im, (90, 990), '✔ ' + s, size=28), rise=0)


def tag(t0, t1, s, xy, fill=NAVY, size=28):
    return Overlay(t0, t1, lambda im: chip(im, xy, s, fill=fill, size=size))


class Shot:
    def __init__(self, dur, mood='solution', overlays=(), enter='right'):
        self.dur, self.mood, self.overlays, self.enter = dur, mood, list(overlays), enter
        self.sfx = []

    def at(self, t, name, gain=1.0, pan=0.0):
        """Queue a sound effect at shot-local time t; compose.py mixes it."""
        self.sfx.append((t, name, gain, pan))
        return self

    def base(self, layer, t):
        pass

    def render(self, t):
        layer = Image.new('RGBA', (W, H), BGS[self.mood])
        self.base(layer, t)
        for o in self.overlays:
            o.draw(layer, t)
        return layer


class DrawShot(Shot):
    """A motion-graphics shot: fn(layer, t) draws everything on top of the mood background."""

    def __init__(self, dur, mood, fn, overlays=(), enter='right'):
        super().__init__(dur, mood, overlays, enter)
        self.fn = fn

    def base(self, layer, t):
        self.fn(layer, t)


def art(name, fallback, centering=(.5, .45), zoom=1.0):
    """Character art, or a crop of an existing image until the new illustration exists."""
    p = PROD / 'characters' / f'{name}.png'
    if p.exists():
        return ImageOps.fit(Image.open(p).convert('RGB'), (W + 80, H + 45), Image.Resampling.LANCZOS)
    src = Image.open(PROD / 'characters' / fallback).convert('RGB')
    if zoom > 1:
        w, h = src.width / zoom, src.height / zoom
        cx, cy = centering[0] * src.width, centering[1] * src.height
        x0, y0 = min(max(cx - w / 2, 0), src.width - w), min(max(cy - h / 2, 0), src.height - h)
        src = src.crop((int(x0), int(y0), int(x0 + w), int(y0 + h)))
    return ImageOps.fit(src, (W + 80, H + 45), Image.Resampling.LANCZOS)


class ArtShot(Shot):
    """Illustration with a slow 1.04x push-in and an optional navy dim (pain mood)."""

    def __init__(self, dur, img, dim=0, overlays=(), enter='right', push=1.04):
        super().__init__(dur, 'story', overlays, enter)
        self.img, self.dim, self.push = img, dim, push

    def base(self, layer, t):
        z = 1 + (self.push - 1) * ease_io(t / self.dur)
        layer.paste(crop_zoom(self.img, (.5, .5, z), (W, H)))
        if self.dim:
            layer.alpha_composite(Image.new('RGBA', (W, H), (11, 31, 56, self.dim)))


class DesktopShot(Shot):
    """A dashboard clip in the desktop frame. keys = [(t, (cx, cy, zoom))] camera moves inside the screen (eased)."""
    chrome = None

    def __init__(self, dur, clip, keys=((0, (.5, .5, 1)),), overlays=(), enter='left', clicks=()):
        super().__init__(dur, 'solution', overlays, enter)
        if DesktopShot.chrome is None:
            DesktopShot.chrome = Chrome('desktop', 1400)
        self.clip, self.keys = clip, list(keys)
        self.pos = ((W - self.chrome.img.width) // 2, 62)
        for c in clicks:  # source-clip click times from clicks.json
            t = clip.map(c)
            if t is not None and t < dur:
                self.at(t, 'click', .8)

    def base(self, layer, t):
        frame = self.clip.frame()
        cam = self.keys[0][1]
        for k0, k1 in zip(self.keys, self.keys[1:]):
            if t >= k1[0]:
                cam = k1[1]
            elif t >= k1[0] - 1.2:
                cam = lerp_rect(k0[1], k1[1], ease_io((t - (k1[0] - 1.2)) / 1.2))
                break
            else:
                cam = k0[1]
                break
        screen = crop_zoom(frame, cam, self.chrome.screen)
        layer.alpha_composite(self.chrome.paste(screen), self.pos)


_PHONE = []


def phone_chrome():
    if not _PHONE:
        _PHONE.append(Chrome('iphone', 1000))
    return _PHONE[0]


class PhoneShot(Shot):
    """An iPhone clip on the right with a headline on the left. taps = [(t, (nx, ny))] in screen-normalized coords."""

    def __init__(self, dur, clip, title='', sub='', taps=(), overlays=(), enter='right'):
        super().__init__(dur, 'solution', overlays, enter)
        self.chrome = phone_chrome()
        # taps are given in source-clip seconds and mapped onto playback time
        self.clip = clip
        self.taps = [(clip.map(tt), xy) for tt, xy in taps if clip.map(tt) is not None]
        for tt, _ in self.taps:
            self.at(tt, 'tap', .9, .4)
        self.pos = (1180, 30)
        hdr = []
        if title:
            hdr.append(Overlay(0.15, dur, lambda im: text(im, (140, 300), title, 72, NAVY, True, width=900)))
        if sub:
            hdr.append(Overlay(0.3, dur, lambda im: text(im, (144, 520), sub, 34, MUTED, width=860)))
        self.overlays = hdr + self.overlays

    def base(self, layer, t):
        dev = self.chrome.paste(self.clip.frame())
        bx, by = self.chrome.box[:2]
        sw, sh = self.chrome.screen
        for tt, (nx, ny) in self.taps:
            touch_dot(dev, (bx + nx * sw, by + ny * sh), t - tt)
        layer.alpha_composite(dev, self.pos)


def pain_overlay(n, quote, stat):
    return Overlay(0, 99, lambda im: pain_card(im, n, quote, stat, x=570, y=330), rise=0)


def phone_clip(name, segments):
    return Clip(PROD / 'footage/mobile' / f'{name}.mp4', segments, size=phone_chrome().screen)


def dash_clip(name, segments):
    return Clip(PROD / 'footage/dashboard' / f'{name}.mp4', segments)
