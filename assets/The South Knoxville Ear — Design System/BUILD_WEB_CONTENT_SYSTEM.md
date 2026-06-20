# Build Brief — The South Knoxville Ear Web Content System

> Hand-off for Claude Code. This repo is a **design system** (tokens + React
> components + a one-page-paper template). Your job is to build the **web
> content system** that lets editors publish a new weekly edition and have it
> render as the branded one-page paper described here.
>
> **The design is done — do not redesign it.** Reuse the tokens and components
> in this repo verbatim. Build the data layer, authoring workflow, routing, and
> rendering around them.

---

## 1. What exists today (treat as source of truth)

| Path | What it is | How to use it |
|---|---|---|
| `styles.css` | Global entry — `@import`s all tokens + webfonts | Link/import **once** at the app root. Every component reads CSS custom properties from here. |
| `tokens/` | `colors.css`, `typography.css`, `spacing.css`, `base.css`, `fonts.css` | The single source of color/type/spacing/border/shadow values. Never hard-code values that exist here. |
| `components/core/` | `Button`, `Tag`, `Divider`, `SectionHeader`, `Ribbon` | Plain React, inline-styled with CSS vars. Import the `.jsx` directly. Prop contracts in the sibling `.d.ts`; usage in `.prompt.md`. |
| `components/editorial/` | `StoryCard`, `Article`, `AudioBriefing`, `CalendarItem`, `Tipline` | Same. These are the content building blocks of a weekly edition. |
| `ui_kits/sokno-ear/` | `index.html` + `Masthead.jsx` + `WeeklyPaper.jsx` — the **full reference build** of one finished week | **Start here.** This is the target output, hard-coded. Your system generates this from data. |
| `templates/weekly-edition/WeeklyEdition.dc.html` | A blank weekly scaffold (masthead → dateline → nav → inline stories) | The structural skeleton of a page. Mirror this layout in your renderer. |
| `assets/` | `masthead.jpg` (source of truth), mascot, photography, `spots/` engravings | Serve these statically. `spots/*` are the per-story black-ink engravings. |
| `_ds_bundle.js` | Compiled UMD bundle of all components on `window.<Namespace>` | Only for plain-HTML/non-bundler consumers. **In a real app, import the `.jsx` sources instead.** |

The components are **already React and already inline-styled with CSS variables**
— they drop straight into a React/Next/Remix app. Do not port them to a styling
library; just make sure `styles.css` is loaded so the CSS vars resolve.

---

## 2. Recommended stack

- **Next.js (App Router) + React** — components are React; SSR/SSG gives fast,
  SEO-friendly, printable pages, which fits a "newspaper."
- **Content store:** start with **MDX or git-committed JSON/Markdown** per
  edition (`content/editions/2026-06-20.mdx`). Editors PR a file; the site
  rebuilds. Upgrade path: a headless CMS (Sanity/Contentful/Keystatic) whose
  schema maps 1:1 to the data model in §3. Pick git-based first — it matches a
  small newsroom and keeps a clean archive.
- **Import `styles.css` once** in the root layout. Self-host the fonts for
  production (see §6).
- **No client app shell.** Each edition is one long server-rendered page. The
  in-page nav is anchor links, not a router. No "read more," no pagination.

---

## 3. Data model

One **Edition** = one published page. Model it as:

```ts
Edition {
  slug: string            // "2026-06-20"
  volume: number          // 4
  number: number          // 18
  price: string           // "25¢"
  edition: string         // "Weekend Edition"
  date: string            // ISO; renders "Saturday, Jun 20, 2026"
  place: string           // "South Knoxville, TN"

  feature: Story          // the top feature (renders via <Article>)
  scanner: StoryCard[]    // "Top Stories & Events" grid (3–6 cards)
  stories: Story[]        // full inline stories, in order (<Article> each)

  sidebar: {
    audio?: AudioBriefing // weekend audio briefing
    calendar: Event[]     // <CalendarItem> list
    tipline?: Tipline     // "Seen something? Heard something?"
  }
}

Story {                   // -> <Article>
  id: string              // anchor target for nav + scanner cards
  label: string           // rubric, e.g. "Rumor Mill" (ALL CAPS)
  labelColor?: "teal" | "rust"
  image?: string          // assets/spots/* engraving
  imageCaption?: string
  title: string           // sentence case, bold serif
  deck?: string           // 1–2 sentence why-it-matters
  facts?: { label: string; value: string }[]  // event strip: date/time/place/cost/source
  certainty?: "Confirmed" | "Probably true" | "We'll see"  // rumor honesty
  body: string | MDX      // full text — everything inline, no truncation
}

StoryCard {               // -> <StoryCard>, scanner grid
  label: string; image: string; title: string;
  blurb: string; cue: string; href: string   // href = "#<Story.id>"
}

Event { month; day; title; meta }            // -> <CalendarItem>
AudioBriefing { title; duration; summary }   // -> <AudioBriefing>
Tipline { heading; body }                    // -> <Tipline>
```

