"""V4 shots for Act III (S5–S10): pain card → the real dashboard or iPhone recording → proof chip.
Clip segments are (src_start, src_end, speed) in source seconds; they apply the script's "Clip fixes for the edit".
Dashboard click times come from footage/dashboard/clicks.json; iPhone taps were read off the recordings.
"""
import json
from PIL import ImageDraw
from storyboard import text, icon, NAVY, TEAL
from compose_shots import Overlay, PROD, Shot, DesktopShot, PhoneShot, caption, proof, pain_overlays, phone_clip, dash_clip

CLICKS = {k: [c['t'] for c in v['clicks']] for k, v in json.loads((PROD / 'footage/dashboard/clicks.json').read_text()).items()}
# The capture log runs ahead of the video in these two clips; times measured from the screen changes instead.
CLICKS.update({'dash-clearance': [.5, 4.3, 8.7], 'dash-appeal': [.7]})
FULL = (.5, .5, 1)


def pain(n, quote, stat, dur=1.5):
    """Pain card; dur covers the narrator's "Pain n: …" line."""
    s = Shot(dur, 'pain', pain_overlays(n, quote, stat))
    return s.at(0, 'whoosh', .7, .6).at(.25, 'thud', .9)


def desk(dur, name, segments, keys=((0, FULL),), overlays=(), enter='left'):
    return DesktopShot(dur, dash_clip(name, segments), keys, overlays, enter, clicks=CLICKS[name])


def top(s, t0=.3, t1=999, glyph='fact_check', color=TEAL):
    """Caption above the monitor, led by an icon in a colored disc."""
    def fn(im):
        ImageDraw.Draw(im).ellipse((90, 22, 150, 82), fill=color)
        icon(im, (102, 34), glyph, 36, 'white')
        text(im, (170, 24), s, 44, NAVY, True, width=1600, spacing=6, face='display')
    return Overlay(t0, t1, fn)


def finish(shot, text, extra='pop'):
    """Proof chip over the last 2.2 s of a segment's final shot."""
    shot.overlays.append(proof(shot.dur - 2.2, 999, text))
    return shot.at(shot.dur - 2.2, extra, .8)


# ---------------- S5 · Pain 1 → a bill anyone can follow (36 s) ----------------
# Take cues (scene s): "Pain one" 0.3 · "In MedCore, every encounter" 3.6 · "VAT exemption" 7.1 · "same ledger reaches the
# family's phone" 18.2 · "Still confused? Cora" 22.7 · "Ilokano" 29.0 · "if a charge looks wrong" 30.9 · ends 34.2.
def s5():
    # Search and open sped up so the waterfall is on screen when "VAT exemption" starts; the cursor then walks the formula.
    ledger = desk(14.5, 'dash-ledger', [(.3, 6.3, 1.6), (6.3, 12.8, .62)], [(0, FULL), (5.2, (.7, .47, 1.4))],
                  [top('Statutory waterfall, applied in legal order', glyph='receipt_long')])
    for k in range(4):
        ledger.at(5.9 + k * .8, 'tick', .7)

    bill = PhoneShot(4.5, phone_clip('mob-bill', [(1.2, 3.6, 1), (3.6, 12, 3.6)]),
                     'Same ledger.\nOn the family’s phone.', 'VAT exemption, Senior/PWD, PhilHealth and HMO, line by line.',
                     taps=[(2.4, (.17, .62))])
    bill.at(0, 'whoosh', .7, .7)

    # Opens Cora on "Cora", holds on the greeting while the languages are named, taps Ilokano, then cuts to the answer.
    cora = PhoneShot(8.3, phone_clip('mob-cora', [(.2, 3.5, 1), (3.5, 3.6, .05), (3.6, 4.2, 1), (38.6, 40.3, .9)]),
                     'Ask Cora.\nIn your language.', 'Cora · English · Taglish · Tagalog · Ilokano',
                     taps=[(2.2, (.87, .83)), (3.7, (.64, .32))], enter='cut')
    cora.at(6.35, 'chime', .6)  # Cora's Ilokano answer appears (source 39.0 s)

    question = PhoneShot(5.1, phone_clip('mob-question', [(14.6, 18.6, 2.0), (23.0, 28.6, 1.7)]),
                         'Every line shows\nwho pays what.', 'Question a charge in two taps. Nothing is sent until you confirm.',
                         taps=[(15.4, (.5, .49)), (23.3, (.28, .65)), (26.0, (.72, .5)), (28.4, (.5, .93))], enter='cut')
    question.at(2.0, 'whoosh', .4, .4)
    return [pain(1, '"Why do I owe this much?"', 'Bills nobody can explain', 3.6), ledger, bill, cora,
            finish(question, 'Every peso explained')]


