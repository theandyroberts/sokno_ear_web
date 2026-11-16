#!/usr/bin/env python3
"""Render every venue logo in the Ear's four inks (Andy, 2026-11-16).

  python3 scripts/venue-logos-ear.py            # all logos in content/venues.json
  python3 scripts/venue-logos-ear.py earls kerns

Predominantly black ink #171512 on cream #F3E8D2, with pine #315D54 and rust #A94A34 as the
only accents, so the page reads as one piece. The venue's own file is never touched: it stays
at public/assets/venues/<file> and the registry keeps its path under `logoOriginal`, so a
venue that objects (or a mark that reads wrong) goes back by pointing `logo` at it again.
Output: public/assets/venues/ear/<file>. Grays run from ink to cream by lightness; any real
color becomes rust (reds, oranges, yellows, pinks) or pine (greens, blues, purples), darkened
toward ink where the original was dark. Shapes, lettering and transparency are unchanged.
"""
import colorsys
import json
import os
import re
import sys

import numpy as np
from PIL import Image

INK = np.array([0x17, 0x15, 0x12], float)
CREAM = np.array([0xF3, 0xE8, 0xD2], float)
PINE = np.array([0x31, 0x5D, 0x54], float)
RUST = np.array([0xA9, 0x4A, 0x34], float)
SRC, OUT = "public/assets/venues", "public/assets/venues/ear"
# Marks whose two colors would land on the same ink, or on ink over ink, and lose the lettering.
#   cool: what greens/blues become   gold: what light yellows and golds become
OVERRIDES = {
    "hi-wire": {"cool": CREAM},           # blue lettering on a black sign: pine on ink is unreadable
    "old-sevier-market": {"gold": CREAM},  # gold lettering on a maroon block: rust on rust vanishes
}


def remap(rgb, cool=PINE, gold=None):
    """rgb: float array (..., 3) in 0-255 -> the same shape in the four inks."""
    r, g, b = rgb[..., 0] / 255, rgb[..., 1] / 255, rgb[..., 2] / 255
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    hue = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(m, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(m, (mx - b) / np.maximum(d, 1e-6), 0)
    hue = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)) * 60 % 360
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    gray = INK + (CREAM - INK) * np.clip((lum - 0.12) / 0.76, 0, 1)[..., None]
    warm = (hue >= 300) | (hue < 68)
    accent = np.where(warm[..., None], RUST, cool)
    if gold is not None:
        accent = np.where(((hue >= 28) & (hue < 68) & (lum > 0.5))[..., None], gold, accent)
    # dark saturated colors (navy, maroon) sink toward ink; pale tints rise toward cream
    body = INK + (accent - INK) * np.clip(mx / 0.42, 0, 1)[..., None]
    pale = np.clip((lum - 0.72) / 0.28, 0, 1) * np.clip(1 - s / 0.5, 0, 1)
    body = body + (CREAM - body) * pale[..., None]
    k = np.clip((s - 0.16) / 0.2, 0, 1)[..., None] * np.clip(mx / 0.12, 0, 1)[..., None]
    return gray + (body - gray) * k


def recolor_png(src, dst, **kw):
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(float)
    out = np.concatenate([remap(a[..., :3], **kw), a[..., 3:]], axis=-1)
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype("uint8")).save(dst, optimize=True)


NAMED = {"white": "#ffffff", "black": "#000000", "red": "#ff0000", "blue": "#0000ff", "green": "#008000"}


def one(hexcolor, **kw):
    h = hexcolor.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    rgb = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)]], float)
    o = np.clip(remap(rgb, **kw)[0] + 0.5, 0, 255).astype(int)
    return "#%02x%02x%02x" % tuple(o)


def recolor_svg(src, dst, **kw):
    t = open(src, encoding="utf8").read()
    t = re.sub(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", lambda m: one(m.group(0), **kw), t)
    t = re.sub(r"rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)", lambda m: one("#%02x%02x%02x" % tuple(int(x) for x in m.groups()), **kw), t)
    t = re.sub(r'((?:fill|stroke|stop-color)\s*[:=]\s*"?)(white|black|red|blue|green)\b', lambda m: m.group(1) + one(NAMED[m.group(2)], **kw), t)
    open(dst, "w", encoding="utf8").write(t)


def main():
    reg = json.load(open("content/venues.json"))
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for key, v in reg["venues"].items():
        orig = v.get("logoOriginal") or v.get("logo")
        if not orig or (only and key not in only):
            continue
        name = os.path.basename(orig)
        src, dst = os.path.join(SRC, name), os.path.join(OUT, name)
        (recolor_svg if name.endswith(".svg") else recolor_png)(src, dst, **OVERRIDES.get(key, {}))
        v["logoOriginal"] = f"/assets/venues/{name}"
        v["logo"] = f"/assets/venues/ear/{name}"
        print(f"{key}: {dst}")
    reg["_treatments"]["ear-inks"] = "every entry: `logo` is the mark re-inked in the Ear's four colors by scripts/venue-logos-ear.py (ink, cream, pine, rust; Andy, 2026-11-16); `logoOriginal` is the venue's own file, untouched, and `treatment` still describes how that original was prepared. To put a venue back, set `logo` to `logoOriginal`."
    json.dump(reg, open("content/venues.json", "w"), indent=2, ensure_ascii=False)
    open("content/venues.json", "a").write("\n")


if __name__ == "__main__":
    main()
