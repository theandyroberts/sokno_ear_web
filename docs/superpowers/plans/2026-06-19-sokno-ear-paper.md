# The South Knoxville Ear — Paper (v1) + Edition Zero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js app that renders The South Knoxville Ear as a one-page weekly paper from JSON edition data, with working event/news submission + subscribe forms, a real audio briefing in Andy's voice, an archive, and deploy it to the DO VPS as soknoear.com — then produce the real June 19–21 "Edition Zero."

**Architecture:** Next.js (App Router, standalone server) imports the existing design-system React components verbatim (copied into `components/ds/`), self-hosts fonts via `next/font`, and renders editions validated by a Zod schema. Form submissions persist to SQLite (`better-sqlite3`) and email Andy via Resend. Runs under PM2 behind nginx on the VPS; deploys by `git pull && build && pm2 restart`.

**Tech Stack:** Next.js 15 (App Router, `output: 'standalone'`), React, TypeScript, `next/font`, Zod, `better-sqlite3`, `resend`, Vitest + React Testing Library, PM2, nginx, certbot. Content via Higgsfield (spot art) + ElevenLabs (audio) MCP tools.

---

## Reference source of truth

The finished look is the design system at `assets/The South Knoxville Ear — Design System/`
(hereafter **DS/**). The pixel target is `DS/ui_kits/sokno-ear/` (`WeeklyPaper.jsx` +
`Masthead.jsx` + `index.html`). The full spec is
`docs/superpowers/specs/2026-06-19-sokno-ear-paper-design.md`. **Do not redesign** —
port and wire.

**DS facts that drive this plan (verified by reading the source):**
- DS components are ESM (`export function X`) and import siblings by explicit `.jsx`
  (e.g. `import { Tag } from "../core/Tag.jsx"`). They are inline-styled with CSS vars.
- Components using React state (need `"use client"`): `Button`, `StoryCard`,
  `CalendarItem`, `Tipline`, `Masthead`/`NavLink`, `AudioBriefing`. Stateless
  (shareable, no directive): `Tag`, `SectionHeader`, `Divider`, `Article`.
- **`AudioBriefing` is visual-only** — it has play/pause *state* but NO `<audio>`
  element and a hard-coded fake progress (`0.34`). Real playback must be built.
- `Masthead.jsx` is a global (`window.Masthead = ...`), not ESM, and hard-codes the
  dateline/volume — it must be rewritten as an ESM, data-driven component.
- Fonts today load from Google via `@import` in `DS/tokens/fonts.css`; Blackthorn via
  `@font-face` from `DS/assets/fonts/Blackthorn.{otf,ttf}`. Token families live in
  `DS/tokens/typography.css`: `--font-display`("Rye"), `--font-body`("PT Serif"),
  `--font-label`("Special Elite"), `--font-headline`("Blackthorn","Rye"...).
- All color/space/border/shadow tokens exist in `DS/tokens/{colors,spacing,base}.css`.

---

## File Structure

**Created in app root (`/Users/andrewroberts/Projects/sokno_ear_web/`):**

```
app/
  layout.tsx                # html shell: next/font variables + globals.css + per-edition <title>
  globals.css               # @import DS tokens (NOT fonts.css) + bind family vars to next/font
  page.tsx                  # renders latest edition
  [slug]/page.tsx           # permalink to a specific edition (generateStaticParams)
  archive/page.tsx          # past editions list; C.S. Lewis epigraph when empty
  not-found.tsx             # 404 in-brand
  api/submit/route.ts       # POST event/news submission -> SQLite + Resend
  api/subscribe/route.ts    # POST subscribe email -> SQLite
components/
  ds/                       # DS components copied verbatim, +"use client" where needed
    Tag.jsx SectionHeader.jsx Divider.jsx Article.jsx StoryCard.jsx
    CalendarItem.jsx Button.jsx Tipline.jsx
  Masthead.tsx              # rewritten ESM, data-driven masthead + nav
  AudioBriefingPlayer.tsx   # functional player matching DS AudioBriefing visual
  Paper.tsx                 # the one-page composition (server), data-driven
  ArticleBody.tsx           # renders Story body blocks (paragraph/subhead/runs)
  EventSubmitForm.tsx       # "Got an event? Tell The Ear" form -> /api/submit
  SubscribeForm.tsx         # "Get the Ear delivered" form -> /api/subscribe
  Footer.tsx                # footer band (tagline + Archives link + engravings)
lib/
  schema.ts                 # Zod Edition/Story/etc. + inferred TS types
  editions.ts               # load + validate + sort editions from content/editions
  db.ts                     # better-sqlite3 singleton; submissions + subscribers tables
  mail.ts                   # Resend transport for submissions
  fonts.ts                  # next/font definitions (Rye, PT Serif, Special Elite, Blackthorn)
content/editions/2026-06-20.json   # Edition Zero
public/
  ds/{colors,typography,spacing,base}.css   # token files copied from DS
  fonts/Blackthorn.ttf                       # for next/font/local
  assets/...                                 # masthead + spots/ + photos copied from DS
  audio/2026-06-20.mp3                        # Andy's briefing
styles/print.css            # print/PDF stylesheet
ecosystem.config.js         # PM2 process definition
deploy/soknoear.com.nginx   # nginx vhost (also installed to /etc/nginx/sites-available)
scripts/redeploy.sh         # VPS pull+build+restart helper
vitest.config.ts  vitest.setup.ts
.env.example
tests/...                   # unit/integration tests mirroring lib/ and api/
```

**Modified:** `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`
(add `/public/audio` exception note — audio IS committed; see Task 2).

---

## Phase 0 — Scaffold & configuration

### Task 1: Initialize the Next.js app in the existing repo

**Files:** Create app skeleton; Modify `package.json`, `tsconfig.json`, `next.config.ts`.

- [ ] **Step 1: Scaffold into a temp dir, then move in** (create-next-app refuses a non-empty dir)

Run:
```bash
cd /Users/andrewroberts/Projects/sokno_ear_web
npx --yes create-next-app@latest .ng --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
# move generated files into repo root without clobbering existing content/docs/assets/.git
rsync -a --ignore-existing .ng/ ./
cp .ng/package.json ./package.json
cp .ng/tsconfig.json ./tsconfig.json
cp .ng/next.config.* ./ 2>/dev/null || true
cp .ng/next-env.d.ts ./ 2>/dev/null || true
cp .ng/eslint.config.* ./ 2>/dev/null || true
cp .ng/postcss.config.* ./ 2>/dev/null || true
rm -rf .ng
# remove the default Tailwind/global css and boilerplate page; we provide our own
rm -f app/page.module.css app/globals.css public/*.svg
```
Expected: `app/`, `package.json`, `tsconfig.json`, `next.config.ts` now exist in repo root.

- [ ] **Step 2: Add runtime + dev dependencies**

Run:
```bash
npm install zod better-sqlite3 resend
npm install -D @types/better-sqlite3 vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/dom jsdom
```
Expected: installs succeed (better-sqlite3 compiles natively; on the dev Mac this just works).

- [ ] **Step 3: Configure `next.config.ts` for standalone + native module**

Replace `next.config.ts` with:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

- [ ] **Step 4: Allow importing the DS `.jsx` from TypeScript**

In `tsconfig.json`, set `"allowJs": true` inside `compilerOptions` (leave the rest of
the create-next-app config intact). Confirm `"moduleResolution": "bundler"` is present
(it is by default) so `.jsx`-extension imports resolve.

- [ ] **Step 5: Verify the skeleton builds**

Run: `npm run build`
Expected: build fails only because `app/page.tsx` references removed boilerplate — if so,
replace `app/page.tsx` body with `export default function Page(){return null}` temporarily,
re-run, and confirm a clean `✓ Compiled` / standalone output. Then continue.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app (standalone, TS, app router)"
```

### Task 2: Bring in DS tokens, fonts, assets

**Files:** Create `public/ds/*.css`, `public/fonts/Blackthorn.ttf`, `public/assets/**`,
`lib/fonts.ts`, `app/globals.css`. Modify `.gitignore`.

- [ ] **Step 1: Copy token CSS (verbatim) and assets into the served tree**

Run:
```bash
DS="assets/The South Knoxville Ear — Design System"
mkdir -p public/ds public/fonts public/assets public/audio
cp "$DS/tokens/colors.css"     public/ds/colors.css
cp "$DS/tokens/typography.css" public/ds/typography.css
cp "$DS/tokens/spacing.css"    public/ds/spacing.css
cp "$DS/tokens/base.css"       public/ds/base.css
cp "$DS/assets/fonts/Blackthorn.ttf" public/fonts/Blackthorn.ttf
# images: spots, photos, mascot, masthead
cp -R "$DS/assets/spots" public/assets/spots
cp "$DS/assets/photo_bridge.png" public/assets/ 2>/dev/null || true
cp "$DS/assets/gay_st_bridge_from_dt.png" public/assets/ 2>/dev/null || true
cp "$DS/assets/possum_street_art.png" public/assets/ 2>/dev/null || true
# masthead: prefer the user's final art; fall back to DS masthead.jpg
cp assets/soknoear_mastead_final.png public/assets/masthead.png 2>/dev/null \
  || cp "$DS/assets/masthead.jpg" public/assets/masthead.png
ls public/assets public/assets/spots
```
Expected: `public/assets/masthead.png`, `public/assets/spots/*.png`, fonts present.

- [ ] **Step 2: Confirm `public/audio/` is committed despite `.gitignore` audio-ish rules**

The current `.gitignore` does not ignore `public/audio` or `*.png/*.mp3` — confirm:
```bash
git check-ignore -v public/audio/.gitkeep public/assets/masthead.png || echo "OK: assets/audio are tracked"
touch public/audio/.gitkeep
```
Expected: prints `OK:` (nothing ignored). Audio + spot art are content and must ship in git.

- [ ] **Step 3: Define self-hosted fonts** — create `lib/fonts.ts`:

```ts
import { Rye, PT_Serif, Special_Elite } from "next/font/google";
import localFont from "next/font/local";

export const rye = Rye({
  weight: "400", subsets: ["latin"], display: "swap", variable: "--font-rye",
});
export const ptSerif = PT_Serif({
  weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"],
  display: "swap", variable: "--font-pt-serif",
});
export const specialElite = Special_Elite({
  weight: "400", subsets: ["latin"], display: "swap", variable: "--font-special-elite",
});
export const blackthorn = localFont({
  src: "../public/fonts/Blackthorn.ttf",
  display: "swap", variable: "--font-blackthorn",
});

export const fontVars = [
  rye.variable, ptSerif.variable, specialElite.variable, blackthorn.variable,
].join(" ");
```

- [ ] **Step 4: Create `app/globals.css`** — import DS tokens (NOT the Google fonts.css) and bind the family tokens to the self-hosted next/font variables:

```css
/* DS foundations (copied verbatim into public/ds). Fonts handled by next/font below. */
@import "/ds/colors.css";
@import "/ds/typography.css";
@import "/ds/spacing.css";
@import "/ds/base.css";

/* Bind the DS family tokens to the self-hosted next/font faces. This overrides the
   "Rye"/"PT Serif"/"Special Elite"/"Blackthorn" literals from typography.css so no
   webfont is fetched from Google at runtime. */
:root {
  --font-display:  var(--font-rye), Georgia, "Times New Roman", serif;
  --font-woodtype: var(--font-rye), Georgia, serif;
  --font-body:     var(--font-pt-serif), Georgia, "Times New Roman", serif;
  --font-label:    var(--font-special-elite), "Courier New", Courier, monospace;
  --font-headline: var(--font-blackthorn), var(--font-rye), Georgia, serif;
}

/* anchor offset so in-page nav jumps clear the sticky masthead height */
:target { scroll-margin-top: 24px; }
html { scroll-behavior: smooth; }
```

> Note: Next resolves `@import "/ds/colors.css"` from `public/`. If the build complains
> about absolute CSS `@import`, fall back to copying the four token files into
> `app/ds/` and importing them with relative paths (`@import "./ds/colors.css";`).
> Verify in Step 6.

- [ ] **Step 5: Write `app/layout.tsx`** applying the font variables to `<html>`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { fontVars } from "@/lib/fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://soknoear.com"),
  title: "The South Knoxville Ear",
  description: "South Knoxville events and stories — we hear things.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify fonts/tokens resolve**

Temporarily set `app/page.tsx` to:
```tsx
export default function Page() {
  return <main style={{ padding: 40 }}>
    <h1 style={{ fontFamily: "var(--font-display)" }}>SOUTH KNOXVILLE EAR</h1>
    <p style={{ fontFamily: "var(--font-body)" }}>Cream paper, ink type.</p>
  </main>;
}
```
Run: `npm run dev` then open `http://localhost:3000`.
Expected: cream textured background (not white), Rye display headline, PT Serif body.
If the absolute `@import` failed, apply the Step-4 note fallback, then re-verify.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: self-hosted fonts, DS tokens, and assets wired into the app"
```

### Task 3: Set up Vitest

**Files:** Create `vitest.config.ts`, `vitest.setup.ts`; Modify `package.json` scripts.

- [ ] **Step 1: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 2: `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3:** Add to `package.json` `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Sanity test** — create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("vitest", () => { it("runs", () => expect(1 + 1).toBe(2)); });
```
Run: `npm test`  →  Expected: 1 passed.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "chore: vitest harness"`

---

## Phase 1 — Data model & content layer (TDD)

### Task 4: Zod schema + types (`lib/schema.ts`)

**Files:** Create `lib/schema.ts`; Test `tests/schema.test.ts`.

- [ ] **Step 1: Write failing tests** — `tests/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EditionSchema } from "@/lib/schema";

