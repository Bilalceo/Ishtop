"""Render the channel's platform posts — one illustrated card per feature.

Different job from `job_card.py`: those cards carry one vacancy's facts, these
carry one idea about the platform. Each draws a small mock of the thing it is
talking about (the contact panel, the match ring, the chat) rather than a
decorative shape, so the reader sees what they will get before they click.

Every claim on these cards is checked against prod before it ships — a post
advertising a feature that does not work costs more than no post.
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont

W = H = 1080
WHITE = (255, 255, 255)
INK = (18, 24, 38)
INK_SOFT = (96, 108, 132)
BRAND = (111, 155, 240)
ACCENT = (255, 209, 102)
GREEN = (74, 206, 148)

FONT_DIR = "/System/Library/Fonts/Supplemental"
BOLD = os.path.join(FONT_DIR, "Arial Bold.ttf")
REG = os.path.join(FONT_DIR, "Arial.ttf")
BLACK_F = os.path.join(FONT_DIR, "Arial Black.ttf")


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


def wrap(draw, text: str, f, max_w: int) -> list[str]:
    lines, line = [], ""
    for word in text.split(" "):
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=f) <= max_w:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def base(top=(36, 52, 100), bottom=(18, 26, 52)) -> Image.Image:
    img = Image.new("RGB", (W, H), bottom)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)],
               fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    # one soft highlight so the flat gradient has somewhere to look
    for r, alpha in ((380, 16), (280, 20), (180, 24)):
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ov).ellipse([W - 200 - r, -160 - r, W - 200 + r, -160 + r],
                                   fill=(*BRAND, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    return img


def chrome(img: Image.Image, eyebrow: str, title: str, sub: str):
    """Brand line, headline and subline — the same frame on every promo card."""
    d = ImageDraw.Draw(img)
    pad = 84

    f_brand = font(BLACK_F, 38)
    d.text((pad, 78), "ishtop", font=f_brand, fill=WHITE)
    d.text((pad + d.textlength("ishtop", font=f_brand), 78), ".uz",
           font=f_brand, fill=BRAND)

    f_eye = font(BOLD, 26)
    d.text((pad, 152), eyebrow.upper(), font=f_eye, fill=ACCENT)

    y = 196
    f_title = font(BOLD, 72)
    for line in wrap(d, title, f_title, W - 2 * pad)[:3]:
        d.text((pad, y), line, font=f_title, fill=WHITE)
        y += 84

    y += 10
    f_sub = font(REG, 34)
    for line in wrap(d, sub, f_sub, W - 2 * pad)[:3]:
        d.text((pad, y), line, font=f_sub, fill=(198, 212, 238))
        y += 46
    return d, y


def footer(d: ImageDraw.ImageDraw, cta="ishtopuz.uz"):
    strip = 108
    d.rectangle([0, H - strip, W, H], fill=WHITE)
    d.text((84, H - strip + 34), cta, font=font(BOLD, 40), fill=INK)
    label = "Bepul · ro'yxatdan o'ting"
    f = font(REG, 28)
    d.text((W - 84 - d.textlength(label, font=f), H - strip + 44), label,
           font=f, fill=INK_SOFT)


# Icons are DRAWN, not typed. Arial has no ☎ / ✈ / ✓ glyph, so the first cut of
# these cards shipped a row of tofu boxes. Emoji fonts would fix it on macOS and
# break wherever this runs next; primitives render the same everywhere.

def icon_phone(d, cx, cy, r, color):
    """A handset reads as a mask at this size; a phone body does not."""
    d.rounded_rectangle([cx - r * 0.42, cy - r * 0.72, cx + r * 0.42, cy + r * 0.72],
                        radius=max(2, int(r * 0.22)), fill=color)


def icon_plane(d, cx, cy, r, color):
    """A paper plane, pointing the way Telegram's does."""
    d.polygon([(cx - r * 0.78, cy - r * 0.1), (cx + r * 0.78, cy - r * 0.72),
               (cx + r * 0.16, cy + r * 0.72), (cx - r * 0.02, cy + r * 0.16)],
              fill=color)


