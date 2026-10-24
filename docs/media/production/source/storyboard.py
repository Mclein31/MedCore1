#!/usr/bin/env python3
"""Build V4 storyboard frames (1920x1080) + contact sheet from real screenshots and character art.
Run: python3 docs/media/production/source/storyboard.py
Mobile frames prefer screenshots/mobile/<name>.png (new native captures) and fall back to the
legacy web renders in docs/media/assets/ui/mobile, stamping those "placeholder UI".
"""
import json, pathlib, re, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from frames import desktop, iphone

PROD = pathlib.Path(__file__).resolve().parents[1]
MEDIA = PROD.parent
OUT = PROD / 'storyboard/frames'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080
NAVY, INK, TEAL, RED, MUTED, BG, CREAM = '#0F2A4A', '#0F172A', '#11806D', '#E5484D', '#475569', '#F5F6F8', '#FFF9ED'
FONT = '/System/Library/Fonts/Avenir Next.ttc'


def font(n, bold=False):
    return ImageFont.truetype(FONT, n, index=0 if bold else 7)


# Film type palette (SIL OFL, source/fonts/). 'ui' is Avenir Next, the product's own voice.
FONTS = pathlib.Path(__file__).parent / 'fonts'
FACES = {'display': 'Bricolage-Display.ttf',      # headlines, kinetic titles
         'cond': 'Bricolage-Condensed.ttf',       # money and big stats (has ₱)
         'semi': 'Bricolage-SemiBold.ttf',        # sub-heads
         'serif': 'InstrumentSerif-Regular.ttf',  # the family's voice: emotional lines in Act I and the close (upright: no italics)
         'serif-r': 'InstrumentSerif-Regular.ttf',
         'mono': 'JetBrainsMono-Bold.ttf',        # labels, timestamps, sources: the ledger's voice
         'mono-m': 'JetBrainsMono-Medium.ttf'}
NO_PESO = ('serif', 'serif-r', 'mono', 'mono-m')  # these faces borrow ₱ from Bricolage
_CACHE = {}


def face_font(face, size):
    k = (face, size)
    if k not in _CACHE:
        _CACHE[k] = ImageFont.truetype(str(FONTS / FACES[face]), size)
    return _CACHE[k]


# One accent per pain point, carried from the S3 list through each Act III pain card to the S11 before/after rows.
PAIN_COLORS = {1: '#FF6B70', 2: '#F5A524', 3: '#A78BFA', 4: '#38BDF8', 5: '#F472B6'}
PAIN_ICONS = {1: 'receipt_long', 2: 'call', 3: 'assignment_return', 4: 'hourglass_bottom', 5: 'point_of_sale'}
_ICONS = {}


def icon(im, xy, name, size, color):
    """Draw a filled Material Symbols icon (Apache 2.0, source/fonts/) with its top-left at xy."""
    if not _ICONS:
        for ln in (FONTS / 'MaterialSymbolsRounded.codepoints').read_text().split('\n'):
            if ln:
                k, v = ln.split()
                _ICONS[k] = chr(int(v, 16))
    k = ('icons', size)
    if k not in _CACHE:
        _CACHE[k] = ImageFont.truetype(str(FONTS / 'MaterialSymbols-Filled.ttf'), size)
    ImageDraw.Draw(im).text(xy, _ICONS[name], font=_CACHE[k], fill=color)


def _fonts_for(part, size, bold, face='ui'):
    if part == '₱':
        if face == 'ui':  # Avenir Next has no peso sign; draw it with Helvetica at the same size and weight.
            return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size, index=1 if bold else 0)
        return face_font('cond' if face in NO_PESO else face, size)
    if part in SYMBOLS:
        return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', size)
    return font(size, bold) if face == 'ui' else face_font(face, size)


SYMBOLS = '→✔≈↑'
SPLIT = re.compile('([₱→✔≈↑])')


def run_len(d, s, size, bold, face='ui'):
    return sum(d.textlength(p, font=_fonts_for(p, size, bold, face)) for p in SPLIT.split(s) if p)