const minimal = {
  slug: "2026-06-20", volume: 1, number: 1, edition: "Weekend Edition",
  date: "2026-06-20", place: "South Knoxville, TN",
  feature: {
    id: "pride", label: "Feature", title: "Pride weekend",
    layout: "imageTop", image: "/assets/spots/feature_flag.png",
    body: [{ type: "paragraph", text: "Hello." }],
  },
  scanner: [{ label: "Events", image: "/assets/spots/s1_flag.png",
    title: "Pride", blurb: "All day", cue: "Jump to story", href: "#pride" }],
  stories: [{
    id: "pride", label: "Old Sevier", layout: "imageLeft",
    title: "Pride at noon",
    body: [
      { type: "paragraph", runs: [{ text: "Bold", bold: true }, { text: " then plain." }] },
      { type: "subhead", text: "Later" },
    ],
  }],
  sidebar: { calendar: [{ month: "JUN", day: "20", title: "Pride", meta: "Noon" }] },
};

describe("EditionSchema", () => {
  it("accepts a valid edition", () => {
    expect(() => EditionSchema.parse(minimal)).not.toThrow();
  });
  it("rejects an unknown layout", () => {
    const bad = structuredClone(minimal);
    (bad.stories[0] as any).layout = "diagonal";
    expect(() => EditionSchema.parse(bad)).toThrow();
  });
  it("rejects a story with neither text nor runs in a paragraph", () => {
    const bad = structuredClone(minimal);
    (bad.stories[0].body[0] as any) = { type: "paragraph" };
    expect(() => EditionSchema.parse(bad)).toThrow();
  });
  it("defaults labelColor to rust", () => {
    const e = EditionSchema.parse(minimal);
    expect(e.stories[0].labelColor).toBe("rust");
  });
});
```

- [ ] **Step 2: Run, verify it fails** — `npm test tests/schema.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `lib/schema.ts`:**

```ts
import { z } from "zod";

export const LabelColor = z.enum(["rust", "teal", "green", "ink", "gold"]);
export const Layout = z.enum(["imageLeft", "imageRight", "imageTop", "banner", "textOnly"]);

export const Run = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: z.string().optional(),
});

export const Block = z.union([
  z.object({
    type: z.literal("paragraph"),
    text: z.string().optional(),
    runs: z.array(Run).optional(),
  }).refine((b) => !!b.text || (b.runs && b.runs.length > 0), {
    message: "paragraph needs text or runs",
  }),
  z.object({ type: z.literal("subhead"), text: z.string() }),
]);

export const Fact = z.object({ label: z.string(), value: z.string() });

export const Story = z.object({
  id: z.string(),
  label: z.string(),
  labelColor: LabelColor.default("rust"),
  layout: Layout.default("imageLeft"),
  image: z.string().optional(),
  imageCaption: z.string().optional(),
  title: z.string(),
  deck: z.string().optional(),
  facts: z.array(Fact).default([]),
  body: z.array(Block).min(1),
});

export const StoryCard = z.object({
  label: z.string(),
  labelColor: LabelColor.default("rust"),
  hot: z.boolean().default(false),
  image: z.string(),
  title: z.string(),
  blurb: z.string(),
  cue: z.string().default("Jump to story"),
  href: z.string(),
});

export const CalEvent = z.object({
  month: z.string(), day: z.string(), title: z.string(),
  meta: z.string().optional(), starred: z.boolean().default(false),
});

export const Audio = z.object({
  title: z.string().default("Weekend Audio Briefing"),
  intro: z.string(),
  description: z.string(),
  duration: z.string(),           // "mm:ss"
  src: z.string(),                // "/audio/<slug>.mp3"
});

export const EditionSchema = z.object({
  slug: z.string(),
  volume: z.number(),
  number: z.number(),
  edition: z.string(),
  date: z.string(),               // ISO date or date-range label source
  dateLabel: z.string().optional(),  // e.g. "Fri–Sun, Jun 19–21, 2026"
  place: z.string(),
  feature: Story,
  scanner: z.array(StoryCard).min(1),
  stories: z.array(Story),
  sidebar: z.object({
    audio: Audio.optional(),
    calendar: z.array(CalEvent),
  }),
});

export type Edition = z.infer<typeof EditionSchema>;
export type Story = z.infer<typeof Story>;
export type Block = z.infer<typeof Block>;
export type StoryCard = z.infer<typeof StoryCard>;
export type CalEvent = z.infer<typeof CalEvent>;
export type Audio = z.infer<typeof Audio>;
```

