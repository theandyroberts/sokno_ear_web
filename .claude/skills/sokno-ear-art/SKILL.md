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
  `public/assets/diagrams/<name>` (diagrams); reference in the episode JSON
  `image` / `imageTop` field, or in a page `<Figure>`.
- After viewing each result with the Read tool, only ship it if it reads at small size
  (the 120-pixel test under Mode 1).

---

## Mode 1 — Category & article illustrations (text → engraving)

For spot art (events, food, places, abstract concepts). No real, recognizable people.

### One subject, close in (Andy, 2026-09-28)

**Pick one thing and fill the frame with it. Do not draw the scene.** The picture is
seen first as a thumbnail an inch wide, in a feed, by someone who has not read the
story. A wide view of a place with small figures in it turns to grey texture at that
size. One large subject still reads.

The six best-read Instagram posts on record are a plate and two glasses, a margarita, a
gavel on a newspaper, a banjo and a pair of boots: one object, close. The week that
read lowest (No. 15, 4.9 reach a post) was a quarry from the far bank, a class seen
from the back of the room, a lawn, a trail through the woods.

Before writing the prompt, answer: **what is the one thing, and what is it doing?**

| The story | Don't draw | Draw |
| --- | --- | --- |
| A hula-hoop class | The class, the room | A hoop spinning at one dancer's bare waist, cropped from ribs to hips |
| A circus on the lawn | The tent, the crowd, the whole troupe | One clown breathing fire, from the chest up |
| DJs or a band at the quarry | The quarry with a stage in the distance | A singer sweating into the microphone, eyes shut |
| A guided night paddle | The river, the bank, the moon, the boats | One paddle blade breaking the water, the moon in the drips |
| A bat walk | People on a trail at dusk | One bat, wings open, filling the frame |
| A wildflower walk | A meadow | One bloom with a bee on it, hand for scale |
| A food hall's game day | The hall and its screens | A hand lifting one loaded slice, or a beer at the moment it's poured |

Rules for the prompt:

- **Name the subject first**, then the crop: "extreme close-up", "cropped from the chest
  up", "fills the frame edge to edge". Say what is out of frame if the model keeps
  pulling back ("no horizon, no background scenery").
- **The subject takes two thirds of the picture or more.** If you can see the ground
  it stands on and the sky above it, you are too far away.
- **Something is happening.** Spinning, pouring, breathing fire, breaking the water.
  A subject at rest is a catalogue photo.
- **People are fine and usually better**: a body part, a gesture, a face in the act.
  Nobody real or recognizable (that's Mode 2), and nothing you wouldn't run in a
  family newspaper.
- **One week, many subjects.** Seven stories from one park must not be seven views of
  the park. Check the week's pictures side by side before shipping any of them.
- A place may still be the subject when the place is the news (a building opening, a
  road closing). Then draw one telling piece of it, close: the new sign, the barricade.

**The test:** shrink it to 120 pixels wide. If you can't say what it is in two words,
redo it closer.

- **Model:** `recraft-v4-1`, `model_type: "standard"`
- **Params:** `colors: ["#171512","#F3E8D2","#7FAEA3","#A94A34"]`,
  `background_color: "#F3E8D2"`, `aspect_ratio` per layout
  (`1:1` spot, `3:4` portrait, `16:9`/`3:2` banner)
- **Prompt template:**
  > "A vintage local-newspaper engraving: **[the one subject, and what it is doing]**,
  > **[the crop — extreme close-up / from the chest up / fills the frame edge to edge]**.
  > **[two or three telling details on the subject itself]**. No wide view, no
  > background scenery.
  > Predominantly black ink linework with stipple dots and cross-hatch shading,
  > slight engraving texture, warm cream paper background, restrained accents in
  > muted teal and rust red. Charming and specific, not generic. Hand-drawn local
  > newspaper engraving, not a photograph, not flat vector. No text or letters anywhere."

Shipped examples that got it right: bird-banding (two gloved hands and one bird),
Kern's mac & cheese (the dish), Earl's margarita (the glass).

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
   - **References (two — this is the key):** pass BOTH the subject AND a real **WSJ
     hedcut sample** as a style exemplar; the sample is what actually yields the
     stipple/hatch (text alone tops out at smooth cross-hatch):
     `medias: [{ role:"image", value:"<bg-removed subject job_id>" }, { role:"image", value:"<WSJ hedcut sample media_id>" }]`.
     In the prompt, call image 2 "STYLE only — do not copy its subject." Have the user
     upload a hedcut sample via `media_upload_widget`, or keep one on hand.
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

**Coarser, unmistakable dots (optional post-process):** generators top out at fine
hatch. For bolder stipple, dither the engraving — PIL: grayscale → `autocontrast` →
downscale ~560px → `.convert("1")` (Floyd–Steinberg) → upscale NEAREST →
`ImageOps.colorize(black="#171512", white="#F3E8D2")`; blend ~15% of the colored
engraving back for a hint of color. Trades fidelity for grain.

---

## Mode 3 — Diagrams (XiaoHei charts, maps, how-to graphics) → optimize, place as-is

When the user supplies a **finished** diagram/chart, do **not** restyle it.

1. Receive the source file (user upload or provided path).
2. **Optimize only:** `scripts/optimize-image.sh <in> <out> <maxEdge> <q>`.
   Use `.png` output for flat/line art (crisp edges), `.jpg` for anything with
   gradients/photos. Bump `maxEdge` (e.g. 1200–1400) if the diagram has fine text.
3. **Place as-is** under `public/assets/diagrams/` (or `spots/`); reference in the
   episode JSON. An old-timey rounded frame is optional (see the traffic-circle
   "for the locals" story for the pattern) — but keep the original artwork untouched.

Goal: minimal page weight, original look preserved.