def run(d, xy, s, size, bold, fill, face='ui'):
    x, y = xy
    for p in SPLIT.split(s):
        if not p:
            continue
        f = _fonts_for(p, size, bold, face)
        d.text((x, y), p, font=f, fill=fill)
        x += d.textlength(p, font=f)


def text(im, xy, s, size, color=INK, bold=False, width=None, spacing=10, face='ui'):
    d = ImageDraw.Draw(im); x, y = xy
    for para in s.split('\n'):
        words, line, lines = para.split(), '', []
        for w in words:
            c = (line + ' ' + w).strip()
            if width and run_len(d, c, size, bold, face) > width and line:
                lines.append(line); line = w
            else:
                line = c
        lines.append(line)
        for ln in lines:
            run(d, (x, y), ln, size, bold, color, face); y += size + spacing
    return y


def canvas(mood):
    return Image.new('RGBA', (W, H), {'pain': '#0B1F38', 'solution': BG, 'story': CREAM}[mood])


def dash(name):
    return Image.open(PROD / 'screenshots/dashboard' / f'{name}.png')


def mob(new, legacy):
    p = PROD / 'screenshots/mobile' / f'{new}.png'
    if p.exists():
        return Image.open(p), False
    return Image.open(MEDIA / 'assets/ui/mobile' / legacy), True


def char(name, im, dim=0):
    art = ImageOps.fit(Image.open(PROD / 'characters' / name).convert('RGBA'), (W, H), Image.Resampling.LANCZOS, centering=(.5, .4))
    im.alpha_composite(art)
    if dim:
        im.alpha_composite(Image.new('RGBA', (W, H), (11, 31, 56, dim)))