Read each component's `.d.ts` for the exact prop names/types before wiring —
those are the contract. Map content fields → props; don't invent new props.

---

## 4. Page composition (render order)

Mirror `WeeklyEdition.dc.html` / `WeeklyPaper.jsx`:

1. **Dateline bar** — `Vol/No/price` · `edition · date · place` · `★ soknoear.com`
2. **Full-width masthead** — `assets/masthead.jpg`, `max-width:1180px`, centered on cream
3. **In-page nav** — anchor links to section ids (Events / Rumors / More Local / Listen)
4. **Feature band** — `<Article>` feature **+** sticky sidebar (`<AudioBriefing>`, `<CalendarItem>` list, `<Tipline>`)
5. **Scanner grid** — `SectionHeader` + `StoryCard[]` (each jumps to `#id`)
6. **Inline stories** — every `Story` as a full `<Article>`, separated by `<Divider>`
7. **Footer** — tagline + mascot/engravings

Layout constants: centered column `--page-max: 1100px`; sidebar is
`position: sticky`. The whole thing is one continuous printed scroll.

---

## 5. Authoring workflow to deliver

- **New edition** = create `content/editions/<date>` with frontmatter (§3 scalars)
  + a body section per story. Validate against the schema at build.
- **Home `/`** renders the latest edition. **`/archive`** lists past editions.
  **`/<slug>`** renders a specific week (permalink — editions never disappear).
- **Spot engravings:** each story references one `assets/spots/*` image. Document
  how to add a new one (the repo's `DESIGN_DIRECTION.md` on
  `theandyroberts/sokno_ear_web` has the in-style generation prompt).
- **Print:** ship a clean print stylesheet — this *is* a newspaper; it should
  print/PDF as one page beautifully.

---

## 6. Production must-dos

- **Self-host fonts.** Today `tokens/fonts.css` pulls Rye / Special Elite /
  PT Serif from Google Fonts, and the **headline** uses **Blackthorn** (licensed,
  self-hosted at `assets/fonts/Blackthorn.{otf,ttf}` via `--font-headline`).
  For production, self-host **all** of them as `woff2`, confirm the Blackthorn
  license covers web embedding, and add `font-display: swap`.
- **Voice & rules:** follow `README.md` → *Content Fundamentals* exactly —
  headlines/rubrics ALL CAPS, body sentence case, **no emoji** (ornaments only
  ★ ◆ ❧), and the *Confirmed / Probably true / We'll see* rumor labels.
- **Color/texture:** never flat white — newsprint cream `#F3E8D2`, black ink
  `#171512`; teal/rust are accents only; gold (`#D8A725`) is rare. Keep the
  `tokens/base.css` paper texture subtle.
- **Motion:** restrained (90–120ms hover), dry letterpress offset shadows, no
  bounces/parallax/loops.
- **Accessibility:** the engravings are decorative (`alt=""`); story images that
  carry meaning get real alt text. Maintain heading order; nav anchors need
  focus styles.

---

## 7. Fidelity

**High-fidelity.** Colors, type, spacing, borders, and shadows in `tokens/` are
final. Recreate the look exactly by **using these components and tokens** — not
by eyeballing screenshots. The `ui_kits/sokno-ear/` build is the pixel target.

---

## 8. First milestones

1. Next.js app; import `styles.css`; self-host fonts; render `assets/masthead.jpg`.
2. Drop in `components/` `.jsx` and reproduce `ui_kits/sokno-ear/` from **one**
   hard-coded edition object (proves components + tokens resolve).
3. Lift that object into `content/editions/<date>` (MDX/JSON) + a schema.
4. Routing: `/` (latest), `/<slug>` (permalink), `/archive`.
5. Print stylesheet + SEO/OG metadata per edition.
