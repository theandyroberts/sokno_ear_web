#!/usr/bin/env python3
"""Cut the week's Reel from the audio briefing.

    python3 scripts/ig-reel.py <episode-slug>              → public/assets/ig/<slug>/reel.mp4 + reel.jpg
    python3 scripts/ig-reel.py <episode-slug> --max 60     → cap the Reel at 60 seconds (default 60)
    python3 scripts/ig-reel.py <episode-slug> --plan       → print the cut (paragraphs, banners, seconds), draw nothing

What it is: the briefing's open and as many story paragraphs as fit the cap, each
over the banner of the story it is about, with the spoken sentence burned in under
the picture. 1080×1920, 30 fps, H.264 + AAC — what Instagram's REELS container takes.

How it is cut (the Oct 5 sample's recipe, docs/ig-reviews/2026-10-05.md):
  · paragraphs come from the "Clean reading version" of content/audio-scripts/<slug>.md
    (real spellings; the TTS section says "Severe Avenue")
  · paragraph boundaries in the mp3: each one is expected from the paragraph's share of
    the characters and snapped to the longest nearby pause from ffmpeg's silencedetect
    (the script's 1.2 s breaks come out of the TTS at 0.8–1.0 s, sentence ends at 0.5–0.75)
  · within a paragraph, sentences get time in proportion to their length
  · each story paragraph takes the banner whose title shares the most words with it;
    the open and the sign-off take the episode card
  · the mini's ffmpeg has no drawtext, so every caption is a Pillow frame and the frames
    go through ffmpeg's concat demuxer with their durations

Fonts and colours are the banners' own (scripts/ig-banners.py).
"""
import json, math, pathlib, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "scripts" / "fonts"

W, H = 1080, 1920
FPS = 30
INK = "#171512"
CREAM = "#F3E8D2"
TEAL = "#7FAEA3"
RUST = "#A94A34"
GOLD = "#D8A725"

MIN_SILENCE = 0.5          # every pause worth considering; paragraph breaks come out 0.8–1.0 s
NOISE_DB = -30
STOP = set("the and that with this from for are its it's into onto your you they them there their here have has had was were will been being than then also just about after before over under more most some into out off up down one two three four five six seven eight nine ten".split())


def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


def star(d, cx, cy, r, fill):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill)


def tracked_len(d, text, f, tr):
    return sum(d.textlength(c, font=f) for c in text) + tr * (len(text) - 1) if text else 0


def draw_tracked_centered(d, y, text, f, fill, tr=0.0):
    w = tracked_len(d, text, f, tr)
    x = (W - w) / 2
    for c in text:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + tr
    return w


# ── the script ────────────────────────────────────────────────────────────────
def paragraphs(script_md: str):
    """The spoken paragraphs, real spellings. Prefers the clean reading version."""
    m = re.search(r"^## Clean reading version\s*$(.*?)(?=^## |\Z)", script_md, re.M | re.S)
    if not m:
        m = re.search(r"^## Script.*?$(.*?)(?=^## |^---\s*$|\Z)", script_md, re.M | re.S)
    body = (m.group(1) if m else script_md).strip()
    body = re.sub(r"^---\s*$", "", body, flags=re.M)
    paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", body)]
    return [p for p in paras if p and not p.startswith(">") and not p.startswith("#")]


def sentences(text):
    out, buf = [], ""
    for piece in re.split(r"(?<=[.!?])\s+(?=[A-Z\"“$0-9])", text):
        piece = piece.strip()
        if not piece:
            continue
        # keep very short fragments with their neighbour so a caption never flashes
        if buf and len(piece) < 24:
            buf = f"{buf} {piece}"
            continue
        if buf:
            out.append(buf)
        buf = piece
    if buf:
        out.append(buf)
    return out


# ── the audio ─────────────────────────────────────────────────────────────────
def ffprobe_duration(mp3):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def silences(mp3):
    """[(start, end), …] of every silence ≥ MIN_SILENCE, from ffmpeg's silencedetect."""
    res = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp3), "-af",
                          f"silencedetect=noise={NOISE_DB}dB:d={MIN_SILENCE}", "-f", "null", "-"],
                         capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", res.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", res.stderr)]
    return list(zip(starts, ends))


