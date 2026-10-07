"""Rebuild equal-width reference comparisons; never stretch image height."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
REFS = BASE.parents[1] / "UI_INSPO"
SPECS = [
    ("preload", "login:register ui inspo main.png", (30, 51, 144, 277)),
    ("login", "login:register ui inspo main.png", (494, 51, 607, 277)),
    ("onboarding", "login:register ui inspo main.png", (339, 51, 453, 277)),
    ("home", "Bill_display_and_receipt_inspo.jpg", (51, 76, 291, 551)),
    ("bill", "Bill_display inspo.jpg", (63, 75, 280, 500)),
    ("receipt", "Bill_display_and_receipt_inspo.jpg", (349, 100, 588, 576)),
    ("profile", "Profile tab inspo.jpg", (411, 255, 682, 801)),
    ("payment-amount", "payment input ui.png", (18, 57, 223, 469)),
    ("payment-methods", "Main_overall_app_inspo.jpg", (50, 4480, 331, 5056)),
    ("payment-review", "Main_overall_app_inspo.jpg", (746, 4488, 1027, 5064)),
    ("logout-sheet", "Main_overall_app_inspo.jpg", (746, 13390, 1027, 13964)),
    ("payment-qr", "overall_app_inspo(do not copy the bright blue color pallete).jpg", (621, 788, 863, 1285)),
]
FONT = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
(BASE / "comparisons").mkdir(exist_ok=True)
for name, filename, bounds in SPECS:
    ref = Image.open(REFS / filename).convert("RGB").crop(bounds)
    ref = ref.resize((390, round(ref.height * 390 / ref.width)), Image.Resampling.LANCZOS)
    app = Image.open(BASE / "screenshots" / f"{name}.png").convert("RGB")
    canvas = Image.new("RGB", (820, 44 + max(ref.height, app.height) + 20), "#EDF1F4")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), "Reference · phone content", font=FONT, fill="#0F172A")
    draw.text((418, 12), f"MedCore · {name}", font=FONT, fill="#0F172A")
    canvas.paste(ref, (12, 44))
    canvas.paste(app, (418, 44))
    canvas.save(BASE / "comparisons" / f"{name}.png")

names = ["preload", "onboarding", "login", "home", "bill", "coverage", "payment-amount", "payment-methods", "payment-qr", "payment-review", "receipt", "profile"]
w, h, gap, label, cols, rows = 195, 422, 20, 30, 4, 3
canvas = Image.new("RGB", (cols * (w + gap) + gap, rows * (h + label + gap) + gap), "#EDF1F4")
draw = ImageDraw.Draw(canvas)
for i, name in enumerate(names):
    x, y = gap + (i % cols) * (w + gap), gap + (i // cols) * (h + label + gap)
    draw.text((x, y + 2), name.replace("-", " ").title(), font=FONT, fill="#0F172A")
    app = Image.open(BASE / "screenshots" / f"{name}.png").convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
    canvas.paste(app, (x, y + label))
canvas.save(BASE / "overview.png")
print("12 comparison sheets and actual-app overview saved.")