def chip(im, xy, s, fill=TEAL, color='white', size=30, face='ui'):
    d = ImageDraw.Draw(im); w = run_len(d, s, size, True, face)
    x, y = xy
    d.rounded_rectangle((x, y, x + w + 48, y + size + 30), (size + 30) // 2, fill=fill)
    run(d, (x + 24, y + 13 + (3 if face != 'ui' else 0)), s, size, True, color, face)


def pain_card(im, n, quote, stat, x=1040, y=300):
    d = ImageDraw.Draw(im)
    quote = re.sub(r'"([^"]*)"', '“\\1”', quote)
    end = text(Image.new('RGBA', im.size), (x + 44, y + 100), quote, 72, 'white', width=600, spacing=0, face='serif')
    accent = PAIN_COLORS[int(n)]
    d.rounded_rectangle((x, y, x + 780, end + 120), 28, fill='#13294A', outline='#24406A', width=2)
    tw = run_len(d, f'PAIN {n}', 24, True, 'mono')
    d.rounded_rectangle((x + 44, y + 36, x + 76 + tw, y + 76), 10, fill=accent)
    text(im, (x + 60, y + 41), f'PAIN {n}', 24, '#0B1F38', True, face='mono')
    d.ellipse((x + 660, y + 28, x + 752, y + 120), fill=accent)  # icon badge
    icon(im, (x + 682, y + 50), PAIN_ICONS[int(n)], 48, '#0B1F38')
    end = text(im, (x + 44, y + 100), quote, 72, 'white', width=600, spacing=0, face='serif')
    d.line((x + 46, end + 26, x + 126, end + 26), fill=accent, width=4)
    text(im, (x + 44, end + 50), stat, 28, accent, width=700, face='mono-m')


def placeholder(im):
    chip(im, (1560, 30), 'placeholder UI', fill='#FDE68A', color='#713F12', size=20)


def label(im, scene, time, caption, dark=False):
    d = ImageDraw.Draw(im)
    tag = f'{scene} · {time}'
    w = d.textlength(tag, font=font(22, True)) + 44
    d.rounded_rectangle((W - 30 - w, 1000, W - 30, 1050), 12, fill=(0, 0, 0, 120))
    d.text((W - 30 - w + 22, 1011), tag, font=font(22, True), fill='white')
    if caption:
        text(im, (70, 60), caption, 54, 'white' if dark else NAVY, True, width=900)


FRAMES = []


def frame(fid, scene, time, vo, sfx):
    def wrap(fn):
        FRAMES.append(dict(id=fid, scene=scene, time=time, vo=vo, sfx=sfx, fn=fn)); return fn
    return wrap


# ---------------- ACT I: PAIN ----------------
@frame('01', 'S1', '00:00–00:09', '"The doctor said Tatay could go home at eight… At four in the afternoon, we were still waiting."', 'Clock tick, sub drone, whoosh')
def f01(im):
    char('waiting.png', im, dim=150)
    d = ImageDraw.Draw(im)
    d.ellipse((1380, 160, 1720, 500), outline='white', width=10)
    d.line((1550, 330, 1550, 210), fill='white', width=10); d.line((1550, 330, 1640, 370), fill=RED, width=8)
    chip(im, (120, 300), 'Discharge order · 8:02 AM', fill='#1E3A5F')
    chip(im, (120, 400), 'Still waiting · 4:12 PM', fill=RED)
    text(im, (120, 160), 'Not for care.', 60, 'white', True)


@frame('02', 'S1', '00:12–00:14', '"Not for care. For the bill."', 'Low boom + paper flick')
def f02(im):
    text(im, (160, 380), 'The care was done.', 96, 'white', True)
    text(im, (160, 520), "The bill wasn't.", 96, '#FF8A8E', True)


@frame('03', 'S2', '00:14–00:24', '"Tatay Ramon had paid into PhilHealth for thirty-nine years… also a private HMO. The quoted bill: ₱36,500."', 'Card pop ×2, paper slide')
def f03(im):
    char('waiting.png', im)
    for i, s in enumerate(['PhilHealth · 39 years', 'Private HMO']):
        chip(im, (1250, 160 + i * 100), s, fill=NAVY)
    d = ImageDraw.Draw(im); d.rounded_rectangle((1250, 400, 1800, 600), 20, fill='white', outline='#E2E8F0', width=2)
    text(im, (1290, 430), 'Quoted bill', 30, MUTED); text(im, (1290, 490), '₱36,500', 70, NAVY, True)


@frame('04', 'S2', '00:24–00:34', '"The share we were told to pay: ₱8,300. Hours of asking, waiting, and asking again…"', 'Stamp thud, phone ring, calculator clicks')
def f04(im):
    char('question.png', im)
    d = ImageDraw.Draw(im); d.rounded_rectangle((90, 90, 900, 300), 24, fill=(255, 253, 247, 240))
    text(im, (130, 115), '"Your share"', 34, MUTED); text(im, (128, 170), '₱8,300', 90, RED, True)
    chip(im, (100, 920), 'Ask. Wait. Ask again.', fill=NAVY)


@frame('05', 'S2', '00:34–00:44', '"…a manual review brought it down to ₱1,300. The coverage was there. The explanation wasn\'t."', 'Strike swipe → soft pluck; music drops out')
def f05(im):
    char('review.png', im)
    d = ImageDraw.Draw(im); d.rounded_rectangle((90, 90, 980, 330), 24, fill=(255, 253, 247, 240))
    text(im, (130, 115), '₱8,300', 60, '#94A3B8', True); d.line((128, 152, 128 + run_len(d, '₱8,300', 60, True), 152), fill=RED, width=6)
    text(im, (380, 115), '→  ₱1,300', 60, TEAL, True)
    text(im, (130, 210), 'The coverage was there.\nThe explanation wasn\'t.', 36, NAVY, True)


@frame('06', 'S3', '00:44–01:07', '"And it isn\'t one family…" five pain cards stack in', 'Whoosh + pop ×5 on the beat')
def f06(im):
    text(im, (110, 70), 'It isn\'t one family.', 64, 'white', True)
    cards = [('1', 'Bills nobody can explain', '42.7 % paid out of pocket'), ('2', 'Approvals lost between portals', '+33.8 % HMO complaints'),
             ('3', 'Claims sent back', '15–20 % returned · ₱4–10 B'), ('4', 'Hours to leave', '4–8+ hours to discharge'), ('5', 'The cashier queue', '1 window, end of the day')]
    d = ImageDraw.Draw(im)
    for i, (n, t, s) in enumerate(cards):
        y = 200 + i * 160
        d.rounded_rectangle((110, y, 1810, y + 136), 22, fill='#13294A', outline='#24406A', width=2)
        text(im, (150, y + 40), n, 50, '#FF8A8E', True)
        text(im, (240, y + 42), t, 44, 'white', True)
        tw = run_len(d, s, 40, True); text(im, (1770 - tw, y + 46), s, 40, '#FFB4B6', True)


@frame('07', 'S3', '01:07–01:14', '"Five pain points, one root cause: nobody can see the money clearly."', 'Riser builds')
def f07(im):
    text(im, (160, 360), 'Five pain points.', 90, 'white', True)
    text(im, (160, 490), 'One root cause:\nnobody can see the money clearly.', 64, '#FF8A8E', True)


# ---------------- ACT II: SOLUTION ----------------
@frame('08', 'S4', '01:14–01:20', '"So we built MedCore…"', 'Impact + music drop, double whoosh')
def f08(im):
    logo = Image.open(MEDIA / 'assets/logos/MedCore_Text_logo.png').convert('RGBA'); logo.thumbnail((520, 140))
    im.alpha_composite(logo, ((W - logo.width) // 2, 40))
    im.alpha_composite(desktop(dash('01b-overview-briefing'), 1180), (10, 200))
    ph, ph_old = mob('07-home', '07-home.png')
    im.alpha_composite(iphone(ph, 800), (1390, 220))
    if ph_old: placeholder(im)
    chip(im, (520, 990), 'For the hospital', fill=NAVY, size=26); chip(im, (1500, 990), 'For the family', fill=TEAL, size=26)


@frame('09', 'S4', '01:20–01:30', '"…one explainable ledger, calculated to the centavo. AI explains and drafts. It never decides the money."', 'Three ticks on the beat, soft chime')
def f09(im):
    text(im, (110, 80), 'One explainable ledger, to the centavo.', 60, NAVY, True)
    d = ImageDraw.Draw(im)
    boxes = [(110, 'Hospital systems', 'BizBox · Medsys · Comlogik', 'white'), (720, 'MedCore ledger', 'Statutory waterfall engine', '#E7F4F0'), (1330, 'PhilHealth · HMOs · Patient', 'Claims · LOAs · phone', 'white')]
    for x, t, s, f in boxes:
        d.rounded_rectangle((x, 380, x + 480, 640), 26, fill=f, outline='#CBD5E1', width=2)
        text(im, (x + 36, 430), t, 38, NAVY, True, width=420); text(im, (x + 36, 560), s, 28, MUTED)
    for x in (600, 1210):
        d.line((x, 510, x + 110, 510), fill=TEAL, width=6); d.polygon([(x + 110, 498), (x + 130, 510), (x + 110, 522)], fill=TEAL)
    chip(im, (110, 760), 'AI explains and drafts. It never computes the money.', fill=NAVY)


# ---------------- ACT III: PAIN → FIX ----------------
def fix_desktop(im, shot, title, proof):
    text(im, (90, 50), title, 44, NAVY, True)
    im.alpha_composite(desktop(dash(shot), 1560), (120, 120))
    chip(im, (90, 990), '✔ ' + proof, size=26)


def fix_phone(im, new, legacy, title, sub, proof):
    text(im, (140, 300), title, 72, NAVY, True, width=900)
    text(im, (144, 520), sub, 34, MUTED, width=860)
    ph, old = mob(new, legacy)
    im.alpha_composite(iphone(ph, 1000), (1180, 20))
    if old: placeholder(im)
    chip(im, (140, 990), '✔ ' + proof, size=26)


def pain_frame(n, quote, stat):
    def fn(im):
        im.paste(canvas('pain'))
        pain_card(im, n, quote, stat, x=570, y=330)
    return fn


PAINS = [
    ('10', 'S5', '01:30', 1, '"Why do I owe this much?"', 'Bills nobody can explain'),
    ('14', 'S6', '02:08', 2, 'Approvals lost between portals', 'Portals, phone calls, faxes'),
    ('17', 'S7', '02:32', 3, 'Claims sent back', '15–20 % returned to hospital'),
    ('19', 'S8', '02:54', 4, 'Hours to leave', '4–8+ hours from order to exit'),
    ('22', 'S9', '03:22', 5, 'The cashier queue', 'Pay in person before you can leave'),
]
for fid, sc, t, n, q, s in PAINS:
    frame(fid, sc, t + ' (1.5 s)', f'"Pain {n}: …"', 'Whoosh + low thud')(pain_frame(n, q, s))

frame('11', 'S5', '01:31–01:45', '"Every encounter has a live ledger… applied in legal order."', 'Click, panel slide, tick per row')(
    lambda im: fix_desktop(im, '03-ledger-waterfall', 'Gross − PhilHealth − HMO = what the family owes', 'Every peso explained'))
frame('12', 'S5', '01:45–01:53', '"The same ledger reaches the family\'s phone, itemized and in plain language."', 'Tap, whoosh')(
    lambda im: fix_phone(im, 'mob-bill', '08-bill.png', 'Same ledger.\nOn the family\'s phone.', 'Itemized bill, VAT exemption, Senior/PWD, PhilHealth and HMO, line by line.', 'No surprise fees'))
frame('13', 'S5', '01:53–02:08', '"Cora… explains their own bill in English, Taglish, Tagalog, or Ilokano."', 'Tap, keyboard clicks, typing blip, chime')(
    lambda im: fix_phone(im, 'mob-cora', '16-cora-assistant.png', 'Ask Cora.\nIn your language.', 'English · Taglish · Tagalog · Ilokano. Question any charge in two taps.', 'Every peso explained'))
frame('15', 'S6', '02:09–02:17', '"Every pending letter of authorization in one roster."', 'Click ×2, list cascade')(
    lambda im: fix_desktop(im, '04-hmo-roster', 'Every HMO approval, one roster', 'From scattered portals to one worklist'))
frame('16', 'S6', '02:17–02:32', '"AI drafts the appeal letter from the recorded facts, for staff to review."', 'Click, shimmer, paper-out swoosh')(
    lambda im: fix_desktop(im, '04c-ai-appeal', 'AI-drafted HMO appeal · staff review before sending', 'Hours of letter-writing → seconds'))
frame('18', 'S7', '02:33–02:52', '"ClaimReady scores every claim… catches a coding mismatch, explains the fix."', 'Click, scan sweep, soft alarm, pop')(
    lambda im: fix_desktop(im, '05b-claims-ai-findings', 'Caught before PhilHealth sees it', 'Target: returned claims under 2 %'))
frame('20', 'S8', '02:55–03:10', '"…six stages, from the discharge order to the gate pass, with live timers."', 'Six ticks on the beat')(
    lambda im: fix_desktop(im, '02b-six-stage-pipeline', 'Six stages. Every patient. Live.', 'Bottlenecks visible in real time'))
frame('21', 'S8', '03:10–03:22', '"Staff see exactly who is blocked and why."', 'Click, notification chime')(
    lambda im: fix_desktop(im, '02c-clearance-blocker', 'Who is blocked, and why', 'Target: discharge under 45 minutes'))
frame('23', 'S9', '03:23–03:37', '"Families pay from their phone… and get a receipt on the spot."', 'Tap, list cascade, success chime')(
    lambda im: fix_phone(im, 'mob-pay-methods', 'payment-flow/02-methods.png', 'Pay from\nanywhere.', 'GCash · Maya · Debit/Credit · Bank Transfer · QR Ph', 'Instant receipt'))
frame('24', 'S9', '03:37–03:44', '"Can\'t pay in full? A zero-interest promissory note."', 'Tap, schedule rows tick')(
    lambda im: fix_phone(im, 'mob-plan', 'payment-flow/12-payment-plan-details.png', '0 % promissory\nnote.', 'RA 9439: no family is held over an unpaid balance.', 'A legal path home'))
frame('25', 'S9', '03:44–03:52', '"…the exit pass is already on their phone."', 'Shimmer, soft unlock')(
    lambda im: fix_phone(im, 'mob-pass', '13b-documents-with-receipt.png', 'Exit pass,\non the phone.', 'QR code + private PIN, issued when every stage clears.', 'No queue between the family and the door'))
frame('26', 'S10', '03:52–04:04', '"RCM analytics and an AI executive briefing show where money and time get stuck."', 'Click, shimmer, scroll ticks')(
    lambda im: fix_desktop(im, '06-rcm-analytics', 'For leaders: where money and time get stuck', 'Problems seen daily, not at month-end'))


# ---------------- ACT IV ----------------
@frame('27', 'S11', '04:04–04:14', '"Five pain points. Five fixes…"', 'Card flip per row, chorus lift')
def f27(im):
    rows = [('"Why do I owe this much?"', 'Every peso explained, in their language'), ('Portals, calls, faxes', 'One HMO roster + AI appeals'),
            ('15–20 % claims returned', 'Pre-flight audit · target < 2 %'), ('4–8+ hours to leave', 'Six live stages · target < 45 min'), ('Cashier queue', 'Pay, 0 % note, exit pass on phone')]
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W // 2, H), fill='#0B1F38')
    text(im, (90, 60), 'Before', 56, '#FF8A8E', True); text(im, (W // 2 + 90, 60), 'After · MedCore', 56, TEAL, True)
    for i, (a, b) in enumerate(rows):
        y = 200 + i * 160
        text(im, (90, y), a, 38, 'white', True, width=800); text(im, (W // 2 + 90, y), b, 38, NAVY, True, width=800)


@frame('28', 'S12', '04:14–04:28', '"Built for families, billing and claims teams, and hospital leaders…"', 'Bars grow, soft ticks')
def f28(im):
    text(im, (100, 60), 'Who it\'s for, and where we fit', 56, NAVY, True)
    d = ImageDraw.Draw(im)
    for i, t in enumerate(['Patients & families', 'Billing & claims teams', 'Hospital leaders']):
        x = 100 + i * 590; d.rounded_rectangle((x, 170, x + 550, 290), 22, fill='white', outline='#E2E8F0', width=2); text(im, (x + 30, 205), t, 36, NAVY, True)
    for i, (k, v, s, w) in enumerate([('TAM', '₱4.564 B', '1,260 hospitals', 1600), ('SAM', '₱2.738 B', '454 hospitals', 960), ('SOM', '≈ ₱1.35 B', 'Founder model', 560)]):
        y = 360 + i * 120; d.rounded_rectangle((100, y, 100 + w * 0.6, y + 90), 16, fill=TEAL if i == 2 else '#CFE7E1')
        text(im, (125, y + 22), f'{k}  {v}', 36, NAVY if i < 2 else 'white', True); text(im, (100 + w * 0.6 + 20, y + 26), s, 30, MUTED)
    text(im, (100, 760), 'NCR · Calabarzon · Cebu · Cagayan Valley', 34, TEAL, True)
    d.rounded_rectangle((1150, 560, 1820, 960), 22, fill='white', outline='#E2E8F0', width=2)
    d.line((1485, 590, 1485, 930), fill='#CBD5E1', width=2); d.line((1180, 760, 1790, 760), fill='#CBD5E1', width=2)
    text(im, (1200, 880), 'BizBox · Comlogik · Medsys', 24, MUTED); text(im, (1200, 600), 'MediLink (HMO switch)', 24, MUTED)
    chip(im, (1530, 620), 'MedCore', size=26)
    text(im, (1160, 970), '↑ inpatient payer depth   → patient UX', 20, MUTED)


@frame('29', 'S13', '04:28–04:37', '"Three student developers, guided by our coach, our college dean, and a hospital administrator."', 'Staggered pops')
def f29(im):
    text(im, (100, 60), 'The team', 56, NAVY, True)
    people = json.loads((MEDIA / 'assets/team/manifest.json').read_text())
    for i, p in enumerate(people):
        x, y = 100 + (i % 3) * 590, 170 + (i // 3) * 430
        ph = ImageOps.fit(Image.open(MEDIA / 'assets/team' / p['file']).convert('RGBA'), (200, 230), Image.Resampling.LANCZOS, centering=(.5, .3))
        im.alpha_composite(ph, (x, y))
        text(im, (x + 220, y + 40), p['name'], 28, NAVY, True, width=330); text(im, (x + 220, y + 150), p['role'], 22, MUTED, width=330)


@frame('30', 'S14', '04:37–04:50', '"Best Pitch at DTI\'s Be Your Own Boss. Next: a pilot in Cagayan Valley… MedCore. Clear the way for care."', 'Pop, pin drop, final hit')
def f30(im):
    logo = Image.open(MEDIA / 'assets/logos/MedCore_Text_logo.png').convert('RGBA'); logo.thumbnail((700, 190))
    im.alpha_composite(logo, ((W - logo.width) // 2, 200))
    text(im, (520, 470), 'Clear the Way for Care.', 80, NAVY, True)
    chip(im, (430, 640), '🏆 Best Pitch · DTI Be Your Own Boss'.replace('🏆 ', ''), fill=NAVY)
    chip(im, (1130, 640), 'Next: Cagayan Valley pilot')
    text(im, (760, 800), 'med-core1.vercel.app', 44, TEAL, True)


def build():
    sheet = []
    for f in sorted(FRAMES, key=lambda f: f['id']):
        mood = 'pain' if f['scene'] in ('S1', 'S2', 'S3') else 'solution'
        im = canvas(mood)
        f['fn'](im)
        label(im, f['scene'], f['time'], '')
        path = OUT / f"{f['id']}-{f['scene']}.png"
        im.convert('RGB').save(path, optimize=True)
        sheet.append((f, path))
    cols, tw, th = 4, 480, 270
    rows = (len(sheet) + cols - 1) // cols
    cs = Image.new('RGB', (cols * tw + (cols + 1) * 16, rows * (th + 16) + 16), 'white')
    for i, (f, p) in enumerate(sheet):
        t = Image.open(p); t.thumbnail((tw, th))
        cs.paste(t, (16 + (i % cols) * (tw + 16), 16 + (i // cols) * (th + 16)))
    cs.save(PROD / 'storyboard/contact-sheet.jpg', quality=88)
    (PROD / 'storyboard/frames.json').write_text(json.dumps([{k: v for k, v in f.items() if k != 'fn'} | {'image': f'frames/{p.name}'} for f, p in sheet], indent=2, ensure_ascii=False))
    md = ['# MedCore V4 storyboard', '',
          'Generated by `source/storyboard.py` from the real dashboard captures, the iPhone/desktop frames and the cast art. '
          'Timing, narration and sound follow `../script/MEDCORE_SCRIPT_V4.md`. Frames stamped **placeholder UI** use the legacy mobile '
          'renders until the native iOS captures land in `../screenshots/mobile/`.', '',
          '![Contact sheet](contact-sheet.jpg)', '',
          '| # | Scene | Time | Narration / beat | Sound | Frame |', '|---|---|---|---|---|---|']
    for f, p in sheet:
        md.append(f"| {f['id']} | {f['scene']} | {f['time']} | {f['vo']} | {f['sfx']} | ![{f['id']}](frames/{p.name}) |")
    (PROD / 'storyboard/STORYBOARD.md').write_text('\n'.join(md) + '\n')
    print(len(sheet), 'frames')


if __name__ == '__main__':
    build()
