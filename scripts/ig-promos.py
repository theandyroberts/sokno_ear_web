#!/usr/bin/env python3
"""Weekly Instagram promo pair, posted the moment an episode drops (feed dividers).

    python3 scripts/ig-promos.py <episode-slug>

Writes to public/assets/ig/<slug>/:
  episode-drop.jpg  — "NEW EPISODE" card: ink black + masthead-teal ribbon + gold URL.
                      Deliberately different from the engraving posts so it reads as
                      a divider between weeks in the grid.
  call-the-ear.jpg  — the synthwave "call in your events" ad matching the site's
                      Ear-sees-the-future card: neon on dark violet, big phone number.

scripts/ig-queue.mjs schedules both at staging time (episode drop = publish moment).
All text is rasterized real type — never AI-generated lettering.
"""
import json, math, pathlib, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "scripts" / "fonts"

INK = (23, 21, 18)
CREAM = (243, 232, 210)
TEAL = (127, 174, 163)
RUST = (169, 74, 52)
GOLD = (216, 167, 37)

W, H = 1080, 1350

def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), int(size))

def fit(d, text, name, max_w, start, tracking=0.0):
    size = start
    while size > 16:
        f = font(name, size)
        if tracked_len(d, text, f, tracking * size) <= max_w:
            return f, tracking * size
        size -= 3
    return font(name, 16), tracking * 16

def tracked_len(d, text, f, tr):
    return sum(d.textlength(c, font=f) for c in text) + tr * max(0, len(text) - 1)

def draw_tracked(d, x, y, text, f, fill, tr):
    for c in text:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + tr

def centered(d, y, text, f, fill, tr=0.0):
    w = tracked_len(d, text, f, tr)
    b = d.textbbox((0, 0), text, font=f)
    draw_tracked(d, (W - w) / 2 - b[0], y - b[1], text, f, fill, tr)
    return b[3] - b[1], w

def star(d, cx, cy, r, fill):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill)

# ── 1. NEW EPISODE card ────────────────────────────────────────────────────────
def episode_drop(ep, dst):
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)

    # double cream rules top + bottom (the section-rule signature, inverted)
    for y in (64, H - 76):
        d.rectangle([60, y, W - 60, y + 7], fill=CREAM)
        d.rectangle([60, y + 13, W - 60, y + 16], fill=CREAM)

    # kicker in masthead teal, star-flanked
    f_k = font("SpecialElite-Regular.ttf", 42)
    hk, wk = centered(d, 170, "THE SOUTH KNOXVILLE EAR", f_k, TEAL, tr=5)
    star(d, (W - wk) / 2 - 46, 170 + hk / 2, 17, RUST)
    star(d, (W + wk) / 2 + 46, 170 + hk / 2, 17, RUST)

    # the big words
    f_new = font("PTSerif-Bold.ttf", 250)
    centered(d, 300, "NEW", f_new, CREAM)
    f_ep, _ = fit(d, "EPISODE", "PTSerif-Bold.ttf", W - 150, 210)
    centered(d, 590, "EPISODE", f_ep, CREAM)

    # teal ribbon band with ink keylines + vol/no/date
    top, bot = 920, 1058
    d.rectangle([0, top, W, bot], fill=TEAL)
    d.rectangle([0, top + 10, W, top + 13], fill=INK)
    d.rectangle([0, bot - 13, W, bot - 10], fill=INK)
    label = f"VOL. {ep['volume']} — NO. {ep['number']}  ·  {ep.get('shortDate', ep['date']).upper()}"
    f_b, tr_b = fit(d, label, "SpecialElite-Regular.ttf", W - 300, 52, tracking=0.08)
    hb, wb = centered(d, top + (bot - top - 52) / 2, label, f_b, INK, tr=tr_b)
    star(d, (W - wb) / 2 - 52, top + (bot - top) / 2, 16, RUST)
    star(d, (W + wb) / 2 + 52, top + (bot - top) / 2, 16, RUST)

    # gold URL
    f_u = font("SpecialElite-Regular.ttf", 56)
    centered(d, 1160, "SOKNOEAR.COM", f_u, GOLD, tr=6)

    img.save(dst, "JPEG", quality=90)
    print(f"  ✓ {dst.name}  ({W}x{H})")

