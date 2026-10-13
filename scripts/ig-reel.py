#!/usr/bin/env python3
"""Cut the week's Reel: one quick quip per story, each over that story's artwork.

    python3 scripts/ig-reel.py <episode-slug>              → public/assets/ig/<slug>/reel.mp4 + reel.jpg
    python3 scripts/ig-reel.py <episode-slug> --plan       → print the cut (quips, seconds), render nothing, no TTS
    python3 scripts/ig-reel.py <episode-slug> --max 90     → cap the Reel at 90 seconds (default 120, so a 16-story week keeps every story)

What it is (Andy, 2026-10-13: "a quick quip about each of the featured events, and
the screen changes to show the event artwork and info for each one"): a cover card
and a one-line intro, then every story in the episode's order — its banner pushing
in slowly, the when and where under it, the quip spoken and burned in — then the
card again and a sign-off. 1080×1920, 30 fps, H.264 + AAC, what the REELS container
takes. Roughly four seconds a story; a 16-story week runs about 75 s.

Where the quips come from, in order:
  1. content/reel-scripts/<slug>.json   {"intro": "…", "outro": "…", "quips": {"<story id>": "…"}}
     — written by the Tuesday draft task alongside the audio script
  2. the story's `social.igQuip`
  3. the banner's two lines, joined ("Old Sevier Market opens on Sevier Avenue. Saturday, seven in the morning.")

The voice is the briefing's own ElevenLabs voice (`fnpVoGi5UsfmnuvEQTHG`, eleven_v3,
the settings content/audio-scripts/ headers record), one call per quip so every
segment's length is exact — no pause-hunting in a long take. The TTS respellings
(SoKno → Sohno, Sevier → Severe, Ijams → Imes …) come from content/LEXICON.md; the
burned-in caption keeps the real spelling. Audio is cached by text in data/reel-tts/
(gitignored), so a rebuild only pays for lines that changed. The key is
$ELEVENLABS_API_KEY or the macOS keychain item ELEVENLABS_API_KEY — the same place
the ElevenLabs MCP reads it, so this runs wherever the briefing is rendered.

Frames are drawn with Pillow and piped raw into ffmpeg (the mini's ffmpeg has no
drawtext); the quip audio is laid on the timeline with adelay + amix.
"""
import hashlib, json, math, os, pathlib, re, subprocess, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "scripts" / "fonts"
TTS_CACHE = ROOT / "data" / "reel-tts"

W, H = 1080, 1920
FPS = 30
INK = "#171512"
CREAM = "#F3E8D2"
RUST = "#A94A34"
GRAY = "#6B655C"

VOICE_ID = "fnpVoGi5UsfmnuvEQTHG"
MODEL_ID = "eleven_v3"
VOICE_SETTINGS = {"stability": 0.5, "similarity_boost": 0.8}
OUTPUT_FORMAT = "mp3_44100_192"

LEAD_IN = 0.25      # silence before a quip starts, s
TAIL = 0.35         # silence after it ends
PUSH_IN = 0.06      # how far the artwork zooms across its segment
MIN_STORIES = 3

# Respellings the LEXICON doesn't carry as a table row (the audio-script headers do).
EXTRA_TTS = {"Kern's": "Kerns", "Kerns'": "Kerns", "WDVX": "W D V X", "soknoear.com": "Sohno Ear dot com"}


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


# ── the words ─────────────────────────────────────────────────────────────────
def tts_respellings():
    """{"Sevier": "Severe", …} from the LEXICON's pronunciation table, plus EXTRA_TTS."""
    out = dict(EXTRA_TTS)
    try:
        lex = (ROOT / "content" / "LEXICON.md").read_text()
    except FileNotFoundError:
        return out
    for row in lex.splitlines():
        if not row.startswith("|"):
            continue
        cells = [c.strip() for c in row.strip("|").split("|")]
        if len(cells) < 3:
            continue
        name = re.sub(r"\*", "", cells[0]).strip()
        name = re.sub(r"\s+(Ave|Avenue|Park)$", "", name)
        m = re.search(r"spell it \*\*`([^`]+)`\*\*", row)
        if name and m and name.lower() != m.group(1).lower():
            out[name] = m.group(1)
    return out


