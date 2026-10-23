#!/usr/bin/env python3
"""Generate the four new V4 illustrations with Gemini image models, using the locked model sheet as reference.
  python3 docs/media/production/source/illustrations.py [name ...]   -> characters/<name>.png (1672x941)
Reads GEMINI_API_KEY from the repo .env; IMAGE_MODEL overrides the model. Existing files are skipped unless named explicitly.
"""
import base64, io, json, os, pathlib, ssl, sys, urllib.request
from PIL import Image, ImageOps

PROD = pathlib.Path(__file__).resolve().parents[1]
ROOT = PROD.parents[2]
CHARS = PROD / 'characters'
MODEL = os.environ.get('IMAGE_MODEL', 'gemini-3-pro-image')  # free-tier keys get 429 here; try gemini-3.1-flash-image
SIZE = (1672, 941)
# python.org builds ship without system CAs; the macOS bundle is always there.
CTX = ssl.create_default_context(cafile='/etc/ssl/cert.pem')

SUFFIX = ('Same characters, outfits and illustration style as the attached reference sheet and scene: premium editorial 2D '
          'illustration with restrained 2.5D depth, navy, slate, warm cream and muted teal palette. No text, numbers, logos, '
          'signage or readable IDs anywhere. 16:9, soft natural light, calm composition with negative space on the left third for titles.')

SCENES = {
    's1-ready-bed': 'Tatay Ramon (the older man with short silver hair, pale-blue polo, charcoal trousers) sits fully dressed on the edge '
                    'of a neatly made hospital bed in a private room, a packed travel bag at his feet, hands on his knees, patient and '
                    'hopeful. Bright cool morning light from a window. A plain round wall clock with no numerals is visible on the wall.',
    's1-window': 'Mara (shoulder-length dark hair, dark-teal blouse, warm tan cardigan, navy trousers, holding a plain cream folder) stands '
                 'at a hospital billing window, seen from behind at three-quarter view, waiting. Behind the glass, Lina (neat dark hair in '
                 'a low bun, sage top, plain navy lanyard with a blank badge) talks on a desk phone, looking down at papers. Warm, '
                 'tired late-afternoon light with long shadows.',
    's2-lina-overload': 'Lina (neat dark hair in a low bun, sage top, plain navy lanyard with a blank badge) at a cluttered billing desk, '
                        'a phone held to her ear, a calculator under one hand, a tall stack of paper forms, and two monitors showing '
                        'abstract generic portal screens made of grey blocks only. She looks overwhelmed but kind. Muted office light.',
    's14-going-home': 'Tatay Ramon and Mara walk out through open glass hospital doors into warm, bright daylight, side by side, relieved '
                      'and smiling. Mara carries her cardigan and the folder in one arm and holds a smartphone in the other hand, its '
                      'screen showing a simple generic square QR-like pattern. Trees and sky outside. Hopeful, open composition.',
}


def key():
    for line in (ROOT / '.env').read_text().splitlines():
        if line.startswith('GEMINI_API_KEY='):
            return line.split('=', 1)[1].strip()
    sys.exit('GEMINI_API_KEY missing from .env')


def part(path):
    return {'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(path.read_bytes()).decode()}}


def generate(name, k):
    body = {
        'contents': [{'parts': [part(CHARS / 'reference.png'), part(CHARS / 'waiting.png'),
                                {'text': f'{SCENES[name]} {SUFFIX}'}]}],
        'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '16:9', 'imageSize': '2K'}},
    }
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
                                 json.dumps(body).encode(), {'Content-Type': 'application/json', 'x-goog-api-key': k})
    with urllib.request.urlopen(req, timeout=300, context=CTX) as r:
        res = json.load(r)
    for p in res['candidates'][0]['content']['parts']:
        data = p.get('inline_data') or p.get('inlineData')
        if data:
            im = Image.open(io.BytesIO(base64.b64decode(data['data']))).convert('RGB')
            ImageOps.fit(im, SIZE, Image.Resampling.LANCZOS).save(CHARS / f'{name}.png', optimize=True)
            return
    raise RuntimeError(f'{name}: no image returned: {json.dumps(res)[:400]}')


if __name__ == '__main__':
    k = key()
    names = sys.argv[1:] or [n for n in SCENES if not (CHARS / f'{n}.png').exists()]
    for n in names:
        generate(n, k)
        print('wrote', f'characters/{n}.png')