- [ ] **Step 4: Run tests** — `npm test tests/schema.test.ts` → Expected: PASS (4 tests).
- [ ] **Step 5: Commit** — `git add lib/schema.ts tests/schema.test.ts && git commit -m "feat: edition Zod schema + types"`

### Task 5: Editions loader (`lib/editions.ts`)

**Files:** Create `lib/editions.ts`; Test `tests/editions.test.ts`; fixtures under `tests/fixtures/editions/`.

- [ ] **Step 1: Failing test** — `tests/editions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadEditions, getLatest, getBySlug, getPast } from "@/lib/editions";
import path from "node:path";

const dir = path.resolve(__dirname, "fixtures/editions");

describe("editions loader", () => {
  it("loads + sorts newest first", () => {
    const all = loadEditions(dir);
    expect(all.map((e) => e.slug)).toEqual(["2026-06-20", "2026-06-13"]);
  });
  it("getLatest returns newest", () => {
    expect(getLatest(dir).slug).toBe("2026-06-20");
  });
  it("getBySlug finds one; missing returns null", () => {
    expect(getBySlug(dir, "2026-06-13")?.number).toBeDefined();
    expect(getBySlug(dir, "nope")).toBeNull();
  });
  it("getPast excludes the latest", () => {
    expect(getPast(dir).map((e) => e.slug)).toEqual(["2026-06-13"]);
  });
});
```

- [ ] **Step 2: Create two fixtures** `tests/fixtures/editions/2026-06-13.json` and
`2026-06-20.json` — minimal valid editions (copy the `minimal` object shape from Task 4,
changing `slug`/`number`). Run `npm test tests/editions.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `lib/editions.ts`:**

```ts
import fs from "node:fs";
import path from "node:path";
import { EditionSchema, type Edition } from "./schema";

const DEFAULT_DIR = path.join(process.cwd(), "content", "editions");

export function loadEditions(dir: string = DEFAULT_DIR): Edition[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const editions = files.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return EditionSchema.parse(raw); // throws on bad data — fail the build loudly
  });
  return editions.sort((a, b) => (a.slug < b.slug ? 1 : -1)); // newest slug first
}

export function getLatest(dir?: string): Edition {
  const all = loadEditions(dir);
  if (all.length === 0) throw new Error("No editions found");
  return all[0];
}

export function getBySlug(dir: string | undefined, slug: string): Edition | null {
  return loadEditions(dir).find((e) => e.slug === slug) ?? null;
}