def for_tts(text, respell):
    for word, said in sorted(respell.items(), key=lambda kv: -len(kv[0])):
        text = re.sub(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", said, text)
    return text


def fact(story, *labels):
    for lab in labels:
        for f in story.get("facts") or []:
            if re.fullmatch(lab, str(f.get("label", "")), re.I):
                return f.get("value")
    return None


def banner_quip(story):
    lines = (story.get("social") or {}).get("igBanner") or []
    if not lines:
        return story.get("title", "")
    first = lines[0].rstrip(".")
    rest = (lines[1].strip().rstrip(".") if len(lines) > 1 else "")
    rest = rest[:1].upper() + rest[1:] if rest else ""
    return f"{first}. {rest}." if rest else f"{first}."


def load_quips(slug):
    p = ROOT / "content" / "reel-scripts" / f"{slug}.json"
    return json.loads(p.read_text()) if p.exists() else {}


# ── the voice ─────────────────────────────────────────────────────────────────
def api_key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if k:
        return k
    try:
        k = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"],
                           capture_output=True, text=True).stdout.strip()
    except FileNotFoundError:
        k = ""
    if not k:
        sys.exit("no ElevenLabs key: set ELEVENLABS_API_KEY or add the keychain item ELEVENLABS_API_KEY")
    return k


