#!/usr/bin/env python3
"""Composite title banners onto the week's engravings for Instagram.

    python3 scripts/ig-banners.py <edition-slug>

Reads content/editions/<slug>.json; for every story with social.igBanner
(["Line one", "line two"]) it takes the story's engraving from public/ and
writes public/assets/ig/<slug>/<id>.jpg — the engraving with a rust band
below carrying the two lines in real rendered type (line 2 ALL CAPS).
scripts/ig-queue.mjs prefers these files automatically when they exist.

Square art gains a 25% band → exactly 4:5, Instagram's tallest feed ratio.
"""
import json, sys, pathlib
from PIL import Image, ImageDraw, ImageFont

RUST = "#A94A34"
CREAM = "#F3E8D2"
INK = "#171512"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",      # macOS
    "/System/Library/Fonts/Helvetica.ttc",                     # macOS fallback
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",    # linux
]

def load_font(size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default(size)

def fit(draw, text, max_width, start_size):
    size = start_size
    while size > 14:
        font = load_font(size)
        if draw.textlength(text, font=font) <= max_width:
            return font
        size -= 2
    return load_font(14)

def banner(src: pathlib.Path, dst: pathlib.Path, line1: str, line2: str):
    img = Image.open(src).convert("RGB")
    w, h = img.size
    band_h = int(w * (0.25 if h / w >= 0.9 else 0.18))  # square art → exact 4:5
    rule_h = max(3, w // 300)

    out = Image.new("RGB", (w, h + rule_h + band_h), RUST)
    out.paste(img, (0, 0))
    d = ImageDraw.Draw(out)
    d.rectangle([0, h, w, h + rule_h], fill=INK)  # thin ink rule, like the site's borders

    line2 = line2.upper()
    pad = int(w * 0.06)
    f1 = fit(d, line1, w - 2 * pad, int(band_h * 0.30))
    f2 = fit(d, line2, w - 2 * pad, int(band_h * 0.34))
    h1 = d.textbbox((0, 0), line1, font=f1)[3]
    h2 = d.textbbox((0, 0), line2, font=f2)[3]
    gap = int(band_h * 0.10)
    top = h + rule_h + (band_h - (h1 + gap + h2)) // 2
    d.text(((w - d.textlength(line1, font=f1)) // 2, top), line1, font=f1, fill=CREAM)
    d.text(((w - d.textlength(line2, font=f2)) // 2, top + h1 + gap), line2, font=f2, fill=CREAM)

    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "JPEG", quality=88)
    print(f"  ✓ {dst}  ({out.size[0]}x{out.size[1]})")

def main():
    slug = sys.argv[1]
    root = pathlib.Path(__file__).resolve().parent.parent
    edition = json.loads((root / "content" / "editions" / f"{slug}.json").read_text())
    stories = [edition["feature"], *edition["stories"]]
    made = 0
    for s in stories:
        lines = (s.get("social") or {}).get("igBanner")
        if not lines or not s.get("image"):
            continue
        src = root / "public" / s["image"].lstrip("/")
        dst = root / "public" / "assets" / "ig" / slug / f"{s['id']}.jpg"
        banner(src, dst, lines[0], lines[1] if len(lines) > 1 else "")
        made += 1
    print(f"{made} banner image(s) for {slug}")

if __name__ == "__main__":
    main()