# ---------------- S6 · Pain 2 → one roster for every HMO (21.9 s) ----------------
# Take cues: "Pain two … portals and phone calls" 0.3–5.7 · "every pending letter of authorization into one roster" 6.0 ·
# "when an HMO disputes a charge" 11.3 · "AI drafts the appeal letter" 15.2 · ends 20.2.
def s6():
    # Start inside the roster so the "Connection unavailable" gateway strip never shows.
    hmo = desk(5.3, 'dash-hmo', [(2.2, 10.9, 1.64)], [(0, (.6, .75, 1.5))], [top('Every LOA, one roster', glyph='hub')])
    for k in range(6):
        hmo.at(.5 + k * .08, 'tick', .35)
    # Hold on the disputed charge while it is described; Draft Appeal is clicked on "AI drafts". Push past the raw-ISO deadline.
    appeal = desk(10.7, 'dash-appeal', [(.2, .3, .0278), (.3, 3.0, 1), (3.0, 9.8, 1.55)], [(0, FULL), (6.5, (.5, .8, 1.9))],
                  [top('AI-drafted appeal · staff review before sending', glyph='auto_awesome')], enter='cut')
    appeal.at(4.1, 'chime', .4).at(6.1, 'paper', .7)
    return [pain(2, 'Approvals lost between portals', 'Portals, phone calls, faxes', 5.9), hmo,
            finish(appeal, 'From scattered portals to one worklist')]


# ---------------- S7 · Pain 3 → claims right the first time (19.3 s) ----------------
# Take cues: "Pain three: returned claims" 0.3–3.2 · "ClaimReady scores every claim" 5.3 · "catches a coding mismatch" 9.3 ·
# "explains the fix" 12.0 · "drafts the note for the doctor" 13.5 · ends 17.5.
def s7():
    claims = desk(15.9, 'dash-claims', [(.3, .4, .0364), (.4, 3.2, 1), (10.6, 13.3, 2.7), (13.3, 15.0, .8), (15.0, 19.0, .8)],
                  [(0, FULL), (7.45, (.4, .32, 1.6)), (9.85, (.45, .72, 1.5))],
                  [top('ClaimReady pre-flight · every claim scored', .3, 6.25, 'search_check'), top('Caught before submission', 6.55, 8.85, 'warning', '#F5A524'),
                   top('Exact fix, not just a flag', 9.05, glyph='edit_note')])
    claims.at(5.55, 'tick', .6).at(6.55, 'pop', .7)
    return [pain(3, 'Claims sent back', '15–20 % returned to the hospital', 3.4), finish(claims, 'Target: RTH under 2 %')]