# ── 2. synthwave call-in ad ───────────────────────────────────────────────────
V_TOP = (27, 16, 51)
V_BOT = (47, 17, 73)
CYAN = (83, 242, 230)
AMBER = (255, 209, 102)
LAVENDER = (207, 194, 239)
NEON_PURPLE = (178, 61, 242)

def glow_text_centered(base, y, text, f, fill, tr=0.0, radius=16, passes=2):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    w = tracked_len(ld, text, f, tr)
    b = ld.textbbox((0, 0), text, font=f)
    x = (base.size[0] - w) / 2 - b[0]
    draw_tracked(ld, x, y - b[1], text, f, fill + (255,), tr)
    blur = layer.filter(ImageFilter.GaussianBlur(radius))
    for _ in range(passes):
        base.alpha_composite(blur)
    base.alpha_composite(layer)
    return b[3] - b[1], w

def call_the_ear(dst):
    img = Image.new("RGB", (W, H), V_TOP)
    d = ImageDraw.Draw(img)
    for y in range(H):  # vertical gradient
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(V_TOP, V_BOT)))
    img = img.convert("RGBA")

    # perspective grid horizon
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    horizon = 1015
    ys, gap = horizon, 14
    while ys < H + 60:
        gd.line([(0, ys), (W, ys)], fill=NEON_PURPLE + (120,), width=3)
        ys += gap; gap = int(gap * 1.38)
    for i in range(-8, 9):
        gd.line([(W / 2 + i * 46, horizon), (W / 2 + i * 250, H)], fill=NEON_PURPLE + (110,), width=3)
    img.alpha_composite(grid.filter(ImageFilter.GaussianBlur(1)))

    d = ImageDraw.Draw(img)

    # chip
    f_chip = font("SpecialElite-Regular.ttf", 37)
    chip_txt = "THE EAR SEES THE FUTURE"
    cw = tracked_len(d, chip_txt, f_chip, 4)
    cx0, cy0 = (W - cw) / 2 - 38, 118
    d.rounded_rectangle([cx0, cy0, cx0 + cw + 76, cy0 + 74], radius=37, outline=CYAN, width=4)
    glow_text_centered(img, 136, chip_txt, f_chip, CYAN, tr=4, radius=10, passes=1)
    d = ImageDraw.Draw(img)

    # headline
    f_h = font("PTSerif-Bold.ttf", 88)
    glow_text_centered(img, 300, "KNOW SOMETHING", f_h, (255, 255, 255), radius=8, passes=1)
    glow_text_centered(img, 405, "BEFORE IT HAPPENS?", f_h, (255, 255, 255), radius=8, passes=1)

    # call or text
    f_c = font("SpecialElite-Regular.ttf", 58)
    glow_text_centered(img, 575, "CALL OR TEXT", f_c, CYAN, tr=10, radius=12, passes=2)

    # the number — the hero
    d = ImageDraw.Draw(img)
    f_n, _ = fit(d, "865-252-6500", "PTSerif-Bold.ttf", W - 110, 165)
    glow_text_centered(img, 680, "865-252-6500", f_n, AMBER, radius=20, passes=2)

    # supporting lines
    f_s = font("SpecialElite-Regular.ttf", 40)
    glow_text_centered(img, 890, "EVENTS · NEWS · FOOD & DRINK SPECIALS", f_s, LAVENDER, tr=2, radius=6, passes=1)
    glow_text_centered(img, 950, "AI ANSWERS 24/7 · NO FORMS, NO WAITING", f_s, LAVENDER, tr=2, radius=6, passes=1)
    f_u = font("SpecialElite-Regular.ttf", 46)
    glow_text_centered(img, 1120, "SOKNOEAR.COM", f_u, CYAN, tr=6, radius=10, passes=1)

    img.convert("RGB").save(dst, "JPEG", quality=90)
    print(f"  ✓ {dst.name}  ({W}x{H})")

def main():
    slug = sys.argv[1]
    ep = json.loads((ROOT / "content" / "episodes" / f"{slug}.json").read_text())
    out = ROOT / "public" / "assets" / "ig" / slug
    out.mkdir(parents=True, exist_ok=True)
    episode_drop(ep, out / "episode-drop.jpg")
    call_the_ear(out / "call-the-ear.jpg")

if __name__ == "__main__":
    main()