def icon_doc(d, cx, cy, r, color):
    """A sheet with a folded corner."""
    d.rounded_rectangle([cx - r * 0.5, cy - r * 0.7, cx + r * 0.5, cy + r * 0.7],
                        radius=int(r * 0.16), fill=color)


def icon_tick(d, cx, cy, r, color):
    w = max(3, int(r * 0.26))
    d.line([(cx - r * 0.45, cy), (cx - r * 0.1, cy + r * 0.4)], fill=color, width=w)
    d.line([(cx - r * 0.1, cy + r * 0.4), (cx + r * 0.5, cy - r * 0.42)],
           fill=color, width=w)


def icon_dash(d, cx, cy, r, color):
    d.rounded_rectangle([cx - r * 0.45, cy - r * 0.12, cx + r * 0.45, cy + r * 0.12],
                        radius=int(r * 0.12), fill=color)


# ---------------------------------------------------------------------------
# the five illustrations
# ---------------------------------------------------------------------------

def art_contact(img, d, top, bottom):
    """A mock of the real apply panel: phone, Telegram, resume."""
    x, w = 84, W - 168
    y = top + (bottom - top - 268) // 2
    rows = [
        (icon_phone, "+998 90 123-45-67", "Qo'ng'iroq", GREEN),
        (icon_plane, "@hr_kompaniya", "Yozish", BRAND),
        (icon_doc, "Rezyumem — PDF", "Yuborish", ACCENT),
    ]
    for i, (icon, text, action, color) in enumerate(rows):
        top = y + i * 92
        d.rounded_rectangle([x, top, x + w, top + 76], radius=20, fill=(30, 42, 78))
        d.ellipse([x + 18, top + 18, x + 58, top + 58], fill=color)
        icon(d, x + 38, top + 38, 15, (18, 26, 52))
        d.text((x + 76, top + 22), text, font=font(BOLD, 34), fill=WHITE)
        f = font(REG, 26)
        d.text((x + w - 26 - d.textlength(action, font=f), top + 26), action,
               font=f, fill=(160, 180, 216))


def art_resume(img, d, top, bottom):
    """A CV page taking shape, with the AI mark on it."""
    w, h = 480, 300
    x, y = (W - w) // 2, top + (bottom - top - h) // 2
    d.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=WHITE)
    d.rounded_rectangle([x + 34, y + 34, x + 34 + 96, y + 34 + 96], radius=48, fill=(222, 232, 250))
    d.text((x + 62, y + 62), "AI", font=font(BLACK_F, 34), fill=BRAND)
    for i, wide in enumerate((300, 250, 280)):
        d.rounded_rectangle([x + 150, y + 44 + i * 34, x + 150 + wide, y + 60 + i * 34],
                            radius=8, fill=(214, 222, 238))
    for i, wide in enumerate((w - 68, w - 120, w - 68, w - 180)):
        d.rounded_rectangle([x + 34, y + 168 + i * 30, x + 34 + wide, y + 182 + i * 30],
                            radius=7, fill=(230, 235, 245))
    # the sparkle that marks it generated
    cx, cy = x + w - 24, y - 18
    d.polygon([(cx, cy - 34), (cx + 11, cy - 11), (cx + 34, cy), (cx + 11, cy + 11),
               (cx, cy + 34), (cx - 11, cy + 11), (cx - 34, cy), (cx - 11, cy - 11)],
              fill=ACCENT)