export function getPast(dir?: string): Edition[] {
  return loadEditions(dir).slice(1);
}
```

- [ ] **Step 4: Run** — `npm test tests/editions.test.ts` → Expected: PASS (4 tests).
- [ ] **Step 5: Commit** — `git add lib/editions.ts tests/ && git commit -m "feat: editions loader (load/validate/sort)"`

---

## Phase 2 — Port DS components into the app

### Task 6: Copy DS components verbatim + add client directives

**Files:** Create `components/ds/*.jsx` (copies); add `"use client"` to the interactive ones.

- [ ] **Step 1: Copy the eight DS components**

```bash
DS="assets/The South Knoxville Ear — Design System/components"
mkdir -p components/ds
cp "$DS/core/Tag.jsx"            components/ds/Tag.jsx
cp "$DS/core/SectionHeader.jsx"  components/ds/SectionHeader.jsx
cp "$DS/core/Divider.jsx"        components/ds/Divider.jsx
cp "$DS/core/Button.jsx"         components/ds/Button.jsx
cp "$DS/editorial/Article.jsx"   components/ds/Article.jsx
cp "$DS/editorial/StoryCard.jsx" components/ds/StoryCard.jsx
cp "$DS/editorial/CalendarItem.jsx" components/ds/CalendarItem.jsx
cp "$DS/editorial/Tipline.jsx"   components/ds/Tipline.jsx
```

- [ ] **Step 2: Fix internal import paths** — `Article.jsx` and `StoryCard.jsx` import
`"../core/Tag.jsx"`; `Tipline.jsx` imports `"../core/Button.jsx"`. In the flat `components/ds/`
dir these become `"./Tag.jsx"` and `"./Button.jsx"`. Edit each:
  - `components/ds/Article.jsx`: change `from "../core/Tag.jsx"` → `from "./Tag.jsx"`.
  - `components/ds/StoryCard.jsx`: change `from "../core/Tag.jsx"` → `from "./Tag.jsx"`.
  - `components/ds/Tipline.jsx`: change `from "../core/Button.jsx"` → `from "./Button.jsx"`.

- [ ] **Step 3: Add `"use client"`** as the first line of the four interactive copies:
`components/ds/Button.jsx`, `components/ds/StoryCard.jsx`, `components/ds/CalendarItem.jsx`,
`components/ds/Tipline.jsx`. (Leave `Tag.jsx`, `SectionHeader.jsx`, `Divider.jsx`,
`Article.jsx` with no directive — they are stateless and usable from server components.)

- [ ] **Step 4: Render-smoke test** — `tests/ds-components.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/ds/SectionHeader.jsx";
import { StoryCard } from "@/components/ds/StoryCard.jsx";

describe("DS components render", () => {
  it("SectionHeader shows its rubric", () => {
    render(<SectionHeader>Top Stories</SectionHeader>);
    expect(screen.getByText("Top Stories")).toBeInTheDocument();
  });
  it("StoryCard shows title + jump cue", () => {
    render(<StoryCard image="/x.png" title="Pride" blurb="b" cue="Jump to story" href="#pride" />);
    expect(screen.getByText("Pride")).toBeInTheDocument();
    expect(screen.getByText(/Jump to story/)).toBeInTheDocument();
  });
});
```
Run: `npm test tests/ds-components.test.tsx` → Expected: PASS.

- [ ] **Step 5: Commit** — `git add components/ds tests/ds-components.test.tsx && git commit -m "feat: port DS components into app (client directives + import fixes)"`

### Task 7: Enhance `Article` to support layout variants

**Files:** Modify `components/ds/Article.jsx`; Test `tests/article-layout.test.tsx`.

The DS `Article` only supports `layout: "wrap" | "stack"` (float left or full-width-top).
The spec needs `imageLeft | imageRight | imageTop | banner | textOnly`. Map them onto the
existing figure styling without changing anything else.

- [ ] **Step 1: Failing test** — `tests/article-layout.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Article } from "@/components/ds/Article.jsx";

function figureFloat(layout: string) {
  const { container } = render(
    <Article label="L" title="T" image="/x.png" layout={layout as any}><p>b</p></Article>
  );
  const fig = container.querySelector("figure")!;
  return fig.style.float;
}

describe("Article layout variants", () => {
  it("imageLeft floats left", () => expect(figureFloat("imageLeft")).toBe("left"));
  it("imageRight floats right", () => expect(figureFloat("imageRight")).toBe("right"));
  it("imageTop does not float", () => expect(figureFloat("imageTop")).toBe("none"));
  it("textOnly renders no figure", () => {
    const { container } = render(<Article label="L" title="T" layout="textOnly"><p>b</p></Article>);
    expect(container.querySelector("figure")).toBeNull();
  });
});
```

- [ ] **Step 2: Run** → FAIL (current Article treats unknown layouts as non-"wrap" → float none).

- [ ] **Step 3: Modify `components/ds/Article.jsx`** — replace the `figure` style block's
float logic. Change the default param to `layout = "imageLeft"` and compute:

```jsx
  const floatVal = layout === "imageLeft" ? "left" : layout === "imageRight" ? "right" : "none";
  const isFloat = floatVal !== "none";
  const figure = image && layout !== "textOnly" && (
    <figure
      style={{
        margin: 0,
        float: floatVal,
        width: isFloat ? "min(42%, 340px)" : "100%",
        marginRight: floatVal === "left" ? "var(--space-5)" : 0,
        marginLeft: floatVal === "right" ? "var(--space-5)" : 0,
        marginBottom: "var(--space-4)",
      }}
    >
```
Leave the inner `<div>`/`<img>`/`<figcaption>` exactly as they are. (`banner` falls back to
full-width top for v1 — same as `imageTop`; richer banner is a documented fast-follow.)

- [ ] **Step 4: Run** — `npm test tests/article-layout.test.tsx` → Expected: PASS (4 tests).
- [ ] **Step 5: Commit** — `git add components/ds/Article.jsx tests/article-layout.test.tsx && git commit -m "feat: Article image-left/right/top/none layout variants"`

### Task 8: `ArticleBody` — render Story body blocks

**Files:** Create `components/ArticleBody.tsx`; Test `tests/article-body.test.tsx`.

- [ ] **Step 1: Failing test** — `tests/article-body.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleBody } from "@/components/ArticleBody";

describe("ArticleBody", () => {
  it("renders plain paragraph", () => {
    render(<ArticleBody blocks={[{ type: "paragraph", text: "Hello SoKno" }]} />);
    expect(screen.getByText("Hello SoKno")).toBeInTheDocument();
  });
  it("renders bold/italic/link runs", () => {
    render(<ArticleBody blocks={[{ type: "paragraph", runs: [
      { text: "B", bold: true }, { text: "I", italic: true },
      { text: "L", href: "https://x.com" },
    ] }]} />);
    expect(screen.getByText("B").tagName).toBe("STRONG");
    expect(screen.getByText("I").tagName).toBe("EM");
    expect(screen.getByText("L").closest("a")?.getAttribute("href")).toBe("https://x.com");
  });
  it("renders a subhead as h3", () => {
    render(<ArticleBody blocks={[{ type: "subhead", text: "Later" }]} />);
    expect(screen.getByText("Later").tagName).toBe("H3");
  });
});
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement `components/ArticleBody.tsx`:**

```tsx
import * as React from "react";
import type { Block } from "@/lib/schema";

const pStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)",
  lineHeight: "var(--leading-body)", margin: "0 0 14px", color: "var(--ink-black)",
};
const subStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)", fontSize: "var(--label-md)",
  letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
  color: "var(--rust)", margin: "18px 0 8px",
};

function Runs({ runs }: { runs: NonNullable<Extract<Block, { type: "paragraph" }>["runs"]> }) {
  return <>{runs!.map((r, i) => {
    let node: React.ReactNode = r.text;
    if (r.bold) node = <strong>{node}</strong>;
    if (r.italic) node = <em>{node}</em>;
    if (r.href) node = <a href={r.href} target="_blank" rel="noopener noreferrer">{node}</a>;
    return <React.Fragment key={i}>{node}</React.Fragment>;
  })}</>;
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b, i) => {
    if (b.type === "subhead") return <h3 key={i} style={subStyle}>{b.text}</h3>;
    return <p key={i} style={pStyle}>{b.runs ? <Runs runs={b.runs} /> : b.text}</p>;
  })}</>;
}
```

- [ ] **Step 4: Run** — `npm test tests/article-body.test.tsx` → Expected: PASS (3 tests).
- [ ] **Step 5: Commit** — `git add components/ArticleBody.tsx tests/article-body.test.tsx && git commit -m "feat: ArticleBody block renderer"`

### Task 9: `AudioBriefingPlayer` — functional player matching the DS visual

**Files:** Create `components/AudioBriefingPlayer.tsx`; Test `tests/audio-player.test.tsx`.

Reproduce the DS `AudioBriefing` look exactly (copy its markup/styles) but back it with a
real `<audio>`: play/pause drives `audio.play()/.pause()`, progress comes from `timeupdate`,
duration label from `loadedmetadata`, and clicking the timeline seeks. Props: `title`,
`intro`, `description`, `duration`, `src`.

- [ ] **Step 1: Failing test** — `tests/audio-player.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioBriefingPlayer } from "@/components/AudioBriefingPlayer";

describe("AudioBriefingPlayer", () => {
  it("renders title + intro and an audio element with the src", () => {
    const { container } = render(
      <AudioBriefingPlayer title="Weekend Audio Briefing" intro="Hi neighbors."
        description="d" duration="01:30" src="/audio/2026-06-20.mp3" />
    );
    expect(screen.getByText("Weekend Audio Briefing")).toBeInTheDocument();
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).toBeTruthy();
    expect(audio.getAttribute("src")).toBe("/audio/2026-06-20.mp3");
  });
  it("toggles play on button click", () => {
    const play = vi.fn(); const pause = vi.fn();
    HTMLMediaElement.prototype.play = play as any;
    HTMLMediaElement.prototype.pause = pause as any;
    render(<AudioBriefingPlayer intro="i" description="d" duration="01:30" src="/a.mp3" />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(play).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement `components/AudioBriefingPlayer.tsx`** — `"use client"`; copy the
DS `AudioBriefing` styling (stamped header, bold intro, round teal play button, waveform
bars, timeline + dot, description, "LISTEN NOW" cue) and wire a `useRef<HTMLAudioElement>`:

```tsx
"use client";
import * as React from "react";

type Props = { title?: string; intro: string; description: string; duration: string; src: string };

export function AudioBriefingPlayer({
  title = "Weekend Audio Briefing", intro, description, duration, src,
}: Props) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [elapsed, setElapsed] = React.useState("00:00");

  const bars = React.useMemo(
    () => Array.from({ length: 52 }, (_, i) => 18 + Math.round(30 * Math.abs(Math.sin(i * 1.4) * Math.cos(i * 0.5)))),
    []
  );

  const fmt = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${ss}`;
  };

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const onTime = () => {
    const a = audioRef.current; if (!a || !a.duration) return;
    setProgress(a.currentTime / a.duration);
    setElapsed(fmt(a.currentTime));
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const timeStyle: React.CSSProperties = {
    fontFamily: "var(--font-label)", fontSize: "var(--label-sm)",
    letterSpacing: "0.04em", color: "var(--ink-faded)", whiteSpace: "nowrap",
  };

  return (
    <section style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-md)", padding: "var(--space-5)", boxShadow: "var(--shadow-lift)" }}>
      <audio ref={audioRef} src={src} preload="metadata"
        onTimeUpdate={onTime} onEnded={() => setPlaying(false)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase", color: "var(--ink-black)", paddingBottom: 10, marginBottom: 14,
        borderBottom: "var(--border-hair) solid var(--paper-edge)" }}>
        <span aria-hidden style={{ color: "var(--rust)" }}>★</span>{title}
        <span aria-hidden style={{ color: "var(--rust)" }}>★</span>
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--text-deck)",
        lineHeight: 1.3, color: "var(--ink-black)", margin: "0 0 var(--space-4)" }}>{intro}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{ flex: "none", width: 64, height: 64, borderRadius: "var(--radius-pill)",
            border: "var(--border-heavy) solid var(--ink-black)",
            background: hover ? "var(--green-bridge)" : "var(--teal)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background-color 120ms ease", boxShadow: "var(--shadow-press)" }}>
          <span aria-hidden style={{ fontSize: 23, lineHeight: 1, marginLeft: playing ? 0 : 3,
            color: hover ? "var(--paper-cream)" : "var(--ink-black)" }}>{playing ? "❚❚" : "▶"}</span>
        </button>
        <div aria-hidden style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height: 54 }}>
          {bars.map((h, i) => (
            <span key={i} style={{ flex: 1, height: h,
              background: i / bars.length < progress ? "var(--rust)" : "var(--ink-black)",
              opacity: i / bars.length < progress ? 0.9 : 0.55, borderRadius: 1 }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 14px" }}>
        <span style={timeStyle}>{elapsed}</span>
        <div onClick={seek} style={{ flex: 1, height: 3, background: "var(--paper-edge)",
          borderRadius: 999, position: "relative", cursor: "pointer" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`,
            background: "var(--ink-black)", borderRadius: 999 }} />
          <div style={{ position: "absolute", left: `${progress * 100}%`, top: "50%", width: 13, height: 13,
            marginLeft: -6, transform: "translateY(-50%)", background: "var(--rust)",
            border: "2px solid var(--ink-black)", borderRadius: 999 }} />
        </div>
        <span style={timeStyle}>{duration}</span>
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5,
        color: "var(--ink-faded)", margin: 0 }}>{description}</p>
    </section>
  );
}
```

- [ ] **Step 4: Run** — `npm test tests/audio-player.test.tsx` → Expected: PASS (2 tests).
- [ ] **Step 5: Commit** — `git add components/AudioBriefingPlayer.tsx tests/audio-player.test.tsx && git commit -m "feat: functional AudioBriefingPlayer (real <audio>, matches DS visual)"`

### Task 10: `Masthead` — ESM, data-driven

**Files:** Create `components/Masthead.tsx`; Test `tests/masthead.test.tsx`.

Rewrite `DS/ui_kits/sokno-ear/Masthead.jsx` as an ESM client component. Props: `dateline`
string + `sections: {id,label}[]`. Reproduce the dateline strip, full-width masthead image
(`/assets/masthead.png`), and the in-page nav exactly.

- [ ] **Step 1: Failing test** — `tests/masthead.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Masthead } from "@/components/Masthead";

describe("Masthead", () => {
  it("renders dateline + nav links to anchors", () => {
    render(<Masthead dateline="Weekend Edition · Jun 20, 2026 · South Knoxville, TN"
      volLine="Vol. 1 — No. 1" sections={[{ id: "events", label: "Events" }]} />);
    expect(screen.getByText(/Weekend Edition/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Events" });
    expect(link.getAttribute("href")).toBe("#events");
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `components/Masthead.tsx`** — `"use client"`; port the DS markup
(dateline strip with `volLine` on the left, dateline center, `★ soknoear.com` right; the
`<img src="/assets/masthead.png" .../>`; the nav with `NavLink` hover). Use the exact inline
styles from `DS/ui_kits/sokno-ear/Masthead.jsx`, swapping the image `src` to
`/assets/masthead.png` and making `dateline`/`volLine`/`sections` props.

- [ ] **Step 4: Run** — `npm test tests/masthead.test.tsx` → Expected: PASS.
- [ ] **Step 5: Commit** — `git add components/Masthead.tsx tests/masthead.test.tsx && git commit -m "feat: data-driven ESM Masthead"`

---

## Phase 3 — Page composition & routes

### Task 11: `Paper` composition component

**Files:** Create `components/Paper.tsx`, `components/Footer.tsx`. (No unit test — verified
via the page build + visual check in Task 13.)

`Paper` is a server component taking an `Edition` and rendering, in order (mirroring
`DS/ui_kits/sokno-ear/WeeklyPaper.jsx`): feature band (feature `Article` + sticky sidebar
with `AudioBriefingPlayer` + a calendar "Well" of `CalendarItem`s + `EventSubmitForm` +
`SubscribeForm`), the scanner grid of `StoryCard`s, then each `stories[]` as a full
`Article` (passing `layout` from data, **alternating imageLeft/imageRight** by index when a
story doesn't specify), separated by `Divider`, then `Footer`.

- [ ] **Step 1: Create `components/Footer.tsx`** — port the DS `WeeklyPaper` `<footer>` block
(ink-black band, `★ South Knoxville. We Hear Things. ★` in display type, `soknoear.com`,
the foot engravings `/assets/spots/foot_dog.png` + `/assets/spots/foot_bridge.png` with the
invert filter, and the link row **with `Archives` linking to `/archive`**, tagline
"Read by locals. Loved by locals. South Knoxville, all the way.").

- [ ] **Step 2: Create `components/Paper.tsx`** — import the local `Well`/`Page`/`Spot`
helpers from `WeeklyPaper.jsx` (reproduce them inline) and compose. Key wiring:
  - Feature: `<Article id={feature.id} label={feature.label} labelColor={feature.labelColor}
    image={feature.image} imageCaption={feature.imageCaption} title={feature.title}
    deck={feature.deck} facts={feature.facts} layout={feature.layout}>
      <ArticleBody blocks={feature.body} /></Article>`
  - Sidebar audio: `edition.sidebar.audio && <AudioBriefingPlayer {...edition.sidebar.audio} />`
  - Calendar Well: map `edition.sidebar.calendar` → `<CalendarItem .../>` (last one `divider={false}`).
  - Sidebar forms: `<EventSubmitForm />` and `<SubscribeForm />` (Task 12).
  - Scanner: map `edition.scanner` → `<StoryCard .../>`.
  - Stories: map `edition.stories` with alternating layout:
    ```tsx
    {edition.stories.map((s, i) => (
      <React.Fragment key={s.id}>
        {i > 0 && <Divider ornament="star" />}
        <section id={s.id}>
          <SectionHeader>{s.label}</SectionHeader>
          <Article id={s.id} label={s.label} labelColor={s.labelColor} image={s.image}
            imageCaption={s.imageCaption} title={s.title} deck={s.deck} facts={s.facts}
            layout={s.layout ?? (i % 2 === 0 ? "imageLeft" : "imageRight")}>
            <ArticleBody blocks={s.body} />
          </Article>
        </section>
      </React.Fragment>
    ))}
    ```
  - Build the nav `sections` array from feature + stories ids/labels + `{id:"listen",label:"Listen"}`.

- [ ] **Step 3: Verify it compiles** — `npx tsc --noEmit` → Expected: no type errors in
`components/Paper.tsx` / `Footer.tsx`. (Visual verification in Task 13.)

- [ ] **Step 4: Commit** — `git add components/Paper.tsx components/Footer.tsx && git commit -m "feat: data-driven one-page Paper composition + Footer"`

### Task 12: Submission + Subscribe form components (client)

**Files:** Create `components/EventSubmitForm.tsx`, `components/SubscribeForm.tsx`; Test
`tests/forms.test.tsx`.

Match the DS `Tipline` paper-box look (rust rubric heading, copy line, inputs styled like
`Tipline`'s `inputStyle`, `Button`), but **event/news framed** and POSTing JSON. Include a
hidden honeypot field `company`.

- [ ] **Step 1: Failing test** — `tests/forms.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventSubmitForm } from "@/components/EventSubmitForm";
import { SubscribeForm } from "@/components/SubscribeForm";

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
});

describe("forms", () => {
  it("EventSubmitForm posts headline+details to /api/submit", async () => {
    render(<EventSubmitForm />);
    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: "Block party" } });
    fireEvent.change(screen.getByPlaceholderText(/what.*happening|details/i), { target: { value: "Sat noon" } });
    fireEvent.click(screen.getByRole("button", { name: /tell the ear|submit/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/submit", expect.objectContaining({ method: "POST" })));
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.headline).toBe("Block party");
    expect(body.details).toBe("Sat noon");
  });
  it("EventSubmitForm shows a thank-you after success", async () => {
    render(<EventSubmitForm />);
    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: "X" } });
    fireEvent.change(screen.getByPlaceholderText(/what.*happening|details/i), { target: { value: "Y" } });
    fireEvent.click(screen.getByRole("button", { name: /tell the ear|submit/i }));
    await waitFor(() => expect(screen.getByText(/thank|got it|we'?re all ears/i)).toBeInTheDocument());
  });
  it("SubscribeForm posts email to /api/subscribe", async () => {
    render(<SubscribeForm />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/subscribe", expect.anything()));
  });
});
```

- [ ] **Step 2: Run** → FAIL (modules missing).

- [ ] **Step 3: Implement `components/EventSubmitForm.tsx`** — `"use client"`. Fields:
`headline` (input, placeholder "Event or news headline"), `details` (textarea, placeholder
"What's happening? Day, time, place…"), `dates` (input, "When? (date or range)"), `url`
(input, "Link (optional)"), `contact` (input, "Your contact (optional, for follow-up)"),
hidden `company` honeypot. Heading "★ Got an event? Tell The Ear". On submit: `preventDefault`,
require `headline` + `details`, `fetch("/api/submit", { method:"POST", headers:{'content-type':'application/json'}, body: JSON.stringify({...}) })`,
on ok show a thank-you ("Thank you — we're all ears."). Use the DS `Tipline` `inputStyle` and
the DS `Button variant="rust" arrow`. Reuse the box/heading styles from `Tipline.jsx`.

- [ ] **Step 4: Implement `components/SubscribeForm.tsx`** — `"use client"`. Heading
"★ Get the Ear Delivered", copy "Sign up for the weekly dispatch — events and stories from
around SoKno.", `email` input + honeypot, POST `/api/subscribe`, thank-you on success.
Use `Button variant="primary"`.

- [ ] **Step 5: Run** — `npm test tests/forms.test.tsx` → Expected: PASS (3 tests).
- [ ] **Step 6: Commit** — `git add components/EventSubmitForm.tsx components/SubscribeForm.tsx tests/forms.test.tsx && git commit -m "feat: event/news submit + subscribe form components"`

### Task 13: Routes — home, permalink, archive, 404

**Files:** Create/replace `app/page.tsx`, `app/[slug]/page.tsx`, `app/archive/page.tsx`,
`app/not-found.tsx`.

- [ ] **Step 1: `app/page.tsx`** (latest):

```tsx
import { getLatest } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const e = getLatest();
  return { title: `The South Knoxville Ear — ${e.dateLabel ?? e.date}`,
    description: e.feature.deck ?? e.feature.title };
}
export default function Home() {
  return <Paper edition={getLatest()} />;
}
```

- [ ] **Step 2: `app/[slug]/page.tsx`** (permalink):

```tsx
import { getBySlug, loadEditions } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return loadEditions().map((e) => ({ slug: e.slug }));
}
export default async function EditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = getBySlug(undefined, slug);
  if (!edition) notFound();
  return <Paper edition={edition} />;
}
```

- [ ] **Step 3: `app/archive/page.tsx`** — list past editions; epigraph when none:

```tsx
import Link from "next/link";
import { getPast } from "@/lib/editions";

export const metadata = { title: "The South Knoxville Ear — Past Issues" };

export default function Archive() {
  const past = getPast();
  if (past.length === 0) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "10vh 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 680 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,3.5vw,2.6rem)",
            lineHeight: 1.2, color: "var(--ink-black)", margin: 0 }}>
            "There are far, far better things ahead than any we leave behind."
          </p>
          <p style={{ fontFamily: "var(--font-label)", letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase", color: "var(--rust)", marginTop: 18 }}>— C.S. Lewis</p>
          <p style={{ marginTop: 36 }}><Link href="/">★ Back to this week's Ear</Link></p>
        </div>
      </main>
    );
  }
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Past Issues</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {past.map((e) => (
          <li key={e.slug} style={{ padding: "12px 0", borderBottom: "1px solid var(--paper-edge)" }}>
            <Link href={`/${e.slug}`}>{e.dateLabel ?? e.date} — Vol. {e.volume} No. {e.number}</Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 36 }}><Link href="/">★ Back to this week's Ear</Link></p>
    </main>
  );
}
```

- [ ] **Step 4: `app/not-found.tsx`** — simple in-brand 404 with a link home.

- [ ] **Step 5: Verify build + visual** — temporarily add a fixture edition so the page renders:
```bash
mkdir -p content/editions
cp tests/fixtures/editions/2026-06-20.json content/editions/2026-06-20.json
npm run build && npm start &
```
Open `http://localhost:3000` and `http://localhost:3000/archive`. Expected: the one-page paper
renders (masthead, feature, sidebar, scanner, stories, footer) and `/archive` shows the C.S.
Lewis epigraph. Capture a screenshot with the Claude Preview MCP and compare against
`DS/assets/SoKnoEAR_Page.png`. Stop the server. (This fixture is replaced by real content in
Phase 5 — leave it for now so later tasks have something to render.)

- [ ] **Step 6: Commit** — `git add app/ content/editions/2026-06-20.json && git commit -m "feat: routes — home, permalink, archive (CS Lewis empty state), 404"`

---

## Phase 4 — Backend: SQLite + Resend + API routes (TDD)

### Task 14: SQLite store (`lib/db.ts`)

**Files:** Create `lib/db.ts`; Test `tests/db.test.ts`. Modify `.env.example`.

- [ ] **Step 1: Failing test** — `tests/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { openDb, insertSubmission, insertSubscriber } from "@/lib/db";

function tmp() { return path.join(os.tmpdir(), `ear-${Math.random().toString(36).slice(2)}.db`); }

describe("db", () => {
  it("creates tables and inserts a submission", () => {
    const f = tmp(); const db = openDb(f);
    const id = insertSubmission(db, { headline: "H", details: "D", url: "", dates: "", contact: "" });
    expect(id).toBeGreaterThan(0);
    const row = db.prepare("SELECT headline FROM submissions WHERE id=?").get(id) as any;
    expect(row.headline).toBe("H");
    fs.rmSync(f, { force: true });
  });
  it("dedupes subscribers by email", () => {
    const db = openDb(tmp());
    insertSubscriber(db, "a@b.com");
    insertSubscriber(db, "a@b.com");
    const n = (db.prepare("SELECT COUNT(*) c FROM subscribers").get() as any).c;
    expect(n).toBe(1);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `lib/db.ts`:**

```ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Submission = { headline: string; details: string; url?: string; dates?: string; contact?: string };

export function openDb(file = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "ear.db")) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      headline TEXT NOT NULL, details TEXT NOT NULL,
      url TEXT, dates TEXT, contact TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

let _db: Database.Database | null = null;
export function db() { return (_db ??= openDb()); }

export function insertSubmission(d: Database.Database, s: Submission): number {
  const r = d.prepare(
    "INSERT INTO submissions (headline, details, url, dates, contact) VALUES (?,?,?,?,?)"
  ).run(s.headline, s.details, s.url ?? "", s.dates ?? "", s.contact ?? "");
  return Number(r.lastInsertRowid);
}

export function insertSubscriber(d: Database.Database, email: string): void {
  d.prepare("INSERT OR IGNORE INTO subscribers (email) VALUES (?)").run(email);
}
```

- [ ] **Step 4: Add to `.env.example`:** `SQLITE_PATH=./data/ear.db` (commented note: on VPS use `/var/lib/soknoear/ear.db`).
- [ ] **Step 5: Run** — `npm test tests/db.test.ts` → Expected: PASS (2 tests).
- [ ] **Step 6: Commit** — `git add lib/db.ts tests/db.test.ts .env.example && git commit -m "feat: SQLite store for submissions + subscribers"`

### Task 15: Resend mail (`lib/mail.ts`)

**Files:** Create `lib/mail.ts`; Test `tests/mail.test.ts`. Modify `.env.example`.

- [ ] **Step 1: Failing test** — `tests/mail.test.ts` (mock the Resend client):

```ts
import { describe, it, expect, vi } from "vitest";

const send = vi.fn(async () => ({ data: { id: "x" }, error: null }));
vi.mock("resend", () => ({ Resend: vi.fn(() => ({ emails: { send } })) }));

import { sendSubmissionEmail } from "@/lib/mail";

describe("mail", () => {
  it("sends from send.note15.com to andy@note15.com with the headline in the subject", async () => {
    process.env.RESEND_API_KEY = "test";
    await sendSubmissionEmail({ headline: "Block party", details: "Sat noon", url: "", dates: "", contact: "" });
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0] as any;
    expect(arg.from).toContain("send.note15.com");
    expect(arg.to).toContain("andy@note15.com");
    expect(arg.subject).toContain("Block party");
  });
  it("no-ops without an API key (does not throw)", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendSubmissionEmail({ headline: "H", details: "D" })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `lib/mail.ts`:**

```ts
import { Resend } from "resend";
import type { Submission } from "./db";

const FROM = process.env.SUBMIT_FROM || "The Ear <ear@send.note15.com>";
const TO = process.env.SUBMIT_TO || "andy@note15.com";

export async function sendSubmissionEmail(s: Submission): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[mail] RESEND_API_KEY unset — skipping email"); return; }
  const resend = new Resend(key);
  const lines = [
    `Headline: ${s.headline}`,
    `Details: ${s.details}`,
    s.dates ? `Dates: ${s.dates}` : "",
    s.url ? `Link: ${s.url}` : "",
    s.contact ? `Contact: ${s.contact}` : "",
  ].filter(Boolean).join("\n");
  const { error } = await resend.emails.send({
    from: FROM, to: TO, subject: `New event/news: ${s.headline}`, text: lines,
  });
  if (error) console.error("[mail] resend error", error);
}
```

- [ ] **Step 4: Add to `.env.example`:** `RESEND_API_KEY=`, `SUBMIT_FROM=The Ear <ear@send.note15.com>`, `SUBMIT_TO=andy@note15.com`.
- [ ] **Step 5: Run** — `npm test tests/mail.test.ts` → Expected: PASS (2 tests).
- [ ] **Step 6: Commit** — `git add lib/mail.ts tests/mail.test.ts .env.example && git commit -m "feat: Resend submission email transport"`

### Task 16: API routes `/api/submit` + `/api/subscribe`

**Files:** Create `app/api/submit/route.ts`, `app/api/subscribe/route.ts`; Test
`tests/api.test.ts`.

- [ ] **Step 1: Failing test** — `tests/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import os from "node:os"; import path from "node:path";

vi.mock("@/lib/mail", () => ({ sendSubmissionEmail: vi.fn(async () => {}) }));

beforeEach(() => { process.env.SQLITE_PATH = path.join(os.tmpdir(), `api-${Math.random()}.db`); vi.resetModules(); });

describe("api", () => {
  it("POST /api/submit stores + emails; rejects missing headline; ignores honeypot", async () => {
    const { POST } = await import("@/app/api/submit/route");
    const ok = await POST(new Request("http://x/api/submit", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "H", details: "D" }) }));
    expect(ok.status).toBe(200);
    const bad = await POST(new Request("http://x/api/submit", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ details: "D" }) }));
    expect(bad.status).toBe(400);
    const bot = await POST(new Request("http://x/api/submit", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline: "H", details: "D", company: "spam" }) }));
    expect(bot.status).toBe(200); // silently accepted, not stored
  });
  it("POST /api/subscribe stores a valid email; rejects junk", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    expect((await POST(new Request("http://x", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.com" }) }))).status).toBe(200);
    expect((await POST(new Request("http://x", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "nope" }) }))).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement `app/api/submit/route.ts`:**

```ts
import { NextResponse } from "next/server";
import { db, insertSubmission } from "@/lib/db";
import { sendSubmissionEmail } from "@/lib/mail";

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true });            // honeypot: pretend success
  const headline = String(b.headline ?? "").trim();
  const details = String(b.details ?? "").trim();
  if (!headline || !details) return NextResponse.json({ error: "headline and details required" }, { status: 400 });
  const s = { headline: headline.slice(0, 300), details: details.slice(0, 5000),
    url: String(b.url ?? "").slice(0, 500), dates: String(b.dates ?? "").slice(0, 200),
    contact: String(b.contact ?? "").slice(0, 300) };
  insertSubmission(db(), s);
  await sendSubmissionEmail(s);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement `app/api/subscribe/route.ts`:**

```ts
import { NextResponse } from "next/server";
import { db, insertSubscriber } from "@/lib/db";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true });
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ error: "valid email required" }, { status: 400 });
  insertSubscriber(db(), email);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run** — `npm test tests/api.test.ts` → Expected: PASS (2 tests).
- [ ] **Step 6: Full suite** — `npm test` → Expected: all green.
- [ ] **Step 7: Commit** — `git add app/api tests/api.test.ts && git commit -m "feat: /api/submit + /api/subscribe (validation, honeypot, store, email)"`

---

## Phase 5 — Edition Zero content (June 19–21, 2026)

> These tasks PRODUCE content (research, prose, art, audio), not framework code. Each output
> drops into `content/editions/2026-06-20.json` + `public/assets/spots/` + `public/audio/`.
> Follow the spec §12 lineup and the lexicon (`content/LEXICON.md`). **Andy reviews the prose
> before publish.**

### Task 17: Research & verify the events

**Files:** working notes only (not committed).

- [ ] **Step 1:** Use WebSearch/WebFetch to verify each candidate event for the weekend of
June 19–21, 2026: SoKno Pride Festival (Sevier Ave), Ijams fireflies night walk, Meads Quarry
bird banding, Roni's Mac Bar grand opening (Island Home Ave), Summer Burn 5K, Make Music Day
(bluegrass jam + Pink Cactus live-band karaoke), and the nearby property rezoning. Capture for
each: exact name, date/time, location/address, cost, and a source URL.
- [ ] **Step 2:** Flag anything that can't be confirmed and ask Andy. Drop unconfirmable items.
Ask Andy for ground truth on Roni's Mac Bar opening date and the rezoning specifics.
- [ ] **Step 3:** No commit (research notes are scratch).

### Task 18: Generate spot art (Higgsfield)

**Files:** Create `public/assets/spots/<new>.png`.

- [ ] **Step 1:** Reuse existing spots where they fit: Pride → `s1_flag.png`/`feature_flag.png`;
fireflies → `s5_fire.png`; Paws → `m2_paw.png`; rumor/percolator slot is dropped.
- [ ] **Step 2:** For each story lacking a fitting spot (bird banding, Roni's Mac Bar, Summer
Burn 5K, Make Music Day, rezoning), call the Higgsfield `generate_image` MCP using the
`DESIGN_DIRECTION.md` §12 formula, e.g. for Roni's:
  > "Create a small vintage newspaper spot illustration for a South Knoxville community
  > article about a new mac-and-cheese restaurant opening near the riverfront. Black ink
  > linework, stipple shading, slight engraving texture, warm cream paper background,
  > restrained muted teal and rust-red accents. Hand-drawn local newspaper feel, charming and
  > specific, not generic. No modern glossy vector style. Subtle South Knoxville cue (riverfront
  > railing or Sevier Ave streetlamp). Square thumbnail, no text in the image."
- [ ] **Step 3:** Save each as `public/assets/spots/<slug>.png` (e.g. `ronis_mac.png`,
`bird_banding.png`, `summer_burn_5k.png`, `make_music.png`, `rezoning.png`). Keep them square,
small-friendly, no embedded text.
- [ ] **Step 4: Commit** — `git add public/assets/spots && git commit -m "content: spot engravings for Edition Zero"`

### Task 19: Write `content/editions/2026-06-20.json`

**Files:** Replace the Task-13 fixture `content/editions/2026-06-20.json` with the real edition.

- [ ] **Step 1:** Author the edition object per the Task-4 schema: `volume:1, number:1,
edition:"Weekend Edition", date:"2026-06-20", dateLabel:"Fri–Sun, Jun 19–21, 2026",
place:"South Knoxville, TN"`. Write the feature (SoKno Pride Festival), the `scanner` cards,
and each `stories[]` entry (fireflies, bird banding, Roni's Mac Bar, Summer Burn 5K, Make
Music Day, the rezoning under an "Around the Neighborhood" label), each with `label`, `layout`
(alternate imageLeft/imageRight), `image` (the Task-18 spots), `deck`, `facts` (When/Where/
Cost from Task 17), and `body` blocks. Voice per `README.md` Content Fundamentals + the
lexicon. **No certainty labels.** Build the `sidebar.calendar` from the verified events.
- [ ] **Step 2:** Add `sidebar.audio` after Task 20 (it needs the final MP3 + duration).
- [ ] **Step 3: Validate** — `npx vitest run -t "valid edition"` won't cover it; instead run
`node -e "const {EditionSchema}=require('./lib/schema'); ..."` is awkward with TS — instead run
`npm run build` and confirm the edition parses (the loader throws on bad data). Expected: build
succeeds and the home page renders the real content.
- [ ] **Step 4:** Have Andy review the prose. Apply edits.
- [ ] **Step 5: Commit** — `git add content/editions/2026-06-20.json && git commit -m "content: Edition Zero (June 19-21) stories"`

### Task 20: Generate the audio briefing (ElevenLabs, Andy's voice)

**Files:** Create `public/audio/2026-06-20.mp3`; update `sidebar.audio` in the edition JSON.

- [ ] **Step 1:** Write a ~90-second first-person script from the edition's stories (warm,
neighborly radio-dispatch tone). Spell tricky words for TTS per the lexicon — **write "So-No"**
for SoKno, "suh-VEER" cues where helpful.
- [ ] **Step 2:** Call the ElevenLabs `generate_tts` MCP tool with voice ID
`fnpVoGi5UsfmnuvEQTHG` and the script; save the returned audio to
`public/audio/2026-06-20.mp3`.
- [ ] **Step 3:** Listen back; confirm it says "So-No" (not "sock-no"). Re-generate with
adjusted spelling if needed. Note the real duration (e.g. "01:32").
- [ ] **Step 4:** Set `sidebar.audio` in `content/editions/2026-06-20.json`:
`{ title:"Weekend Audio Briefing", intro:"What's happening in SoKno this weekend.",
description:"Your ninety-second listen for the weekend around South Knoxville.",
duration:"01:32", src:"/audio/2026-06-20.mp3" }`.
- [ ] **Step 5: Verify** — `npm run build && npm start`, open home, press play, confirm Andy's
voice plays and the waveform/timer advance. Stop server.
- [ ] **Step 6: Commit** — `git add public/audio/2026-06-20.mp3 content/editions/2026-06-20.json && git commit -m "content: weekend audio briefing in Andy's voice"`

---

## Phase 6 — Print + SEO polish

### Task 21: Print stylesheet + per-edition Open Graph

**Files:** Create `styles/print.css` (imported by `app/globals.css` via `@media print`);
Modify `app/page.tsx` / `app/[slug]/page.tsx` metadata.

- [ ] **Step 1:** Add a `@media print` block (in `globals.css` or a dedicated import): hide the
nav, forms, and audio player; force cream/ink; avoid breaking `Article`s across pages
(`article { break-inside: avoid; }`); set a sensible print width. Verify with the browser
print preview that it reads as one clean broadsheet.
- [ ] **Step 2:** Per-edition OG/Twitter metadata: in `generateMetadata`, set `openGraph`
title/description and an `images` entry (the masthead `/assets/masthead.png`). Add
`app/icon.png` (favicon) from a cropped masthead/possum.
- [ ] **Step 3: Verify** — `npm run build`; check `<head>` of the rendered home page contains
the OG tags. Print-preview the page.
- [ ] **Step 4: Commit** — `git add styles/print.css app/ && git commit -m "feat: print stylesheet + per-edition OG metadata"`

---

## Phase 7 — Deploy to the DO VPS (soknoear.com)

> VPS: Ubuntu 24.04, Node 20.20, nginx 1.24, certbot 2.9, PM2 6. `ssh andy@143.244.188.235`
> (passwordless sudo). DNS for soknoear.com must point to `143.244.188.235` before certbot.

### Task 22: GitHub repo + PM2 + nginx config files

**Files:** Create `ecosystem.config.js`, `deploy/soknoear.com.nginx`, `scripts/redeploy.sh`.

- [ ] **Step 1: Create the GitHub repo and push** (use `gh`):
```bash
gh repo create theandyroberts/sokno_ear_web --private --source=. --remote=origin --push
```
(If the remote already exists, just `git push -u origin main`.)

- [ ] **Step 2: `ecosystem.config.js`** (PM2 runs the standalone server on port 3007):
```js
module.exports = {
  apps: [{
    name: "soknoear",
    script: ".next/standalone/server.js",
    cwd: "/var/www/soknoear",
    env: { NODE_ENV: "production", PORT: "3007", HOSTNAME: "127.0.0.1",
           SQLITE_PATH: "/var/lib/soknoear/ear.db" },
  }],
};
```
> Note: `next build` with `output:"standalone"` emits `.next/standalone/server.js` but does NOT
> copy `public/` or `.next/static` — the redeploy script (Step 4) copies them in.

- [ ] **Step 3: `deploy/soknoear.com.nginx`** (reverse proxy; mirror existing note15 vhosts):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name soknoear.com www.soknoear.com;

    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
(certbot will add the 443 server block + redirect in Task 23.)

- [ ] **Step 4: `scripts/redeploy.sh`** (run ON the VPS to publish a new edition/build):
```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/soknoear
git pull --ff-only
npm ci
npm run build
# standalone needs static + public copied alongside server.js
cp -R public .next/standalone/public
cp -R .next/static .next/standalone/.next/static
pm2 startOrReload /var/www/soknoear/ecosystem.config.js
echo "deployed $(git rev-parse --short HEAD)"
```
Make it executable: `chmod +x scripts/redeploy.sh`.

- [ ] **Step 5: Commit + push** — `git add ecosystem.config.js deploy scripts && git commit -m "chore: PM2 + nginx + redeploy config for VPS" && git push`

### Task 23: Provision on the VPS

**Files:** none in repo (server-side actions). Run from the dev machine via `ssh`.

- [ ] **Step 1: Ensure build tools for better-sqlite3** (native module):
```bash
ssh andy@143.244.188.235 'sudo apt-get update && sudo apt-get install -y build-essential python3'
```

- [ ] **Step 2: Clone + data dir + env:**
```bash
ssh andy@143.244.188.235 'sudo mkdir -p /var/www && sudo chown $USER /var/www \
  && git clone https://github.com/theandyroberts/sokno_ear_web /var/www/soknoear \
  && sudo mkdir -p /var/lib/soknoear && sudo chown $USER /var/lib/soknoear'
# copy the production env (Resend key) — never commit it
scp .env.local andy@143.244.188.235:/var/www/soknoear/.env.local
```
(Next loads `.env.local` automatically; PM2 env also sets SQLITE_PATH/PORT.)

- [ ] **Step 3: First build + start under PM2:**
```bash
ssh andy@143.244.188.235 'cd /var/www/soknoear && npm ci && npm run build \
  && cp -R public .next/standalone/public && cp -R .next/static .next/standalone/.next/static \
  && pm2 start ecosystem.config.js && pm2 save'
```
Verify locally on the box: `ssh ... 'curl -sI http://127.0.0.1:3007 | head -1'` → `HTTP/1.1 200 OK`.

- [ ] **Step 4: Install nginx vhost:**
```bash
ssh andy@143.244.188.235 'sudo cp /var/www/soknoear/deploy/soknoear.com.nginx /etc/nginx/sites-available/soknoear.com \
  && sudo ln -sf /etc/nginx/sites-available/soknoear.com /etc/nginx/sites-enabled/soknoear.com \
  && sudo nginx -t && sudo systemctl reload nginx'
```

- [ ] **Step 5: DNS gate, then TLS** — confirm the A record points to the VPS first:
```bash
getent hosts soknoear.com   # must show 143.244.188.235 (currently 216.40.34.41)
```
When it resolves to the VPS:
```bash
ssh andy@143.244.188.235 'sudo certbot --nginx -d soknoear.com -d www.soknoear.com --non-interactive --agree-tos -m andy@note15.com --redirect'
```
Expected: certbot issues the cert and rewrites the vhost for 443 + HTTP→HTTPS redirect.

- [ ] **Step 6: Final verification** — from the dev machine:
```bash
curl -sI https://soknoear.com | head -1          # HTTP/2 200
```
Open `https://soknoear.com` in a browser: masthead, full scroll, audio plays, submit a test
event (confirm it emails Andy and lands in SQLite: `ssh ... 'sqlite3 /var/lib/soknoear/ear.db "SELECT * FROM submissions;"'`),
and `https://soknoear.com/archive` shows the epigraph. Run a Lighthouse pass.
- [ ] **Step 7:** Tell Andy it's live; capture the production screenshot.

---

## Self-Review (completed against the spec)

- **Spec coverage:** §2 editorial (no certainty labels; submission framing) → Tasks 12, 19.
  §3 architecture (JSON/standalone/SQLite/Resend) → Tasks 1, 4, 14, 15. §4 data model →
  Task 4. §5 layouts → Task 7 + Task 11 alternation (banner deferred, noted). §6 routes/
  archive epigraph → Task 13. §7 forms (headline+details required; url/dates/contact;
  honeypot) → Tasks 12, 16. §8 audio (Andy's voice, lexicon) → Tasks 9, 20. §9 spot art →
  Task 18. §10 repo structure → File Structure. §11 deploy (PM2/nginx/certbot-after-DNS) →
  Tasks 22–23. §12 Edition Zero → Tasks 17–20. §13 verification → Tasks 13, 16, 20, 23.
  §14 out-of-scope respected (no newsletter send; no Newsroom automation).
- **Placeholders:** none — every code step shows full code; content tasks (17–20) specify
  exact tools, prompts, schema, and outputs.
- **Type consistency:** `Edition`/`Story`/`Block`/`StoryCard`/`CalEvent`/`Audio` from
  `lib/schema.ts` are used consistently; `Submission` from `lib/db.ts` flows to `lib/mail.ts`
  and `app/api/submit`; `AudioBriefingPlayer` props match `sidebar.audio` shape.

## Known follow-ups (not blocking v1)

- `banner` full-bleed layout variant (v1 renders it as `imageTop`).
- Newsletter sending (Listmonk + AWS SES) — subscribers are captured now.
- Rate-limiting beyond the honeypot (add per-IP throttle if spam appears).
- Move Edition Zero's design-system source folder decision (commit `assets/` DS folder or keep
  untracked) — currently untracked; the app copies what it needs into `public/`.
