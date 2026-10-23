"""Building blocks for the V4 compositor: clip readers, prebuilt device chrome, easing and overlays.
Device chrome is rendered once from frames.py with a blank screen; each video frame is pasted into the hole.
"""
import subprocess
import numpy as np
from PIL import Image, ImageDraw
from frames import desktop, iphone

FPS = 30
W, H = 1920, 1080
PROD = None  # set by compose.py


def ease_out(x):
    # cubic-bezier(0.16, 1, 0.3, 1) is close to an expo-out curve
    x = min(max(x, 0.0), 1.0)
    return 1 - 2 ** (-10 * x) if x < 1 else 1.0


def ease_io(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


class Clip:
    """Sequential frame reader. segments = [(src_start, src_end, speed)], played back to back; the last frame holds."""

    def __init__(self, path, segments, size=None):
        self.path, self.segments, self.size = path, list(segments), size
        self.proc, self.last, self.queue = None, None, list(self.segments)
        probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                '-of', 'csv=p=0', str(path)], capture_output=True, text=True).stdout.split(',')
        self.src = (int(probe[0]), int(probe[1]))
        self.out = size or self.src
        self._next_segment()

    def _next_segment(self):
        if self.proc:
            self.proc.kill()
            self.proc = None
        if not self.queue:
            return
        a, b, speed = self.queue.pop(0)
        vf = f'setpts=(PTS-STARTPTS)/{speed},fps={FPS}'
        if self.size:
            vf += f',scale={self.size[0]}:{self.size[1]}:flags=bicubic'
        self.remaining = int(round((b - a) / speed * FPS))
        self.proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{a:.3f}', '-t', f'{b - a:.3f}', '-i', str(self.path),
                                      '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE,
                                     stderr=subprocess.DEVNULL)

    def frame(self):
        n = self.out[0] * self.out[1] * 3
        while self.proc:
            if self.remaining > 0:
                buf = self.proc.stdout.read(n)
                if len(buf) == n:
                    self.remaining -= 1
                    self.last = Image.frombuffer('RGB', self.out, buf)
                    return self.last
            self._next_segment()
        return self.last

    def length(self):
        return sum((b - a) / s for a, b, s in self.segments)

    def map(self, src_t):
        """Playback time of a source time, or None when that moment is trimmed out."""
        out = 0.0
        for a, b, s in self.segments:
            if a <= src_t < b:
                return out + (src_t - a) / s
            out += (b - a) / s
        return None


class Chrome:
    """A device frame built once; paste(screen) returns the framed RGBA image."""

    def __init__(self, kind, size):
        blank = Image.new('RGB', (1206, 2622) if kind == 'iphone' else (1920, 1200), (255, 0, 255))
        self.kind = kind
        self.img = iphone(blank, size) if kind == 'iphone' else desktop(blank, size)
        a = np.asarray(self.img)
        hole = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)
        ys, xs = np.nonzero(hole)
        self.box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        self.mask = Image.fromarray((hole[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255).astype(np.uint8))
        self.screen = (self.box[2] - self.box[0], self.box[3] - self.box[1])

    def paste(self, screen):
        out = self.img.copy()
        if screen.size != self.screen:
            screen = screen.resize(self.screen, Image.Resampling.BILINEAR)
        out.paste(screen, self.box[:2], self.mask)  # the Dynamic Island is outside the mask, so it stays on top
        return out


def crop_zoom(im, rect, out_size):
    """rect = (cx, cy, zoom) in source-normalized coordinates; keeps the output aspect."""
    cx, cy, z = rect
    sw, sh = im.size
    w = sw / z
    h = w * out_size[1] / out_size[0]
    if h > sh:
        h = sh / z
        w = h * out_size[0] / out_size[1]
    x0 = min(max(cx * sw - w / 2, 0), sw - w)
    y0 = min(max(cy * sh - h / 2, 0), sh - h)
    return im.resize(out_size, Image.Resampling.BILINEAR, box=(x0, y0, x0 + w, y0 + h))


def lerp_rect(a, b, p):
    return tuple(x + (y - x) * p for x, y in zip(a, b))


def touch_dot(layer, xy, age):
    """44 px translucent touch dot that presses and fades out over 0.45 s; age in seconds since the tap."""
    if not (-0.25 <= age <= 0.45):
        return
    d = ImageDraw.Draw(layer)
    x, y = xy
    if age < 0:  # arriving
        a, r = int(150 * (1 + age / .25)), 22
    else:
        a, r = int(150 * (1 - age / .45)), 22 * (0.9 if age < .06 else 1) + age * 30
    d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, a // 2), outline=(17, 128, 109, a), width=3)
