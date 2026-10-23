"""V4 shots for Act IV (S11–S14): before/after, users and market, team, traction and close."""
import json
from PIL import Image, ImageDraw, ImageOps
from compose_lib import W, H, ease_out
from compose_shots import PROD, DrawShot, ArtShot, art
from compose_act1 import slide_in, hold, card
from storyboard import text, chip, NAVY, MUTED, TEAL

MEDIA = PROD.parent
ROWS = [('"Why do I owe this much?"', 'Every peso explained, on the phone, in their language'),
        ('Portals, calls, faxes', 'One HMO roster + AI-drafted appeals'),
        ('15–20 % claims returned', 'Pre-flight audit · target under 2 %'),
        ('4–8+ hours to leave', 'Six visible stages · target under 45 min'),
        ('Cashier queue', 'Pay, sign a 0 % note, exit pass on the phone')]


def s11():
    # Take cues: "Five pain points" 0.3 · "Five fixes" 1.8 · "eight-hour wait … forty-five minutes" 3.3 · "a bill you can follow" 7.2.
    lit = {3: 3.3, 0: 7.2}  # rows that light up when the narrator says them

    def fn(layer, t):
        d = ImageDraw.Draw(layer)
        d.rectangle((0, 0, W // 2, H), fill='#0B1F38')
        text(layer, (90, 70), 'Before', 56, '#FF8A8E', True)
        text(layer, (W // 2 + 90, 70), 'After · MedCore', 56, TEAL, True)
        for i, (a, b) in enumerate(ROWS):
            y = 210 + i * 160
            if i in lit and t > lit[i]:
                q = ease_out((t - lit[i]) / .3)
                d.rounded_rectangle((W // 2 + 60, y - 22, W - 40, y + 118), 18, fill=(17, 128, 109, int(40 * q)))
            p = slide_in(t, .3 + i * .15)
            if p:
                text(layer, (90 - int(60 * (1 - p)), y), a, 38, '#FFB4B6', True, width=780)
            q = slide_in(t, 1.8 + i * .15)
            if q:
                text(layer, (W // 2 + 90 + int(60 * (1 - q)), y), b, 38, NAVY, True, width=780)

    s = DrawShot(10.5, 'white', fn)
    for i in range(5):
        s.at(.3 + i * .15, 'paper', .4).at(1.8 + i * .15, 'pop', .4)
    for t0 in lit.values():
        s.at(t0, 'chime', .4)
    return [s]


def pop(t, t0, dur=.35):
    """Back-out scale for a pop-in: 0 before t0, overshoots to about 1.1, settles at 1."""
    if t < t0:
        return 0.0
    x = min(1.0, (t - t0) / dur) - 1
    return 1 + 2.70158 * x ** 3 + 1.70158 * x ** 2


def paste_scaled(layer, im, center, scale):
    if scale <= .02:
        return
    w, h = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    layer.alpha_composite(im.resize((w, h), Image.Resampling.LANCZOS), (int(center[0] - w / 2), int(center[1] - h / 2)))


def name_tile(name, size=(260, 96)):
    """A competitor's logo from assets/logos/competitors/<name>.png, or a plain name tile until one is supplied."""
    p = MEDIA / 'assets/logos/competitors' / f'{name.lower()}.png'
    if p.exists():
        im = Image.open(p).convert('RGBA')
        im.thumbnail(size)
        return im
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), 14, fill='white', outline='#CBD5E1', width=2)
    text(im, (30, 26), name, 38, NAVY, True)
    return im


# S12 cue times (scene-local) read off the ElevenLabs take's pauses.
S12_BIZBOX, S12_MEDSYS, S12_MEDCORE = 10.25, 11.0, 13.3


def s12(logo_badge, logo_text):
    users = ['Patients & families', 'Billing & claims teams', 'Hospital leaders']
    user_at = [.3, 2.0, 3.5]
    bars = [('TAM', '₱4.564 B', '1,260 hospitals', 820), ('SAM', '₱2.738 B', '454 hospitals', 500), ('SOM', '≈ ₱1.35 B', 'First regions', 330)]
    bizbox, medsys = name_tile('Bizbox'), name_tile('Medsys')
    badge = logo_badge.copy()
    badge.thumbnail((150, 150))
    word = logo_text.copy()
    word.thumbnail((230, 60))

    def fn(layer, t):
        d = ImageDraw.Draw(layer)
        text(layer, (100, 60), 'Who it’s for, and where we fit', 56, NAVY, True)
        for i, u in enumerate(users):
            p = slide_in(t, user_at[i])
            if not p:
                continue
            x, y = 100 + i * 590, 170 + int(60 * (1 - p))
            d.rounded_rectangle((x, y, x + 550, y + 110), 22, fill='white', outline='#E2E8F0', width=2)
            text(layer, (x + 30, y + 32), u, 36, NAVY, True)
        for i, (k, v, sub, w) in enumerate(bars):
            p = ease_out((t - 4.8 - i * .3) / .8) if t > 4.8 + i * .3 else 0
            if not p:
                continue
            y = 360 + i * 120
            d.rounded_rectangle((100, y, 100 + max(60, w * p), y + 90), 16, fill=TEAL if i == 2 else '#CFE7E1')
            text(layer, (125, y + 22), f'{k}  {v}', 34, 'white' if i == 2 else NAVY, True)
            text(layer, (100 + w + 24, y + 28), sub, 28, MUTED)
        if t > 5.05:  # "starting in NCR"
            text(layer, (100, 740), 'Starting in NCR · Calabarzon · Cebu · Cagayan Valley', 32, TEAL, True)
        if t > 9.6:  # positioning quadrant
            q = ease_out((t - 9.6) / .4)
            x0, y0, x1, y1 = 1160, 330 + int(30 * (1 - q)), 1820, 880 + int(30 * (1 - q))
            d.rounded_rectangle((x0, y0, x1, y1), 22, fill='white', outline='#E2E8F0', width=2)
            mx, my = (x0 + x1) // 2, (y0 + y1) // 2
            d.line((mx, y0 + 24, mx, y1 - 24), fill='#CBD5E1', width=2)
            d.line((x0 + 24, my, x1 - 24, my), fill='#CBD5E1', width=2)
            text(layer, (x0 + 26, y0 + 18), 'Hospital systems', 22, MUTED, True)
            text(layer, (x0 + 26, y1 - 52), 'MediLink (HMO switch)', 22, MUTED)
            text(layer, (x0 + 4, y1 + 14), '↑ inpatient payer depth   → patient UX', 20, MUTED)
            paste_scaled(layer, bizbox, (x0 + 160, y0 + 120), pop(t, S12_BIZBOX))
            paste_scaled(layer, medsys, (x0 + 160, y0 + 230), pop(t, S12_MEDSYS))
            paste_scaled(layer, badge, (x1 - 165, y0 + 110), pop(t, S12_MEDCORE, .45))
            if t > S12_MEDCORE + .2:
                paste_scaled(layer, word, (x1 - 165, y0 + 215), min(1, (t - S12_MEDCORE - .2) / .3))
        if t > S12_MEDCORE + .3:
            text(layer, (100, 960), 'We don’t replace hospital systems. We make them clear.', 46, NAVY, True)

    s = DrawShot(16.5, 'solution', fn)
    for t0 in user_at:
        s.at(t0, 'pop', .6)
    for i in range(3):
        s.at(4.8 + i * .3, 'tick', .6)
    s.at(9.6, 'whoosh', .5).at(S12_BIZBOX, 'pop', .8).at(S12_MEDSYS, 'pop', .8).at(S12_MEDCORE, 'pop', 1).at(S12_MEDCORE + .05, 'chime', .5)
    return [s]


# Manifest order: three students, coach, hospital administrator, dean. Take cues: "three student developers" 0.3 ·
# "our coach" 2.5 · "our college dean" 4.0 · "a hospital administrator" 5.3.
TEAM_AT = [.3, .45, .6, 2.5, 5.3, 4.0]


def s13():
    people = json.loads((MEDIA / 'assets/team/manifest.json').read_text())
    photos = []
    for p in people:
        ph = ImageOps.fit(Image.open(MEDIA / 'assets/team' / p['file']).convert('RGBA'), (240, 280), Image.Resampling.LANCZOS, centering=(.5, .3))
        mask = Image.new('L', ph.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, ph.width - 1, ph.height - 1), 24, fill=255)
        ph.putalpha(mask)
        photos.append(ph)

    def fn(layer, t):
        text(layer, (100, 60), 'The team', 56, NAVY, True)
        for i, (p, ph) in enumerate(zip(people, photos)):
            q = slide_in(t, TEAM_AT[i])
            if not q:
                continue
            x, y = 100 + (i % 3) * 590, 180 + (i // 3) * 420 + int(40 * (1 - q))
            layer.alpha_composite(ph, (x, y))
            text(layer, (x + 265, y + 60), p['name'], 30, NAVY, True, width=300)
            text(layer, (x + 265, y + 190), p['role'], 24, TEAL, True, width=300)

    s = DrawShot(9.5, 'solution', fn)
    for t0 in TEAM_AT:
        s.at(t0, 'pop', .4)
    return [s]


def photo_card(path, width, angle):
    """A photo with a white border and soft shadow, tilted like a print on a table."""
    from PIL import ImageFilter
    im = Image.open(path).convert('RGB')
    im = im.resize((width, round(width * im.height / im.width)), Image.Resampling.LANCZOS)
    b = 14
    card_ = Image.new('RGBA', (im.width + 2 * b, im.height + 2 * b), 'white')
    card_.paste(im, (b, b))
    card_ = card_.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    pad = 40
    out = Image.new('RGBA', (card_.width + 2 * pad, card_.height + 2 * pad), (0, 0, 0, 0))
    shadow = Image.new('RGBA', card_.size, (15, 23, 42, 90))
    shadow.putalpha(card_.getchannel('A').point(lambda v: v * 90 // 255))
    out.alpha_composite(shadow, (pad + 6, pad + 14))
    out = out.filter(ImageFilter.GaussianBlur(14))
    out.alpha_composite(card_, (pad, pad))
    return out


TRACTION = PROD.parent / 'assets/traction'


def s14(logo_badge, logo_text):
    # DTI YEP "Be Your Own Boss", 19–21 May 2026: the pitch, the certificates, the team photo.
    photos = [(photo_card(TRACTION / 'yep-pitch.jpg', 560, -4), (1240, 300), .3),
              (photo_card(TRACTION / 'yep-certificates.jpg', 430, 5), (1620, 470), .55),
              (photo_card(TRACTION / 'yep-team-photo.jpg', 560, -2), (1300, 760), .8)]

    def traction(layer, t):
        d = ImageDraw.Draw(layer)
        p = slide_in(t, .2)
        text(layer, (110, 250 + int(40 * (1 - p))), 'Pitch Perfect Award', 80, NAVY, True)
        text(layer, (110, 360 + int(40 * (1 - p))), 'DTI Youth Entrepreneurship Program', 34, MUTED, True)
        text(layer, (110, 408 + int(40 * (1 - p))), 'Be Your Own Boss · May 2026', 34, MUTED, True)
        for im, (cx, cy), t0 in photos:
            sc = pop(t, t0, .4)
            if sc:
                paste_scaled(layer, im, (cx, cy + int(30 * (1 - min(1, (t - t0) / .4)))), sc)
        if t > 3.7:  # "Next: a pilot in Cagayan Valley"
            q = ease_out((t - 3.7) / .4)
            cx, cy = 140, 640 - int(60 * (1 - q))  # small pin beside the chip
            d.polygon([(cx - 22, cy - 4), (cx + 22, cy - 4), (cx, cy + 50)], fill=TEAL)
            d.ellipse((cx - 26, cy - 44, cx + 26, cy + 8), fill=TEAL)
            d.ellipse((cx - 10, cy - 28, cx + 10, cy - 8), fill='white')
            chip(layer, (190, 600), 'Next: pilot in Cagayan Valley', size=36)

    a = DrawShot(6.4, 'solution', traction)
    a.at(.2, 'chime', .4)
    for _, _, t0 in photos:
        a.at(t0, 'pop', .7)
    a.at(3.7, 'thud', .5).at(3.8, 'pop', .6)

    # Take cues: "Because when the care is done" 6.5 · "families should get to go home" 8.2 · "MedCore" 10.25 · "Clear the way" 11.3.
    def home(im):
        card(im, (70, 70), (740, 185))
        text(im, (105, 92), 'The care is done.', 52, NAVY, True)

    b = ArtShot(3.8, art('s14-going-home', 'review.png'), overlays=[
        hold(.1, home), hold(1.8, lambda im: text(im, (105, 162), 'Now families can go home.', 52, TEAL, True), rise=0)])
    b.at(0, 'whoosh', .5, .5)

    def close(layer, t):
        p = ease_out(t / .6)
        badge = logo_badge.resize((int(logo_badge.width * .7), int(logo_badge.height * .7)), Image.Resampling.LANCZOS)
        layer.alpha_composite(badge, (W // 2 - badge.width // 2, 170 + int(30 * (1 - p))))
        layer.alpha_composite(logo_text, (W // 2 - logo_text.width // 2, 470))
        if t > 1.1:  # "Clear the way for care"
            s = 'Clear the Way for Care'
            text(layer, (W // 2 - 420, 640), s, 72, NAVY, True)
            text(layer, (W // 2 - 230, 780), 'med-core1.vercel.app', 44, TEAL, True)

    c = DrawShot(3.2, 'solution', close, enter='cut')  # on "MedCore"
    c.at(0, 'impact', .7)
    return [a, b, c]