def paragraph_spans(paras, mp3):
    """[(start, end)] per paragraph.

    The TTS asks for a 1.2 s break between paragraphs and ElevenLabs v3 gives it
    0.8–1.0 s, while a sentence end gets 0.5–0.75 s — close enough that a threshold
    alone can't tell them apart. So each boundary is EXPECTED from the paragraph's
    share of the characters (measured from the last boundary found, so drift doesn't
    build), and then SNAPPED to the pause near that time that is longest after a small
    penalty for distance. Returns (spans, how)."""
    total = ffprobe_duration(mp3)
    pauses = [s for s in silences(mp3) if s[0] > 0.5 and s[1] < total - 0.5]
    chars = [len(p) for p in paras]
    edges = [0.0]
    snapped = 0
    for i in range(len(paras) - 1):
        left_chars = sum(chars[i:])
        left_time = total - edges[-1]
        expect = edges[-1] + left_time * chars[i] / left_chars
        window = max(4.0, 0.3 * left_time * chars[i] / left_chars)
        best, score = None, -1e9
        for a, b in pauses:
            mid = (a + b) / 2
            if mid <= edges[-1] + 1.0 or abs(mid - expect) > window:
                continue
            sc = (b - a) - 0.02 * abs(mid - expect)
            if sc > score:
                best, score = mid, sc
        if best is None:
            edges.append(expect)
        else:
            edges.append(best)
            snapped += 1
    edges.append(total)
    how = f"{snapped} of {len(paras) - 1} boundaries snapped to a pause"
    return [(edges[i], edges[i + 1]) for i in range(len(paras))], how


# ── the banners ───────────────────────────────────────────────────────────────
def words(s):
    return {w for w in re.findall(r"[a-z0-9']+", s.lower()) if len(w) >= 4 and w not in STOP}


def banner_for(para, stories, used):
    """The story whose title and banner lines share the most words with the paragraph."""
    pw = words(para)
    best, score = None, 0
    for s in stories:
        if s["id"] in used:
            continue
        sw = words(s.get("title", "")) | words(" ".join((s.get("social") or {}).get("igBanner") or []))
        n = len(pw & sw)
        if n > score:
            best, score = s, n
    return (best["id"], score) if best and score >= 2 else (None, score)


# ── the frames ────────────────────────────────────────────────────────────────
def wrap(d, text, f, max_w):
    lines, line = [], ""
    for w in text.split():
        trial = f"{line} {w}".strip()
        if d.textlength(trial, font=f) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def frame(banner_path, caption, kicker, dst):
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)

    # masthead: double ink rule, the kicker star-flanked, episode line
    d.rectangle([60, 70, W - 60, 76], fill=INK)
    d.rectangle([60, 82, W - 60, 85], fill=INK)
    f_k = font("SpecialElite-Regular.ttf", 40)
    wk = draw_tracked_centered(d, 112, "THE SOUTH KNOXVILLE EAR", f_k, INK, tr=5)
    star(d, (W - wk) / 2 - 44, 112 + 24, 15, RUST)
    star(d, (W + wk) / 2 + 44, 112 + 24, 15, RUST)
    f_e = font("SpecialElite-Regular.ttf", 30)
    draw_tracked_centered(d, 172, kicker.upper(), f_e, RUST, tr=3)

    # the banner, framed in ink
    art = Image.open(banner_path).convert("RGB")
    aw = 980
    ah = round(art.size[1] * aw / art.size[0])
    ah = min(ah, 1260)
    art = art.resize((aw, ah), Image.LANCZOS)
    ax, ay = (W - aw) // 2, 240
    d.rectangle([ax - 6, ay - 6, ax + aw + 6, ay + ah + 6], fill=INK)
    img.paste(art, (ax, ay))

    # the spoken line
    f_c = font("PTSerif-Bold.ttf", 46)
    lines = wrap(d, caption, f_c, W - 2 * 90)
    while len(lines) > 4:
        f_c = font("PTSerif-Bold.ttf", f_c.size - 4)
        lines = wrap(d, caption, f_c, W - 2 * 90)
    lh = f_c.size * 1.28
    top = ay + ah + 54
    for i, line in enumerate(lines):
        tw = d.textlength(line, font=f_c)
        d.text(((W - tw) / 2, top + i * lh), line, font=f_c, fill=INK)

    # foot
    d.rectangle([60, H - 118, W - 60, H - 112], fill=INK)
    f_f = font("SpecialElite-Regular.ttf", 28)
    draw_tracked_centered(d, H - 92, "HEAR THE WHOLE BRIEFING — LINK IN BIO", f_f, INK, tr=3)

    img.save(dst, "PNG", compress_level=1)