# ---------------- S8 · Pain 4 → every discharge, stage by stage (22.2 s) ----------------
# Take cues: "Pain four: the long wait to leave" 0.5–3.3 · "six stages" 3.4 · "discharge order to the gate pass" 7.5 ·
# "late HMO approval is flagged" 11.6 · "who is blocked and why" 15.7 · "last balance to settle" 18.5 · ends 20.4.
def s8():
    # The board holds through the breach line, then cuts to the queue just as Grace is clicked (source 8.7 s).
    board = desk(18.8, 'dash-clearance', [(.3, .8, 1), (.8, 4.3, .297), (8.4, 11.5, .8)],
                 [(0, FULL), (8.6, (.8, .35, 1.6)), (12.4, FULL), (15.0, (.7, .62, 1.5))],
                 [top('Six stages, live minutes · Target: under 45 min', .3, 8.2, 'timer'), top('Breach flagged: HMO final LOA', 8.3, 12.3, 'flag', '#FF6B70'),
                  top('Who is blocked, and why', 12.4, glyph='person_search')])
    for k in range(6):
        board.at(4.1 + k * .45, 'tick', .7)
    board.at(8.3, 'thud', .5)
    return [pain(4, 'Hours to leave', '4–8+ hours from order to exit', 3.4).at(.8, 'tick', .8),
            finish(board, 'Target: discharge under 45 minutes')]


# ---------------- S9 · Pain 5 → pay and leave from the phone (24.8 s) ----------------
# Take cues: "Pain five: the cashier queue" 0.3–3.2 · "pay from their phone, with GCash" 3.3/5.0 · "or QR Ph" 8.7 · "receipt" 8.7 ·
# "Can't pay in full?" 10.7 · "promissory note" 12.6 · "once every stage is cleared" 19.2 · "exit pass" 21.0 · ends 23.3.
def at_src(shot, src_t, name, gain=1.0):
    t = shot.clip.map(src_t)
    return shot.at(t, name, gain) if t is not None else shot


def s9():
    pay = PhoneShot(7.5, phone_clip('mob-pay', [(2.0, 6.3, 2.2), (6.3, 14.6, 2.4), (15.2, 28.8, 6.5)]),
                    'Pay from\nanywhere.', 'GCash · Maya · QR Ph · Debit / Credit · Bank Transfer',
                    taps=[(2.3, (.5, .47)), (5.6, (.5, .91)), (14.2, (.5, .52)), (18.5, (.5, .84)), (19.6, (.5, .92)), (27.5, (.5, .93))],
                    overlays=[caption(5.6, 999, 'Instant receipt · simulated payment, no money moves', (144, 700), 28, '#475569', 860)])
    pay.at(0, 'whoosh', .7, .7)
    at_src(pay, 22.7, 'cash', .9)

    plan = PhoneShot(8.3, phone_clip('mob-plan', [(10.6, 13.6, 1.4), (13.6, 22.3, 1.41)]),
                     'Can’t pay\nin full?', '0 % promissory note, as the anti-detention law (RA 9439) allows.',
                     taps=[(12.3, (.5, .71)), (13.4, (.5, .96)), (16.8, (.19, .48)), (19.8, (.84, .48))], enter='cut')
    at_src(plan, 17.0, 'tick', .6)
    at_src(plan, 20.0, 'tick', .6)

    exitpass = PhoneShot(5.9, phone_clip('mob-pass', [(2.2, 4.6, 1), (8.4, 9.8, .38)]),
                         'Exit pass,\non the phone.', 'QR + private Exit PIN, ready for lobby verification.',
                         taps=[(4.4, (.5, .47))], enter='cut')
    exitpass.at(2.5, 'chime', .6)
    return [pain(5, 'The cashier queue', 'Pay in person before you can leave', 3.1), pay, plan,
            finish(exitpass, 'No queue between the family and the door')]


# ---------------- S10 · For hospital leaders (10.3 s) ----------------
# Take cues: "And for hospital leaders" 0.3 · "RCM analytics and an AI executive briefing" 2.2 · "every single day" 7.9 · ends 9.1.
def s10():
    # Keep the AR-aging panel (inconsistent receivables) out of frame on the right.
    rcm = desk(4.7, 'dash-analytics', [(3.0, 5.4, .52)], [(0, (.3, .55, 1.7))], [top('Where money and time get stuck', glyph='monitoring')])
    brief = desk(5.6, 'dash-overview', [(8.0, 13.5, 1.02)], overlays=[top('AI executive briefing', glyph='insights')], enter='cut')
    brief.at(0, 'whoosh', .5).at(1.4, 'chime', .4)
    return [rcm, finish(brief, 'Problems seen daily, not at month-end')]
