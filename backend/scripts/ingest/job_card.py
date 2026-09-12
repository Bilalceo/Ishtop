"""Render a vacancy as an image for the Telegram channel.

A channel post is read on a phone, in a feed, at speed — the card has to say the
job, the pay and the city before the reader decides to scroll. Everything on it
comes from the listing; nothing is filled in to make a card look complete (a
vacancy with no stated salary says "Kelishilgan", which is what the post said).

Uses the site's own brand blue (#6F9BF0) so the channel and the site read as one
thing.
"""
from __future__ import annotations

import os
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1080
INK = (18, 24, 38)
INK_SOFT = (96, 108, 132)
WHITE = (255, 255, 255)
BRAND = (111, 155, 240)
BRAND_DEEP = (46, 66, 120)
ACCENT = (255, 209, 102)

FONT_DIR = "/System/Library/Fonts/Supplemental"
BOLD = os.path.join(FONT_DIR, "Arial Bold.ttf")
REG = os.path.join(FONT_DIR, "Arial.ttf")
BLACK_F = os.path.join(FONT_DIR, "Arial Black.ttf")


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def fit(draw, text: str, path: str, max_w: int, start: int, min_size: int = 44):
    """Largest size at which `text` fits `max_w` on one line."""
    size = start
    while size > min_size:
        f = font(path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(path, min_size)


def money(smin, smax) -> str:
    def one(v):
        m = v / 1_000_000
        return f"{m:.0f}" if abs(m - round(m)) < 0.05 else f"{m:.1f}"
    if smin and smax:
        return f"{one(smin)}–{one(smax)} mln so'm"
    if smin:
        return f"{one(smin)} mln so'mdan"
    return "Kelishilgan"


def gradient_bg() -> Image.Image:
    """Vertical brand gradient, drawn row by row — no external asset needed."""
    img = Image.new("RGB", (W, H), BRAND_DEEP)
    d = ImageDraw.Draw(img)
    top, bottom = (36, 52, 100), (18, 26, 52)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)],
               fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def draw_card(job: dict, out_path: str, index: int | None = None) -> str:
    img = gradient_bg()
    d = ImageDraw.Draw(img)

    # a soft brand glow in the corner, so the flat gradient has a focal point
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 420, -260, W + 260, 400], fill=(70, 100, 190))
    img = Image.blend(img, glow, 0.0)  # keep the base; the ellipse is drawn below
    d = ImageDraw.Draw(img)
    for r, alpha in ((360, 18), (280, 22), (200, 26)):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([W - 180 - r, -140 - r, W - 180 + r, -140 + r],
                   fill=(*BRAND, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    pad = 84
    y = 92

    # ---- brand line
    f_brand = font(BLACK_F, 40)
    d.text((pad, y), "ishtop", font=f_brand, fill=WHITE)
    wbrand = d.textlength("ishtop", font=f_brand)
    d.text((pad + wbrand, y), ".uz", font=f_brand, fill=BRAND)
    if index:
        badge = f"TOP {index}"
        f_badge = font(BOLD, 30)
        bw = d.textlength(badge, font=f_badge)
        d.rounded_rectangle([W - pad - bw - 40, y - 4, W - pad, y + 50],
                            radius=26, fill=ACCENT)
        d.text((W - pad - bw - 20, y + 6), badge, font=f_badge, fill=(40, 30, 0))
    y += 108

    # ---- title, wrapped to at most three lines
    f_title = font(BOLD, 78)
    title = re.sub(r"\s+", " ", job["title"]).strip()
    lines, line = [], ""
    for word in title.split(" "):
        trial = f"{line} {word}".strip()
        if d.textlength(trial, font=f_title) <= W - 2 * pad:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
        if len(lines) == 3:
            break
    if line and len(lines) < 3:
        lines.append(line)
    if not lines:
        lines = [title[:24]]
    # long titles get a smaller face rather than a fourth line
    if len(lines) == 3 and d.textlength(lines[-1], font=f_title) > W - 2 * pad:
        f_title = font(BOLD, 64)

    # The facts sit at a fixed height above the footer — a one-line title and a
    # three-line one have to leave the card looking like the same design — and
    # the title block is centred in what is left, so a short title does not park
    # at the top over a band of empty gradient.
    strip_h = 128
    f_label = font(REG, 30)
    fact_y = H - strip_h - 300

    block_h = len(lines) * 92 + 24
    y = y + max(0, (fact_y - 56 - y - block_h) // 2)
    for l in lines:
        d.text((pad, y), l, font=f_title, fill=WHITE)
        y += 92
    y += 18
    d.line([(pad, y), (pad + 150, y)], fill=ACCENT, width=6)

    d.text((pad, fact_y), "OYLIK", font=f_label, fill=BRAND)
    salary = money(job.get("salary_min"), job.get("salary_max"))
    d.text((pad, fact_y + 44), salary,
           font=fit(d, salary, BOLD, W - 2 * pad, 62, 38), fill=ACCENT)

    d.text((pad, fact_y + 150), "JOYLASHUV", font=f_label, fill=BRAND)
    loc = job.get("location") or "O'zbekiston"
    d.text((pad, fact_y + 194), loc,
           font=fit(d, loc, BOLD, W - 2 * pad, 62, 36), fill=WHITE)

    # ---- footer strip
    d.rectangle([0, H - strip_h, W, H], fill=(255, 255, 255))
    f_cta = font(BOLD, 38)
    d.text((pad, H - strip_h + 26), "Aloqa va batafsil ma'lumot", font=f_cta, fill=INK)
    f_sub = font(REG, 30)
    d.text((pad, H - strip_h + 74), "ishtopuz.uz — ish beruvchiga to'g'ridan-to'g'ri",
           font=f_sub, fill=INK_SOFT)

    img.save(out_path, "PNG", optimize=True)
    return out_path


if __name__ == "__main__":
    import json
    import sys

    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for i, j in enumerate(jobs, 1):
        path = os.path.join(out_dir, f"card_{i:02d}.png")
        draw_card(j, path, index=i)
        print(f"  {path}  {j['title'][:44]}")