# ── the cut ───────────────────────────────────────────────────────────────────
def plan_cut(episode, paras, spans, banners_dir, max_s):
    """Which paragraphs go in, over which banner. Always the open and the first story."""
    stories = [episode["feature"], *episode["stories"]]
    cover = banners_dir / "episode-drop.jpg"
    used = set()
    cut = []
    for i, (para, (a, b)) in enumerate(zip(paras, spans)):
        is_open = i == 0
        is_last = i == len(paras) - 1
        if not is_open and i > 1 and b > max_s:
            break
        if is_open or is_last:
            banner, why = cover, "card"
        else:
            sid, score = banner_for(para, stories, used)
            if sid and (banners_dir / f"{sid}.jpg").exists():
                banner, why = banners_dir / f"{sid}.jpg", f"{sid} ({score} words)"
                used.add(sid)
            else:
                banner, why = (cut[-1]["banner"] if cut else cover), "kept the last picture"
        cut.append({"i": i, "text": para, "start": a, "end": b, "banner": banner, "why": why})
    return cut


def build(slug, max_s=60, plan_only=False):
    ep = json.loads((ROOT / "content" / "episodes" / f"{slug}.json").read_text())
    script = (ROOT / "content" / "audio-scripts" / f"{slug}.md").read_text()
    mp3 = ROOT / "public" / "audio" / f"{slug}.mp3"
    banners_dir = ROOT / "public" / "assets" / "ig" / slug
    out_mp4 = banners_dir / "reel.mp4"
    out_jpg = banners_dir / "reel.jpg"
    if not mp3.exists():
        sys.exit(f"no audio at {mp3}")
    if not (banners_dir / "episode-drop.jpg").exists():
        sys.exit(f"no episode card in {banners_dir} (run scripts/ig-promos.py first)")

    paras = paragraphs(script)
    spans, how = paragraph_spans(paras, mp3)
    cut = plan_cut(ep, paras, spans, banners_dir, max_s)
    end = cut[-1]["end"]
    kicker = f"No. {ep['number']} · {ep.get('shortDate', ep['date'])}"

    print(f"reel for {slug}: {len(cut)} of {len(paras)} paragraphs, {end:.1f}s, boundaries {how}")
    for c in cut:
        print(f"  {c['start']:6.1f}–{c['end']:6.1f}  {c['banner'].name:32} {c['why']:28} {c['text'][:60]}…")
    if plan_only:
        return

    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        listing = []
        n = 0
        poster = None
        for c in cut:
            sents = sentences(c["text"])
            total_chars = sum(len(s) for s in sents)
            t = c["start"]
            for s in sents:
                dur = (c["end"] - c["start"]) * len(s) / total_chars
                png = tmp / f"f{n:04d}.png"
                frame(c["banner"], s, kicker, png)
                listing.append(f"file '{png}'\nduration {dur:.3f}")
                if poster is None and c["i"] == 1:
                    poster = png
                n += 1
        # concat wants the last file repeated so its duration is honoured
        listing.append(f"file '{tmp / f'f{n - 1:04d}.png'}'")
        (tmp / "list.txt").write_text("\n".join(listing) + "\n")

        fade_at = max(0.0, end - 0.6)
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
            "-i", str(mp3),
            "-t", f"{end:.3f}",
            "-vf", f"fps={FPS},format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
            "-af", f"afade=t=out:st={fade_at:.3f}:d=0.6",
            "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
            "-movflags", "+faststart", "-shortest",
            str(out_mp4),
        ], check=True)
        Image.open(poster or tmp / "f0000.png").convert("RGB").save(out_jpg, "JPEG", quality=88)

    size = out_mp4.stat().st_size / 1e6
    print(f"  ✓ {out_mp4.relative_to(ROOT)}  ({end:.1f}s, {size:.1f} MB, {n} frames)")
    print(f"  ✓ {out_jpg.relative_to(ROOT)}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    max_s = 60
    if "--max" in sys.argv:
        max_s = float(sys.argv[sys.argv.index("--max") + 1])
    build(args[0], max_s=max_s, plan_only="--plan" in sys.argv)