def say(text, key):
    """The mp3 for one line, from the cache or from ElevenLabs."""
    TTS_CACHE.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha1(f"{VOICE_ID}|{MODEL_ID}|{json.dumps(VOICE_SETTINGS, sort_keys=True)}|{text}".encode()).hexdigest()[:16]
    mp3 = TTS_CACHE / f"{h}.mp3"
    if mp3.exists() and mp3.stat().st_size > 1000:
        return mp3
    body = json.dumps({"text": text, "model_id": MODEL_ID, "voice_settings": VOICE_SETTINGS}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format={OUTPUT_FORMAT}",
        data=body, method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        mp3.write_bytes(r.read())
    return mp3


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


# ── the pictures ──────────────────────────────────────────────────────────────
ART_W, ART_Y = 980, 240


class Segment:
    def __init__(self, kind, art, caption, said, info=None, counter=None):
        self.kind, self.art, self.caption, self.said, self.info, self.counter = kind, art, caption, said, info, counter
        self.mp3 = None
        self.speech = 0.0     # seconds of speech
        self.length = 0.0     # seconds on screen


def chrome(kicker, counter):
    """The static layer: masthead, foot. The art and the words go on a copy."""
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([60, 70, W - 60, 76], fill=INK)
    d.rectangle([60, 82, W - 60, 85], fill=INK)
    f_k = font("SpecialElite-Regular.ttf", 40)
    wk = draw_tracked_centered(d, 112, "THE SOUTH KNOXVILLE EAR", f_k, INK, tr=5)
    star(d, (W - wk) / 2 - 44, 112 + 24, 15, RUST)
    star(d, (W + wk) / 2 + 44, 112 + 24, 15, RUST)
    f_e = font("SpecialElite-Regular.ttf", 30)
    line = kicker.upper() + (f"   ·   {counter}" if counter else "")
    draw_tracked_centered(d, 172, line, f_e, RUST, tr=3)
    d.rectangle([60, H - 118, W - 60, H - 112], fill=INK)
    f_f = font("SpecialElite-Regular.ttf", 28)
    draw_tracked_centered(d, H - 92, "HEAR THE WHOLE BRIEFING — LINK IN BIO", f_f, INK, tr=3)
    return img


def words_layer(base, art_h, caption, info):
    """The caption and the when/where, drawn once per segment under the art box."""
    img = base.copy()
    d = ImageDraw.Draw(img)
    y = ART_Y + art_h + 40
    if info:
        f_i = font("SpecialElite-Regular.ttf", 30)
        for line in info[:2]:
            line = line.upper()
            f_use = f_i
            while d.textlength(line, font=f_use) > W - 160 and f_use.size > 20:
                f_use = font("SpecialElite-Regular.ttf", f_use.size - 2)
            d.text(((W - d.textlength(line, font=f_use)) / 2, y), line, font=f_use, fill=RUST)
            y += f_use.size * 1.45
        y += 14
    f_c = font("PTSerif-Bold.ttf", 46)
    lines = wrap(d, caption, f_c, W - 2 * 90)
    while len(lines) > 4 and f_c.size > 30:
        f_c = font("PTSerif-Bold.ttf", f_c.size - 4)
        lines = wrap(d, caption, f_c, W - 2 * 90)
    lh = f_c.size * 1.28
    for i, line in enumerate(lines):
        d.text(((W - d.textlength(line, font=f_c)) / 2, y + i * lh), line, font=f_c, fill=INK)
    return img


def art_frames(src, n_frames):
    """Yield the art box for each frame: a slow push-in on the picture."""
    art = Image.open(src).convert("RGB")
    aw, ah = art.size
    box_h = min(round(ah * ART_W / aw), 1225)
    box_w = ART_W
    # work from a 1.5× master so the zoomed crop never upsamples
    master = art.resize((round(box_w * 1.5), round(box_h * 1.5)), Image.LANCZOS)
    mw, mh = master.size
    for i in range(n_frames):
        z = 1 + PUSH_IN * (i / max(1, n_frames - 1))
        cw, ch = mw / z, mh / z
        left, top = (mw - cw) / 2, (mh - ch) / 2
        yield box_h, master.crop((left, top, left + cw, top + ch)).resize((box_w, box_h), Image.BILINEAR)


def render(segments, kicker, out_mp4, out_jpg, total):
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
    ]
    filters, labels, t = [], [], 0.0
    for i, s in enumerate(segments):
        cmd += ["-i", str(s.mp3)]
        ms = round((t + LEAD_IN) * 1000)
        filters.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
        labels.append(f"[a{i}]")
        t += s.length
    filters.append(f"{''.join(labels)}amix=inputs={len(segments)}:normalize=0:duration=longest,apad[a]")
    cmd += [
        "-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[a]",
        "-t", f"{total:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
        "-movflags", "+faststart", str(out_mp4),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    poster = None
    n_total = 0
    for s in segments:
        n = max(1, round(s.length * FPS))
        base = chrome(kicker, s.counter)
        first = True
        for box_h, art in art_frames(s.art, n):
            if first:
                words = words_layer(base, box_h, s.caption, s.info)
                first = False
            frame = words.copy()
            ax = (W - ART_W) // 2
            d = ImageDraw.Draw(frame)
            d.rectangle([ax - 6, ART_Y - 6, ax + ART_W + 6, ART_Y + box_h + 6], fill=INK)
            frame.paste(art, (ax, ART_Y))
            if poster is None and s.kind == "story":
                poster = frame.copy()
            proc.stdin.write(frame.tobytes())
            n_total += 1
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")
    (poster or frame).save(out_jpg, "JPEG", quality=88)
    return n_total


# ── the cut ───────────────────────────────────────────────────────────────────
def load_episode(slug):
    for d in ("episodes", "drafts"):
        p = ROOT / "content" / d / f"{slug}.json"
        if p.exists():
            return json.loads(p.read_text())
    sys.exit(f"no episode {slug} in content/episodes or content/drafts")


def plan(slug, max_s):
    ep = load_episode(slug)
    art_dir = ROOT / "public" / "assets" / "ig" / slug
    cover = art_dir / "episode-drop.jpg"
    if not cover.exists():
        sys.exit(f"no episode card in {art_dir} (run scripts/ig-promos.py first)")
    quips = load_quips(slug)
    stories = [ep["feature"], *ep["stories"]]
    picks = []
    for s in stories:
        if (s.get("social") or {}).get("igSkip"):
            continue
        art = art_dir / f"{s['id']}.jpg"
        if not art.exists():
            continue
        q = (quips.get("quips") or {}).get(s["id"]) or (s.get("social") or {}).get("igQuip") or banner_quip(s)
        when = fact(s, "when", "curtain|kickoff|showtime", "(mon|tue|wed|thu|fri|sat|sun).*")
        where = fact(s, "where", "venue", "start")
        info = [x for x in (when, where and where.split(" · ")[0]) if x]
        picks.append(Segment("story", art, q.strip(), q.strip(), info))
    n = len(picks)
    intro = quips.get("intro") or f"{n} things to do in South Knoxville this weekend."
    outro = quips.get("outro") or "That's the weekend. The whole briefing is at soknoear.com. Link in bio."
    segs = [Segment("intro", cover, intro, intro), *picks, Segment("outro", cover, outro, outro)]
    kicker = f"No. {ep['number']} · {ep.get('shortDate', ep['date'])}"
    return ep, segs, kicker


def build(slug, max_s=90, plan_only=False):
    ep, segs, kicker = plan(slug, max_s)
    respell = tts_respellings()
    for s in segs:
        s.said = for_tts(s.said, respell)

    if plan_only:
        # rough timing without the voice: ~15 characters a second plus the pads
        print(f"reel for {slug}: {len(segs) - 2} stories (plan — no audio rendered)")
        for s in segs:
            est = len(s.said) / 15 + LEAD_IN + TAIL
            print(f"  {est:5.1f}s  {s.art.name:32} {s.caption[:60]}…" + (f"   [tts: {s.said[:50]}…]" if s.said != s.caption else ""))
        return

    key = api_key()
    for s in segs:
        s.mp3 = say(s.said, key)
        s.speech = duration(s.mp3)
        s.length = LEAD_IN + s.speech + TAIL

    # Fit the cap: keep the intro, the outro and the stories in order while they fit.
    stories = [s for s in segs if s.kind == "story"]
    fixed = segs[0].length + segs[-1].length
    kept, t = [], fixed
    for s in stories:
        if t + s.length > max_s and len(kept) >= MIN_STORIES:
            break
        kept.append(s)
        t += s.length
    dropped = len(stories) - len(kept)
    segs = [segs[0], *kept, segs[-1]]
    for i, s in enumerate(kept):
        s.counter = f"{i + 1} of {len(kept)}"
    total = sum(s.length for s in segs)

    print(f"reel for {slug}: {len(kept)} stories, {total:.1f}s" + (f" ({dropped} left out by the {max_s:.0f}s cap)" if dropped else ""))
    for s in segs:
        print(f"  {s.length:5.1f}s  {s.art.name:32} {s.caption[:64]}")

    art_dir = ROOT / "public" / "assets" / "ig" / slug
    out_mp4, out_jpg = art_dir / "reel.mp4", art_dir / "reel.jpg"
    n = render(segs, kicker, out_mp4, out_jpg, total)
    size = out_mp4.stat().st_size / 1e6
    # What the queue's caption says about the cut (scripts/ig-queue.mjs reads this).
    (art_dir / "reel.json").write_text(json.dumps({"seconds": round(total, 1), "stories": len(kept), "frames": n}) + "\n")
    print(f"  ✓ {out_mp4.relative_to(ROOT)}  ({total:.1f}s, {size:.1f} MB, {n} frames)")
    print(f"  ✓ {out_jpg.relative_to(ROOT)}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    max_s = 120
    if "--max" in sys.argv:
        max_s = float(sys.argv[sys.argv.index("--max") + 1])
        args = [a for a in args if a != sys.argv[sys.argv.index("--max") + 1]]
    build(args[0], max_s=max_s, plan_only="--plan" in sys.argv)
