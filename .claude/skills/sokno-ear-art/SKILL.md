---
name: sokno-ear-art
description: Use when generating, tracing, or placing artwork for The South Knoxville Ear — category/article engravings, recognizable WSJ-stipple portraits of real locals from a photo, or optimizing diagrams. Covers the Higgsfield recipes, the brand palette, optimization, and placement.
---

# The South Knoxville Ear — Art Pipeline

All art for the Ear is **vintage local-newspaper engraving**: black-ink linework,
stipple dots, cross-hatch shading, warm cream paper, restrained teal + rust accents.
Three generation modes. All use the **Higgsfield MCP** (`generate_image`,
`remove_background`, `media_upload_widget`) and end with optimization + placement.

## Brand constants (use in every generation)

- **Palette:** ink `#171512`, cream `#F3E8D2`, teal `#7FAEA3`, rust `#A94A34`
- **Background:** `#F3E8D2` (cream)
- **Always end the prompt with:** "Hand-drawn local newspaper engraving, not a
  photograph, not flat vector. No text or letters anywhere."
- **Optimize before committing:** `scripts/optimize-image.sh <in> <out.jpg> 900 88`
- **Place under:** `public/assets/spots/<name>.jpg` (art) or
  `public/assets/diagrams/<name>` (diagrams); reference in the edition JSON
  `image` / `imageTop` field, or in a page `<Figure>`.
- After viewing each result with the Read tool, only ship it if it reads at small size.

---

## Mode 1 — Category & article illustrations (text → engraving)

For scene/object spot art (events, food, places, abstract concepts). No real people.

- **Model:** `recraft-v4-1`, `model_type: "standard"`
- **Params:** `colors: ["#171512","#F3E8D2","#7FAEA3","#A94A34"]`,
  `background_color: "#F3E8D2"`, `aspect_ratio` per layout
  (`1:1` spot, `3:4` portrait, `16:9`/`3:2` banner)
- **Prompt template:**
  > "A vintage local-newspaper engraving for a South Knoxville article about
  > **[subject/scene, specific to SoKno]**. **[key visual details]**.
  > Predominantly black ink linework with stipple dots and cross-hatch shading,
  > slight engraving texture, warm cream paper background, restrained accents in
  > muted teal and rust red. Charming and specific, not generic. Hand-drawn local
  > newspaper engraving, not a photograph, not flat vector. No text or letters anywhere."

Examples shipped: bird-banding (gloved hands), fireflies at Ijams, Kern's mac &
cheese, Old Sevier traffic circle, Serena solo portrait.

---

## Mode 2 — Photo → WSJ-style stipple portrait (recognizable real locals)

For profiles where the subject must be **recognizable**. Three steps.

1. **Get the photo into Higgsfield.** Remote MCP can't read chat attachments —
   call `media_upload_widget` (`type:"image"`, `max_files:1`). User uploads → you
   get a `media_id`. (Fallback: user uploads in Higgsfield, pastes the media_id.)

2. **Remove background** → `remove_background({ media_id, media_type:"image" })`.
   Poll `job_display`; the completed **job_id is the input for step 3**. Drops the
   busy background so the trace focuses on the subject.

3. **Trace + colorize** → `generate_image` with a reference image:
   - **Model:** `gpt_image_2` (`quality:"high"`) is the **reliable default** —
     Nano Banana (`nano_banana_pro`) often gives a better likeness but **frequently
     fails on policy when redrawing real faces**, so run it as a parallel attempt,
     not the only one.
   - **Reference:** `medias: [{ role:"image", value:"<bg-removed job_id>" }]`
   - **Aspect:** match the source (`2:3` / `3:4` portrait)
   - **Prompt template:**
     > "Turn this reference photo into a hand-drawn vintage newspaper hedcut
     > illustration in the Wall Street Journal stipple style: fine black-ink
     > STIPPLE dots and cross-hatch shading, keeping **[subject(s)]** looking like
     > the reference (same faces, hair, expressions, pose) so they stay
     > recognizable. **[true-to-life details: exact hair color, etc. — e.g. keep
     > strawberry-blond hair, NOT bright red]**. Then add restrained hand-tinted
     > color from only this palette: cream `#F3E8D2` background, muted teal
     > `#7FAEA3`, rust red `#A94A34`. Plain cream background. Hand-drawn engraving,
     > not a photograph, not flat vector. No text or letters."

**Recognizability guardrails:** use a clear front-facing photo; name the subject's
true hair/skin/eye color and distinctive features explicitly (models drift toward
generic red hair, etc.); remove background first; review at both thumbnail and full
size. WSJ hedcuts are classically monochrome — the palette tint is the Ear's twist;
drop the colorize sentence for a pure B&W hedcut.

---

## Mode 3 — Diagrams (XiaoHei charts, maps, how-to graphics) → optimize, place as-is

When the user supplies a **finished** diagram/chart, do **not** restyle it.

1. Receive the source file (user upload or provided path).
2. **Optimize only:** `scripts/optimize-image.sh <in> <out> <maxEdge> <q>`.
   Use `.png` output for flat/line art (crisp edges), `.jpg` for anything with
   gradients/photos. Bump `maxEdge` (e.g. 1200–1400) if the diagram has fine text.
3. **Place as-is** under `public/assets/diagrams/` (or `spots/`); reference in the
   edition JSON. An old-timey rounded frame is optional (see the traffic-circle
   "for the locals" story for the pattern) — but keep the original artwork untouched.

Goal: minimal page weight, original look preserved.