def art_match(img, d, top, bottom):
    """The match ring, at a number the scorer really produces."""
    r = 112
    block = 2 * r + 52 + 3 * 50
    cx = W // 2
    cy = top + (bottom - top - block) // 2 + r
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(48, 64, 106), width=26)
    d.arc([cx - r, cy - r, cx + r, cy + r], start=-90, end=-90 + 360 * 0.82,
          fill=GREEN, width=26)
    # sized to clear the ring's inner edge rather than touch it
    f = font(BLACK_F, 62)
    d.text((cx - d.textlength("82%", font=f) / 2, cy - 48), "82%", font=f, fill=WHITE)
    f2 = font(REG, 25)
    d.text((cx - d.textlength("mos keladi", font=f2) / 2, cy + 18), "mos keladi",
           font=f2, fill=(170, 190, 224))
    # what the score is made of
    items = [("Sotuv tajribasi", True), ("Rus tili", True), ("Haydovchilik guvohnomasi", False)]
    for i, (label, ok) in enumerate(items):
        ty = cy + r + 52 + i * 50
        d.ellipse([180, ty + 2, 212, ty + 34], fill=GREEN if ok else (92, 106, 140))
        (icon_tick if ok else icon_dash)(d, 196, ty + 18, 11, (18, 26, 52))
        d.text((232, ty), label, font=font(REG, 30),
               fill=WHITE if ok else (150, 164, 194))


def art_interview(img, d, top, bottom):
    """A practice interview, as it looks in the app."""
    x, w = 84, W - 168
    y = top + (bottom - top - 344) // 2
    bubbles = [
        ("O'zingiz haqingizda gapirib bering.", False),
        ("Men 2 yil sotuvda ishlaganman…", True),
        ("Mijoz rad etsa nima qilasiz?", False),
    ]
    for text, mine in bubbles:
        f = font(REG, 30)
        tw = min(d.textlength(text, font=f) + 56, w - 120)
        bx = x + w - tw if mine else x
        fill = (86, 122, 200) if mine else (36, 48, 84)
        d.rounded_rectangle([bx, y, bx + tw, y + 78], radius=24, fill=fill)
        d.text((bx + 28, y + 22), text, font=f, fill=WHITE)
        y += 96
    d.text((x + 46, y + 10), "Har javobga AI izoh va baho beradi",
           font=font(BOLD, 30), fill=ACCENT)
    # a small four-point star, drawn rather than typed
    sx, sy = x + 18, y + 26
    d.polygon([(sx, sy - 18), (sx + 6, sy - 6), (sx + 18, sy), (sx + 6, sy + 6),
               (sx, sy + 18), (sx - 6, sy + 6), (sx - 18, sy), (sx - 6, sy - 6)],
              fill=ACCENT)


def art_trust(img, d, top, bottom):
    """The fraud line the direct-contact model obliges us to say out loud."""
    cx = W // 2
    cy = top + (bottom - top - 420) // 2 + 150
    d.polygon([(cx, cy - 150), (cx + 120, cy - 96), (cx + 120, cy + 42),
               (cx, cy + 150), (cx - 120, cy + 42), (cx - 120, cy - 96)],
              fill=(32, 46, 84), outline=GREEN, width=6)
    d.text((cx - 26, cy - 76), "!", font=font(BLACK_F, 110), fill=ACCENT)
    # The headline already states the rule; this says what to DO about it.
    f = font(BOLD, 38)
    line = "To'lamang."
    d.text((cx - d.textlength(line, font=f) / 2, cy + 180), line, font=f, fill=WHITE)
    line2 = "Bizga xabar bering."
    d.text((cx - d.textlength(line2, font=f) / 2, cy + 228), line2, font=f, fill=ACCENT)


ART = {
    "contact": art_contact,
    "resume": art_resume,
    "match": art_match,
    "interview": art_interview,
    "trust": art_trust,
}


def draw_promo(spec: dict, out_path: str) -> str:
    img = base()
    d, y_end = chrome(img, spec["eyebrow"], spec["title"], spec["sub"])
    ART[spec["art"]](img, d, y_end + 24, H - 108 - 24)
    footer(d, spec.get("cta", "ishtopuz.uz"))
    img.save(out_path, "PNG", optimize=True)
    return out_path
