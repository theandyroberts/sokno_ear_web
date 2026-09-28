#!/usr/bin/env python3
"""Composite titled banners onto the week's engravings for Instagram.

    python3 scripts/ig-banners.py <episode-slug>
    python3 scripts/ig-banners.py <episode-slug> --colors   # print the band colors, draw nothing

Reads content/episodes/<slug>.json; for every story with social.igBanner
(["Line one", "line two"]) it takes the story's engraving from public/ and
writes public/assets/ig/<slug>/<id>.jpg. scripts/ig-queue.mjs prefers these
automatically.

Design — the Ear's own print language, readability first:
  · band color = the place's own color for the FIRST story from that place, then
    whichever palette color the week has used least (see band_colors) — a week of
    Ijams Park stories used to come out as a wall of teal
  · double ink rule between art and band; thin keyline frame inset in the band
  · line 1: PT Serif Bold (the site's headline font)
  · line 2: Special Elite caps, letterspaced, flanked by ★ (the label/ribbon look)
  · cream text on dark bands, ink text on light bands
Fonts are the site's own (Google Fonts, OFL) vendored in scripts/fonts/.
Square art gains a 25% band → exactly 4:5, Instagram's tallest feed ratio.
"""
import json, math, pathlib, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "scripts" / "fonts"

INK = "#171512"
CREAM = "#F3E8D2"
BAND = {  # story labelColor → band fill (app/ds/colors.css)
    "rust": "#A94A34",
    "teal": "#7FAEA3",
    "green": "#315D54",
    "gold": "#D8A725",
    "ink": "#171512",
}
DARK_BANDS = {"rust", "green", "ink"}  # cream text; light bands get ink text

# Order a story reaches for when its place's color is already taken. Gold first: the
# three best-read banners on record are gold, and no gold banner has read below 8.
ROTATION = ["gold", "rust", "green", "ink", "teal"]

def has_banner(s):
    return bool((s.get("social") or {}).get("igBanner")) and bool(s.get("image"))

def band_colors(stories):
    """Band color for each story that gets a banner: {story id: color name}.

    A story's labelColor is its PLACE (Old Sevier rust, Ijams Park teal, Kern's green).
    That is right for the pills on the site, where the color is how you find a place.
    On Instagram it meant the band said only how many stories a place had: No. 15 was
    9 teal banners out of 12 and No. 14 was 8 of 11, while the six best posts on record
    are gold, ink, gold, rust, green and gold (docs/ig-reviews/2026-09-28.md).

    So, in the episode's own order: the first story from a place keeps the place's
    color; every later story from that place takes the color the week has used least,
    ROTATION breaking ties. `social.igBand` names a color outright and always wins.
    """
    used = {c: 0 for c in ROTATION}
    places = set()
    out = {}
    for s in stories:
        if not has_banner(s):
            continue
        place = s.get("labelColor", "rust")
        forced = (s.get("social") or {}).get("igBand")
        if forced in BAND:
            color = forced
        elif place in BAND and place not in places:
            color = place
        else:
            color = min(ROTATION, key=lambda c: (used[c], ROTATION.index(c)))
        places.add(place)
        used[color] = used.get(color, 0) + 1
        out[s["id"]] = color
    return out

def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)

def fit(d, text, name, max_w, start, tracking=0.0):
    size = start
    while size > 14:
        f = font(name, size)
        w = tracked_len(d, text, f, tracking * size)
        if w <= max_w:
            return f, tracking * size
        size -= 2
    return font(name, 14), tracking * 14

def tracked_len(d, text, f, tr):
    if not text:
        return 0
    return sum(d.textlength(c, font=f) for c in text) + tr * (len(text) - 1)

def draw_tracked(d, x, y, text, f, fill, tr):
    for c in text:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + tr

def star(d, cx, cy, r, fill):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill)

def banner(src, dst, line1, line2, label_color):
    img = Image.open(src).convert("RGB")
    w, h = img.size
    band = BAND.get(label_color, BAND["rust"])
    text_col = CREAM if label_color in DARK_BANDS else INK
    band_h = int(w * (0.25 if h / w >= 0.9 else 0.18))

    # double ink rule between art and band, like the paper's section rules
    rule = max(3, w // 280)
    gap = max(2, rule // 2)
    thin = max(2, rule // 2)
    rules_h = rule + gap + thin

    out = Image.new("RGB", (w, h + rules_h + band_h), band)
    out.paste(img, (0, 0))
    d = ImageDraw.Draw(out)
    d.rectangle([0, h, w, h + rule], fill=INK)
    d.rectangle([0, h + rule + gap, w, h + rule + gap + thin], fill=INK)

    # thin keyline frame inset in the band (the bordered-well look)
    top = h + rules_h
    inset = int(w * 0.028)
    kw = max(2, w // 500)
    d.rectangle([inset, top + inset, w - inset, top + band_h - inset], outline=text_col, width=kw)

    line2 = line2.upper()
    max_w1 = w - 2 * (inset + int(w * 0.045))
    max_w2 = w - 2 * (inset + int(w * 0.11))  # leave room for the flanking stars
    f1, _ = fit(d, line1, "PTSerif-Bold.ttf", max_w1, int(band_h * 0.31))
    f2, tr2 = fit(d, line2, "SpecialElite-Regular.ttf", max_w2, int(band_h * 0.21), tracking=0.14)

    b1 = d.textbbox((0, 0), line1, font=f1)
    h1 = b1[3] - b1[1]
    b2 = d.textbbox((0, 0), line2, font=f2)
    h2 = b2[3] - b2[1]
    vgap = int(band_h * 0.10)
    block = h1 + vgap + h2
    ty1 = top + (band_h - block) // 2
    ty2 = ty1 + h1 + vgap

    x1 = (w - d.textlength(line1, font=f1)) // 2
    d.text((x1 - b1[0], ty1 - b1[1]), line1, font=f1, fill=text_col)

    w2 = tracked_len(d, line2, f2, tr2)
    x2 = (w - w2) // 2
    draw_tracked(d, x2 - b2[0], ty2 - b2[1], line2, f2, text_col, tr2)

    # ★ flanks on the label line — the masthead-ribbon signature
    r = h2 * 0.42
    cy = ty2 + h2 / 2
    star(d, x2 - r * 2.0, cy, r, text_col)
    star(d, x2 + w2 + r * 2.0, cy, r, text_col)

    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "JPEG", quality=88)
    print(f"  ✓ {dst.name}  ({out.size[0]}x{out.size[1]}, {label_color} band)")

def main():
    slug = sys.argv[1]
    episode = json.loads((ROOT / "content" / "episodes" / f"{slug}.json").read_text())
    stories = [episode["feature"], *episode["stories"]]
    colors = band_colors(stories)
    if "--colors" in sys.argv:
        print(json.dumps(colors))
        return
    made = 0
    for s in stories:
        if not has_banner(s):
            continue
        lines = s["social"]["igBanner"]
        src = ROOT / "public" / s["image"].lstrip("/")
        dst = ROOT / "public" / "assets" / "ig" / slug / f"{s['id']}.jpg"
        banner(src, dst, lines[0], lines[1] if len(lines) > 1 else "", colors[s["id"]])
        made += 1
    print(f"{made} banner image(s) for {slug}")

if __name__ == "__main__":
    main()
