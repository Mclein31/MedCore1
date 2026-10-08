"""Equal-width comparison sheets; original screenshots are never modified."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SHOTS = HERE / "screenshots"
OUT = HERE / "comparisons"
OUT.mkdir(exist_ok=True)
REFS = HERE.parents[1] / "needs_fix"
FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)


def normalized(path, width=428, bounds=None):
    image = Image.open(path).convert("RGB")
    if bounds:
        image = image.crop(bounds)
    return image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)


def pair(left, right, filename, labels, bounds=None, right_bounds=None):
    images = [normalized(left, bounds=bounds), normalized(right, bounds=right_bounds)]
    canvas = Image.new("RGB", (904, max(i.height for i in images) + 60), "#e2e8f0")
    draw = ImageDraw.Draw(canvas)
    for x, im, label in zip((16, 460), images, labels):
        draw.text((x, 18), label, font=FONT, fill="#0f172a")
        canvas.paste(im, (x, 50))
    canvas.save(OUT / filename)


# Interior crop estimates exclude the simulator window, bezel and annotations.
# The complete annotated originals remain linked in README.md.
references = [
    ("09.55.01", (736, 90, 1154, 991), "after-home-scrolled.png", "01-header-footer.png"),
    ("09.57.29", (692, 70, 1110, 971), "after-native-home.png", "02-gradient-artifact.png"),
    ("10.02.32", (668, 58, 1084, 961), "after-native-home.png", "03-solid-summary.png"),
    ("10.07.59", (632, 45, 1049, 948), "after-native-bill.png", "04-bill-summary.png"),
    ("10.09.57", (574, 36, 990, 938), "after-bill-search.png", "05-search.png"),
    ("10.14.20", (646, 54, 1063, 951), "after-native-payments-waiting.png", "06-payment-waiting.png"),
]
for time, bounds, shot, name in references:
    pair(REFS / f"Screenshot 2026-10-08 at {time}.png", SHOTS / shot, name,
         (f"Requested adjustment: {time}", "Implemented (actual app)"), bounds)

pair(REFS / "Screenshot 2026-10-08 at 10.09.57.png", SHOTS / "after-bill-search.png",
     "05-search-detail.png", ("Original search control", "Visible placeholder and icon"),
     bounds=(574, 230, 990, 378), right_bounds=(0, 590, 428, 740))

for screen in ("home", "bill", "payments", "profile", "methods", "bill-search"):
    pair(SHOTS / f"before-{screen}.png", SHOTS / f"after-{screen}.png",
         f"before-after-{screen}.png", ("Before refinement (browser)", "After refinement (browser)"))

# Compact index; individual PNGs retain full-resolution detail.
names = ("home", "bill", "payments-waiting", "profile", "documents")
width, top = 256, 48
images = [normalized(SHOTS / f"after-native-{n}.png", width) for n in names]
canvas = Image.new("RGB", (len(names) * (width + 16) + 16, max(i.height for i in images) + top + 16), "#e2e8f0")
draw = ImageDraw.Draw(canvas)
for k, (name, im) in enumerate(zip(names, images)):
    x = 16 + k * (width + 16)
    draw.text((x, 14), name.replace("-", " ").title(), font=FONT, fill="#0f172a")
    canvas.paste(im, (x, top))
canvas.save(OUT / "native-overview.png")
print(f"Wrote {len(references) + 8} comparison images to {OUT}")
