"""V4 shots for Act I (S1–S3, the pain) and S4 (the MedCore reveal). Times are scene-local; see script/MEDCORE_SCRIPT_V4.md."""
import math
from PIL import Image, ImageDraw
from compose_lib import W, H, ease_out, ease_io
from compose_shots import Overlay, DrawShot, ArtShot, caption, tag, art, crop_zoom
from storyboard import text, chip, run_len, NAVY, MUTED, TEAL, RED


def slide_in(t, t0, dur=.42):
    """0 → 1 progress of a 420 ms expo-out entrance starting at t0."""
    return ease_out((t - t0) / dur) if t >= t0 else 0.0


def clock(layer, cx, cy, r, minutes, alpha=255, color=(255, 255, 255)):
    """Plain wall clock with no numerals; minutes since midnight sets the hands."""
    d = ImageDraw.Draw(layer)
    c = color + (alpha,)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=c, width=max(4, r // 22))
    for k in range(12):
        a = k * math.pi / 6
        d.line((cx + math.sin(a) * r * .82, cy - math.cos(a) * r * .82, cx + math.sin(a) * r * .92, cy - math.cos(a) * r * .92), fill=c, width=4)

    def hand(frac, length, width, fill):
        a = frac * 2 * math.pi
        d.line((cx, cy, cx + math.sin(a) * r * length, cy - math.cos(a) * r * length), fill=fill, width=width)

    hand((minutes % 720) / 720, .5, max(6, r // 16), c)
    hand((minutes % 60) / 60, .75, max(4, r // 24), c)
    hand((minutes * 60 % 60) / 60, .85, 3, (229, 72, 77, alpha))
    d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=c)


def card(im, xy, size, fill=(255, 253, 247, 240)):
    ImageDraw.Draw(im).rounded_rectangle((xy[0], xy[1], xy[0] + size[0], xy[1] + size[1]), 24, fill=fill)


def hold(t0, fn, rise=24):
    """Overlay that stays to the end of its shot."""
    return Overlay(t0, 999, fn, rise)


# ---------------- S1 · Cold open (10 s, cut to the take: voice enters at 1.5 s) ----------------
# Centre of the wall clock in s1-ready-bed.png (1333, 118 at 1672×941) after art()'s fit and the 1.04× push.
WALL_CLOCK = (1554, 120)


def s1():
    bed = art('s1-ready-bed', 'waiting.png', (.72, .5), 1.5)
    window = art('s1-window', 'question.png', (.6, .55), 1.35)
    START = 8 * 60 + 2

    def black_clock(layer, t):
        clock(layer, W // 2, H // 2, 230, START + int(t) / 60, int(255 * min(1, t / 1.2)))

    a = DrawShot(1.5, 'black', black_clock, enter='cut')
    for k in range(2):
        a.at(k, 'tick', .9)

    b = ArtShot(3, bed, dim=30, overlays=[tag(.3, 9, 'Discharge order · 8:02 AM', (110, 120), fill=NAVY, size=34)])
    b.at(0, 'whoosh', .8, .5).at(.3, 'pop', .6)
    for k in range(3):
        b.at(k + .5, 'tick', .5)

    def timelapse(layer, t):
        p = ease_io(t / 1.1)
        m = START + p * (16 * 60 + 12 - START)
        layer.paste(crop_zoom(bed, (.5, .5, 1.04), (W, H)))
        # Spin the wall clock painted in s1-ready-bed.png: paint over its hands, then draw moving ones in place.
        cx, cy = WALL_CLOCK
        ImageDraw.Draw(layer).ellipse((cx - 98, cy - 98, cx + 98, cy + 98), fill=(237, 223, 209))
        clock(layer, cx, cy, 101, m, color=(28, 30, 36))
        layer.alpha_composite(Image.new('RGBA', (W, H), (190, 110, 40, int(70 * p))))  # afternoon light
        layer.alpha_composite(Image.new('RGBA', (W, H), (11, 31, 56, 90)))
        h, mm = int(m // 60), int(m % 60)
        s = f'{(h - 1) % 12 + 1}:{mm:02d} {"AM" if h < 12 else "PM"}'
        chip(layer, (110, 120), 'Discharge order · 8:02 AM', fill=NAVY, size=34)
        text(layer, (110, 230), s, 120, 'white' if p < 1 else '#FF8A8E', True)

    c = DrawShot(1.2, 'pain', timelapse, enter='cut')  # "At four in the afternoon"
    c.at(0, 'whoosh', .7)
    for k in range(8):
        c.at(k * .14, 'tick', .35 + k * .05)

    d = ArtShot(1.25, window, dim=120, enter='cut',  # "we were still waiting"
                overlays=[caption(.1, 9, 'Still waiting.', (110, 140), 96, 'white'),
                          tag(.05, 9, '4:12 PM', (110, 300), fill='#E5484D', size=34)])

    def title(layer, t):
        p = ease_out(t / .3)
        text(layer, (160, 360 + int(30 * (1 - p))), 'The care was done.', 104, 'white', True)
        if t > 1.1:  # "For the bill"
            q = ease_out((t - 1.1) / .3)
            text(layer, (160, 510 + int(30 * (1 - q))), "The bill wasn't.", 104, '#FF8A8E', True)

    e = DrawShot(3.05, 'pain', title, enter='cut')  # "Not for care. For the bill."
    e.at(0, 'impact', .8).at(1.1, 'paper', 1)
    return [a, b, c, d, e]


# ---------------- S2 · The family story (26.5 s) ----------------
def left_panel(im, w=860):
    """Cream wash on the left third so titles read over the art."""
    g = Image.linear_gradient('L').rotate(-90).resize((w, H))  # opaque left, clear right
    im.alpha_composite(Image.merge('RGBA', [Image.new('L', (w, H), c) for c in (255, 249, 237)] + [g.point(lambda v: int(v * .92))]), (0, 0))


def s2():
    def quoted(im):
        card(im, (110, 420), (520, 190))
        text(im, (145, 445), 'Quoted bill', 30, MUTED)
        text(im, (145, 500), '₱36,500', 76, NAVY, True)

    # Cues are the S2 take's phrases (vo_align.py): PhilHealth 0.3, HMO 3.9, ₱36,500 7.5, ₱8,300 12.0, review 15.8, coverage 21.1.
    f = ArtShot(10.3, art('waiting', 'waiting.png'), overlays=[
        hold(.5, lambda im: chip(im, (110, 160), 'PhilHealth · 39 years', fill=NAVY, size=34)),
        hold(3.9, lambda im: chip(im, (110, 260), 'Private HMO', fill=NAVY, size=34)),
        hold(7.4, quoted, rise=60)])
    f.at(0, 'whoosh', .8, .5).at(.5, 'pop', .7).at(3.9, 'pop', .7).at(7.4, 'paper', 1)

    def share(im):
        card(im, (110, 110), (640, 230))
        text(im, (150, 135), '"Your share"', 34, MUTED)
        text(im, (148, 190), '₱8,300', 100, RED, True)

    g = ArtShot(3.7, art('question', 'question.png'), overlays=[hold(1.75, share, rise=0)])
    g.at(0, 'whoosh', .7, .5).at(1.75, 'stamp', 1)

    ask = Overlay(-1, 999, lambda im: chip(im, (110, 960), 'Ask. Wait. Ask again.', fill=NAVY, size=34), rise=0)
    montage = [
        (art('s2-lina-overload', 'question.png', (.8, .5), 2.0), 'phone'),
        (art('calc', 'question.png', (.6, .8), 2.4), 'tick'),
        (art('forms', 'review.png', (.82, .82), 2.4), 'paper'),
        (art('mara-ask', 'question.png', (.42, .42), 2.0), 'paper'),
    ]
    shots = [f, g]
    for k, (img, fx) in enumerate(montage):
        m = ArtShot(.9, img, dim=20, overlays=[ask] if k else [hold(0, lambda im: chip(im, (110, 960), 'Ask. Wait. Ask again.', fill=NAVY, size=34), rise=0)])
        m.at(0, 'whoosh', .5, .5)
        if fx == 'tick':
            for j in range(5):
                m.at(.2 + j * .09, 'click', .5)
        else:
            m.at(.15, fx, .8)
        shots.append(m)

    def before(im):
        card(im, (110, 110), (900, 270))
        text(im, (150, 140), '₱8,300', 72, '#94A3B8', True)

    def strike(im):
        w = run_len(ImageDraw.Draw(im), '₱8,300', 72, True)
        ImageDraw.Draw(im).line((148, 185, 152 + w, 185), fill=RED, width=7)

    def after(im):
        text(im, (430, 140), '→  ₱1,300', 72, TEAL, True)
        text(im, (150, 275), 'After manual review', 32, MUTED, True)

    i = ArtShot(3.4, art('review', 'review.png'), overlays=[hold(.2, before, 0), hold(1.9, strike, 0), hold(2.5, after)])
    i.at(0, 'whoosh', .6, .5).at(1.9, 'paper', .9).at(2.5, 'chime', .5)

    j = ArtShot(5.5, art('review', 'review.png'), push=1.08, enter='cut', overlays=[
        hold(.1, lambda im: text(im, (110, 90), 'The coverage was there.', 68, NAVY, True)),
        hold(2.15, lambda im: text(im, (110, 180), "The explanation wasn't.", 68, RED, True))])
    return shots + [i, j]


# ---------------- S3 · The five pain points (29 s) ----------------
PAINS = [
    ('1', '"Why do I owe this much?"', 'Bills nobody can explain', '42.7 %', 'of health spending paid out of pocket · PSA 2024'),
    ('2', 'Approvals lost between portals', 'HMO LOAs by portal, phone, fax', '+33.8 %', 'IC complaints against HMOs · 2022→2023'),
    ('3', 'Claims sent back', 'Missing CF4 details, coding mismatches', '15–20 %', 'private-hospital claims returned · PHAPi'),
    ('4', 'Hours to leave', 'Clearance runs desk to desk', '4–8+ h', 'discharge in private tertiary hospitals'),
    ('5', 'The cashier queue', 'Pay in person before you can leave', '1 window', 'cash or card, at the end of the day'),
]
CARD_AT = [2.3, 7.7, 12.1, 15.9, 19.2]  # each card on the start of its sentence in the S3 take
S3_FIVE, S3_ROOT = 22.95, 24.45        # "Five pain points", "one root cause"


def s3():
    def fn(layer, t):
        out = ease_io((t - (S3_FIVE - .25)) / .6) if t > S3_FIVE - .25 else 0  # cards collapse
        d = ImageDraw.Draw(layer)
        if out < 1:
            text(layer, (110, 50 - int(300 * out)), "It isn't one family.", 60, 'white', True)
            for i, (n, title, sub, stat, src) in enumerate(PAINS):
                p = slide_in(t, CARD_AT[i])
                if not p:
                    continue
                x = 110 + int((1 - p) * W) - int(out * W * 1.2)
                y = 160 + i * 172 - int(out * 120 * (i + 1))
                d.rounded_rectangle((x, y, x + 1700, y + 150), 24, fill='#13294A', outline='#24406A', width=2)
                text(layer, (x + 40, y + 38), n, 56, '#FF8A8E', True)
                text(layer, (x + 130, y + 30), title, 42, 'white', True)
                text(layer, (x + 130, y + 90), sub, 26, '#94A3B8')
                sw = run_len(d, stat, 56, True)
                text(layer, (x + 1660 - sw, y + 22), stat, 56, '#FF6B70', True)
                sw = run_len(d, src, 22, False)
                text(layer, (x + 1660 - sw, y + 100), src, 22, '#94A3B8')
        if t > S3_FIVE:
            q = ease_out((t - S3_FIVE) / .4)
            text(layer, (160, 340 + int(40 * (1 - q))), 'Five pain points.', 96, 'white', True)
        if t > S3_ROOT:
            q = ease_out((t - S3_ROOT) / .4)
            text(layer, (160, 500 + int(40 * (1 - q))), 'One root cause:\nnobody can see the money clearly.', 68, '#FF8A8E', True)

    s = DrawShot(29, 'pain', fn)
    s.at(0, 'whoosh', .6)
    for t0 in CARD_AT:
        s.at(t0, 'whoosh', .6, .6).at(t0 + .3, 'pop', .7)
    s.at(S3_FIVE - .25, 'whoosh', .7, -.6).at(S3_FIVE, 'thud', .7)
    return [s]


# ---------------- S4 · Meet MedCore (21.5 s; voice enters at 0.8 s) ----------------
def s4(logo_badge, logo_text, desk_chrome, phone_chrome, desk_clip, phone_clip):
    def reveal(layer, t):
        z = .9 + .1 * ease_out(t / .6)
        b = logo_badge.resize((int(logo_badge.width * z), int(logo_badge.height * z)), Image.Resampling.LANCZOS)
        cx, cy = W // 2, H // 2 - 70
        ring = ease_out(t / 1.2)
        d = ImageDraw.Draw(layer)
        r = 170 + 70 * ring
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(17, 128, 109, int(160 * (1 - ring))), width=6)
        layer.alpha_composite(b, (cx - b.width // 2, cy - b.height // 2))
        layer.alpha_composite(logo_text, (cx - logo_text.width // 2, cy + 270))
        if t < .5:
            layer.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(255 * (1 - t / .5)))))

    k = DrawShot(2.75, 'solution', reveal, enter='cut')  # "So we built MedCore"
    k.at(0, 'impact', 1)

    def devices(layer, t):
        p = slide_in(t, .1)
        dx = desk_chrome.paste(desk_clip.frame())
        layer.alpha_composite(dx, (40 - int((1 - p) * 1400), 150))
        ph = phone_chrome.paste(phone_clip.frame())
        layer.alpha_composite(ph, (1360 + int((1 - p) * 800), 90))
        if t > .6:
            chip(layer, (440, 990), 'For the hospital', fill=NAVY, size=30)
            chip(layer, (1440, 990), 'For the family', fill=TEAL, size=30)

    l = DrawShot(4.9, 'solution', devices, enter='cut')  # "a financial clarity layer on top of the hospital systems"
    l.at(.1, 'whoosh', .7, -.7).at(.1, 'whoosh', .7, .7).at(.6, 'pop', .5)

    boxes = [('Hospital systems', 'BizBox · Medsys · Comlogik', 'white'),
             ('MedCore ledger', 'Statutory waterfall, to the centavo', '#E7F4F0'),
             ('PhilHealth · HMOs · Patient’s phone', 'Claims · LOAs · bills', 'white')]

    # Diagram cues, from the S4 take: "connects charges" 0, "PhilHealth" 2.5, "explainable ledger" 5.0, "AI explains" 9.1.
    box_at = [.1, 5.0, 2.5]
    AI_AT = 9.1

    def diagram(layer, t):
        if t > box_at[1]:
            text(layer, (110, 110), 'One explainable ledger, to the centavo.', 64, NAVY, True)
        d = ImageDraw.Draw(layer)
        shown = []
        for i, (title, sub, fill) in enumerate(boxes):
            p = slide_in(t, box_at[i])
            shown.append(p > 0)
            if not p:
                continue
            x, y = 110 + i * 610, 380 + int(40 * (1 - p))
            d.rounded_rectangle((x, y, x + 480, y + 260), 26, fill=fill, outline=TEAL if i == 1 else '#CBD5E1', width=4 if i == 1 else 2)
            text(layer, (x + 36, y + 46), title, 40, NAVY, True, width=420)
            text(layer, (x + 36, y + 180), sub, 26, MUTED, width=420)
        for i in (1, 2):  # arrow once both ends are on screen
            if shown[i - 1] and shown[i]:
                ax = 110 + i * 610 - 110
                d.line((ax, 510, ax + 90, 510), fill=TEAL, width=6)
                d.polygon([(ax + 90, 496), (ax + 112, 510), (ax + 90, 524)], fill=TEAL)
        if t > AI_AT:
            chip(layer, (110, 790), 'AI explains and drafts. It never computes the money.', fill=NAVY, size=34)

    m = DrawShot(13.85, 'solution', diagram)
    m.at(0, 'whoosh', .6)
    for t0 in box_at:
        m.at(t0, 'tick', .8)
    m.at(AI_AT, 'chime', .6)
    return [k, l, m]
