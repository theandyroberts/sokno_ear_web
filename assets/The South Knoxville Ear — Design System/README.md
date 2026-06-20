# The South Knoxville Ear — Design System

> *We report it. You live it. We hear things.*

A design system for **The South Knoxville Ear** — a weekly **events & rumors** publication for South Knoxville, Tennessee. It looks like a beloved neighborhood newspaper that survived into the web era with all its personality intact: **retro community newspaper + campy local rumor sheet + hand-drawn Appalachian alt-weekly + South Knoxville porch gossip.**

The product is a **one-page weekly web paper**. Each week gets a single page that scrolls as far as it needs to — full-width masthead at the top, then every story right there inline. No "read more," no second pages, no app-like depth. You scroll a printed broadsheet.

---

## Sources

This system was built from the brand materials in:

- **GitHub:** [`theandyroberts/sokno_ear_web`](https://github.com/theandyroberts/sokno_ear_web) — contains the canonical `DESIGN_DIRECTION.md` brief, the hand-drawn masthead, a full homepage mockup, and local photography. Explore it for the original brief and more reference imagery.

Imported / derived in `assets/`:
- `masthead.png` — the hand-drawn vintage woodtype masthead, optimized (the **source of truth**). Original full-res: `SoKnoEAR_Masthead.png`.
- `SoKnoEAR_Page.png` — the original full homepage mockup (the design target).
- `photo_bridge.png`, `gay_st_bridge_from_dt.png`, `xaiohei_traffic_circle*.png` — local photography (clippings).
- `possum_street_art.png` — the SoKno possum mascot with his Sunsphere mic.
- `spots/` — **black-ink spot engravings cropped from the page mockup**: `feature_flag`, `s1_flag` (Pride), `s2_disco`, `s3_perc` (rumor mill), `s4_bridge`, `s5_fire` (fireflies), `m1_phones`, `m2_paw`, `m3_cal`, `m4_mail`, plus `foot_bridge` / `foot_dog`. These lead the story cards and articles.

---

## Content Fundamentals

**Voice:** neighborly, curious, lightly funny, useful, locally fluent, *mildly nosy but never mean.* Always clear about what's confirmed vs. rumor. The paper knows the neighborhood personally — Sevier Avenue, the Gay Street Bridge, the South Waterfront, the Urban Wilderness, Ijams, dogs, possums, fireflies.

- **Person:** speaks as "we" (the paper) to "you" (the neighbor). "We hear things." "You live it."
- **Tone:** warm and conversational with a wink. Jokes are gentle and local, never snarky or mean. A confident golden retriever is an acceptable source as long as you say so.
- **Casing:** Headlines and section rubrics are **ALL CAPS** slab woodtype. Body is sentence case. Labels/tags are condensed caps.
- **Rumor honesty:** label certainty plainly — *Confirmed* / *Probably true* / *Filed under "we'll see."*
- **Emoji:** **none.** The flair comes from ★ stars, ◆ diamonds, and ❧ flourishes — print ornaments, not emoji.

**House language (use it):** "What we're hearing," "Around SoKno," "Weekend Watch," "We're all ears," "The rumor mill," "Seen something? Heard something?", "Read by locals. Loved by locals.", "South Knoxville, all the way."

**Example copy:**
> *"It starts the way the best South Knoxville things start: a little homemade, a little loud, and entirely ours."*
> *"Locals ride free of judgment; visitors ride free of expectations."*

---

## Visual Foundations

**Palette.** Black ink (`#171512`) and newsprint cream (`#F3E8D2`) are the foundation — never flat white. **Teal** (`#7FAEA3`) and **rust red** (`#A94A34`) are editorial accents (section bars, ribbons, labels, stars), never dominant. **Sunsphere Gold** (`#D8A725`) is rare and special — reserved for the possum's mic and the occasional star. Deep Bridge Green (`#315D54`) anchors primary buttons. See `tokens/colors.css`.

**Background.** Aged-but-clean newsprint: warm cream base with a faint fiber/halftone noise overlay and a whisper of edge darkening on large panels. The texture is visible enough to feel warm, never so heavy it hurts readability. Defined in `tokens/base.css`. No gradients-as-decoration, no glossy SaaS surfaces.

**Type.** A three-family distressed print system (`tokens/typography.css`):
- **Display / rubrics** — *Rye*, a distressed vintage woodtype, for hero headlines and section headers. ALL CAPS, full of rustic character — the live-text echo of the hand-drawn masthead.
- **Body / titles** — *PT Serif*, a warm, readable old-style serif. 17px body / 19px deck, line-height 1.6 for generous newspaper rhythm; bold (700) for story and article titles in sentence case, matching the printed page.
- **Labels / UI** — *Special Elite*, a worn typewriter face with built-in ink dropouts, for nav, tags, buttons, captions, datelines. Uppercase, tracked ~0.1em — genuinely "hand-stamped."
- ⚠️ **Font substitution + preview note:** the masthead lettering is custom hand-drawn woodtype; no source font files were provided. Rye/Special Elite/PT Serif are the closest free Google Fonts approximations of the rustic, ink-dropout feel. They load via CSS `@import` and render correctly in a normal browser — but the in-tool screenshot renderer cannot embed cross-origin webfonts, so previews of cards/screens may show a serif fallback for headlines. **Swap in licensed brand fonts (or self-hosted files) for production** (see Caveats).

**Borders, corners, shadows.** Thin **black ink** borders (1–3px). Corners are **rounded** like the printed broadsheet panels (`--radius-sm: 6px`, `--radius-md: 10px` for cards/wells, `--radius-lg: 14px` for feature panels); only the round audio play button is fully circular. Shadows are **dry letterpress lifts** — a hard 2px/2px offset (`--shadow-press`) on stamped buttons and cards, or a soft low paper lift on feature panels. Never a glowing blurred drop shadow.

**Cards.** Cream-bright paper (`--paper-bright`), 2px black ink border, rounded corners (10px), optional engraving thumbnail with a hairline rule beneath. On hover they nudge up-left and gain the hard offset shadow.

**Accents in use.** Teal section bars and ribbons; rust labels, stars, and emphasis marks; gold only for Sunsphere details. Ornamental dividers (★ ◆ ❧) keep the old-print rhythm between sections.

**Motion.** Restrained and dry. Hover transitions are quick (90–120ms) color/transform shifts — buttons deepen toward Dark Rust, cards lift, the play button fills its waveform rust. **No bounces, no parallax, no infinite loops.** Press states sink the offset shadow and translate 1px (a physical "stamp").

**Imagery vibe.** Local photography is run slightly desaturated and contrast-bumped (`saturate(0.9) contrast(1.05)`) and framed like a printed clipping (cream mat, ink border, soft lift). Illustrations are black-ink stipple/engraving spot art on cream with sparing teal/rust accents.

**Layout rules.** Centered broadsheet column (`--page-max: 1100px`). Full-width masthead. A feature + sidebar top band, a scanner grid, then full stories stacked and separated by dividers. The sidebar (audio + calendar) is `position: sticky`. The whole thing reads as one continuous printed page.

---

## Iconography

The brand is **anti-icon-pack.** It does **not** use a Material/Lucide-style icon set, and it uses **no emoji.**

- **Ornaments as icons:** ★ (rust star), ◆ (diamond), ❧ (flourish), → (arrow on "read more"/CTAs), and ▶/❚❚ for the audio player. These are Unicode glyphs set in the brand fonts — cheap, consistent, and period-correct. The `Divider` and `SectionHeader` components render them.
- **Spot illustrations:** every story ideally leads with a **custom black-ink stipple engraving** — a visual "story stamp" (coffee percolator for the rumor mill, mason-jar fireflies for the wilderness, the possum-with-mic for audio). These are hand-drawn per story, not pulled from a pack. The repo's `DESIGN_DIRECTION.md` includes a prompt formula for generating new ones in-style.
- **The mascot:** the SoKno possum holding a Sunsphere-as-microphone (`assets/possum_street_art.png`) is the recurring brand character.
- **No hand-rolled SVG icon systems.** When a glyph won't do, commission a stipple engraving rather than drawing a flat vector icon.

⚠️ No icon font or SVG sprite ships with this system — by design. If you need UI affordances, prefer the Unicode ornaments above or a commissioned engraving.

---

## Index / Manifest

**Root**
- `styles.css` — the global entry point (consumers link this). `@import`s only.
- `README.md` — this guide.
- `SKILL.md` — Agent-Skill-compatible front matter for downloadable use.

**`tokens/`** — `fonts.css` (Google Fonts import), `colors.css`, `typography.css`, `spacing.css` (borders/radii/shadows too), `base.css` (paper background + resets).

**`guidelines/`** — foundation specimen cards (Design System tab): colors (base / accent / surfaces), type (display / body / labels), spacing (scale / borders), brand (masthead / voice).

**`components/`** — reusable React primitives:
- `core/` — **Button**, **Tag**, **Divider**, **SectionHeader**, **Ribbon**
- `editorial/` — **StoryCard**, **Article**, **AudioBriefing**, **CalendarItem**, **Tipline**

Each has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, plus one `@dsCard` demo HTML per directory.

**`ui_kits/sokno-ear/`** — the product recreation: the **one-page weekly paper** (`index.html` + `Masthead.jsx` + `WeeklyPaper.jsx`). Full-width masthead, no weather block, every story inline, no "read more."

**`assets/`** — masthead, mockup, mascot, and local photography.
