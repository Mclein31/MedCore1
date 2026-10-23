"""Device frames for V4: a desktop display for the dashboard and an iPhone 17 Pro for mobile.
Pure Pillow so the storyboard and the final compositor share one look. Screen pixels are pasted untouched.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

FONT = '/System/Library/Fonts/Avenir Next.ttc'


def _font(size, bold=False):
    return ImageFont.truetype(FONT, size, index=0 if bold else 7)


def _shadow(size, box, radius, blur=40, opacity=90, offset=(0, 30)):
    # Blur only the alpha mask; blurring straight RGBA bleeds the transparent black into a visible box edge.
    mask = Image.new('L', size, 0)
    x0, y0, x1, y1 = box
    ImageDraw.Draw(mask).rounded_rectangle((x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]), radius, fill=opacity)
    layer = Image.new('RGBA', size, (15, 23, 42, 0))
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)))
    return layer


def desktop(screen, width=1500, url='med-core1.vercel.app'):
    """Silver 16:10 display with a slim browser bar and stand. Returns RGBA image."""
    sw = width - 36
    bar = 44
    sh = round(sw * screen.height / screen.width)
    body_h = sh + bar + 36
    W, H = width + 120, body_h + 190
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bx0, by0 = 60, 20
    out.alpha_composite(_shadow((W, H), (bx0, by0, bx0 + width, by0 + body_h), 26))
    d = ImageDraw.Draw(out)
    # stand
    d.polygon([(W / 2 - 90, by0 + body_h), (W / 2 + 90, by0 + body_h), (W / 2 + 120, H - 46), (W / 2 - 120, H - 46)], fill='#C9CED6')
    d.rounded_rectangle((W / 2 - 230, H - 52, W / 2 + 230, H - 34), 9, fill='#B9BFC8')
    # bezel
    d.rounded_rectangle((bx0, by0, bx0 + width, by0 + body_h), 26, fill='#1B1F27', outline='#D5DAE1', width=4)
    sx0, sy0 = bx0 + 18, by0 + 18
    # browser chrome
    d.rounded_rectangle((sx0, sy0, sx0 + sw, sy0 + bar + 10), 10, fill='#EEF1F5')
    d.rectangle((sx0, sy0 + bar - 4, sx0 + sw, sy0 + bar), fill='#EEF1F5')
    for i, c in enumerate(['#FF5F57', '#FEBC2E', '#28C840']):
        d.ellipse((sx0 + 18 + i * 22, sy0 + 16, sx0 + 30 + i * 22, sy0 + 28), fill=c)
    d.rounded_rectangle((sx0 + sw / 2 - 260, sy0 + 9, sx0 + sw / 2 + 260, sy0 + 35), 8, fill='white')
    f = _font(15)
    d.text((sx0 + sw / 2 - d.textlength(url, font=f) / 2, sy0 + 12), url, font=f, fill='#475569')
    out.alpha_composite(screen.convert('RGBA').resize((sw, sh), Image.Resampling.LANCZOS), (sx0, sy0 + bar))
    return out


def iphone(screen, height=1000):
    """iPhone 17 Pro, Deep Blue titanium, Dynamic Island. Screen keeps its aspect (1206x2622 native)."""
    sh = height - 40
    sw = round(sh * screen.width / screen.height)
    W, H = sw + 40 + 80, height + 80
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x0, y0 = 40, 20
    r = int(sw * 0.16)
    out.alpha_composite(_shadow((W, H), (x0, y0, x0 + sw + 40, y0 + height), r + 20, blur=34, opacity=110))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((x0, y0, x0 + sw + 40, y0 + height), r + 20, fill='#2B3A55')  # titanium
    d.rounded_rectangle((x0 + 4, y0 + 4, x0 + sw + 36, y0 + height - 4), r + 16, fill='#0B0D12')  # bezel
    # side buttons
    for yy, hh in [(0.2, 0.05), (0.29, 0.08), (0.39, 0.08)]:
        d.rounded_rectangle((x0 - 5, y0 + height * yy, x0 + 1, y0 + height * (yy + hh)), 3, fill='#24324A')
    d.rounded_rectangle((x0 + sw + 39, y0 + height * 0.3, x0 + sw + 45, y0 + height * 0.42), 3, fill='#24324A')
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), r, fill=255)
    scr = ImageOps.fit(screen.convert('RGBA'), (sw, sh), Image.Resampling.LANCZOS)
    out.paste(scr, (x0 + 20, y0 + 20), mask)
    di_w, di_h = sw * 0.31, sw * 0.09
    cx = x0 + 20 + sw / 2
    d.rounded_rectangle((cx - di_w / 2, y0 + 20 + sh * 0.013, cx + di_w / 2, y0 + 20 + sh * 0.013 + di_h), di_h / 2, fill='black')
    return out
