---
name: sokno-ear-art
description: Use when generating, tracing, or placing artwork for The South Knoxville Ear — category/article engravings, recognizable WSJ-stipple portraits of real locals from a photo, or optimizing diagrams. Covers the Higgsfield recipes, the brand palette, optimization, and placement.
---

# The South Knoxville Ear — Art Pipeline

All art for the Ear is **vintage local-newspaper engraving**: black-ink linework, stipple dots,
cross-hatch shading, warm cream paper, restrained pine + rust accents. Three generation modes,
all ending with optimization + placement. **Since 2026-10-27 the weekly story art is made in
ChatGPT Image (the latest image model), driven by computer control of the ChatGPT desktop app or,
when that grant is refused in a scheduled run, at chatgpt.com in the built-in browser pane
(Andy: "each week we want to use computer control and ChatGPT Image").** The Higgsfield recipes
stay for the portrait and diagram modes and as a fallback.

## The locked prompt (set with Andy, 2026-11-02)

**The standard is the No. 20 pieces Andy framed and had signed: the upright bass, the opossum, the bull rider, the Día de los Muertos face. One subject, large, crisp black ink, popping off plain cream paper. New pictures must look like the same artist.**

`content/art-style.json` is the wrapper, word for word:

> Generate an image, 1:1 aspect ratio. A vintage local-newspaper engraving: [the subject and what
> it's doing, the crop, two or three details], large in the frame. Behind it, nothing but plain,
> clean warm cream paper #F3E8D2, so the subject pops off the page. Predominantly crisp black ink
> linework with stipple dots and cross-hatch shading, strong contrast, slight engraving texture,
> restrained accents in muted pine green and rust red. Charming and specific, not generic.
> Hand-drawn local newspaper engraving, not a photograph, not flat vector. No text or letters anywhere.

**Why it reads this way.** On No. 21 Andy said the figures sat on blank paper, and I answered with full rooms and crowds, then posters and rays. Each lost the iconic pop. His own conclusion: "I guess we do have blank cream backgrounds on a lot of them to keep the main subject in focus." What makes plain paper work is a subject big and inked enough to carry the frame. A small pale figure on paper still fails, so fix the subject, not the background.

- **A note about one picture changes that picture.** Keep the rest.
- **A background is the rare exception:** one simple object when the picture wouldn't read without it, like one shelf of loaves behind the baker.
- **To change a finished picture, edit it in its own ChatGPT chat** ("keep the subject exactly as drawn; replace the background with plain, clean warm cream paper #F3E8D2"). The subject holds. A new prompt redraws everything.
- **Subject lines stay ordinary:** "a laughing woman", not "mid-scream". The energy is in the action and props, as in the flying hat and cape.
- **No rays, sunbursts, stripes, checkerboards or color fields.**
- **Pine, not teal.** The site's `--teal` token is page chrome, not an art color.
- **Run `node scripts/art-check.mjs <slug>` before the draft ships**, then look at a contact sheet beside the framed pieces: the check can't judge a face or a line.
- **Optimize before committing:** `scripts/optimize-image.sh <in> <out.jpg> 900 84`
- **Place under:** `public/assets/spots/<name>.jpg` (art) or `public/assets/diagrams/<name>` (diagrams); reference in the episode JSON `image` / `imageTop` field, or in a page `<Figure>`.
- After viewing each result with the Read tool, only ship it if it reads at small size (the 120-pixel test under Mode 1).

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
  up", "fills the frame edge to edge". If the model keeps pulling back, tighten the
  crop.
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

### Close in is not macro (Andy, 2026-09-28, on No. 16)

Close means the subject fills the frame. It does not mean a specimen under glass. Three
No. 16 pictures followed the rule above and still put him off: a giant eye behind a lens
over moss, a paddler drawn from under the chin, a hoop floating in front of a torso.

- **Ask whether you'd want to be there.** Fun, whimsy, attractiveness and composition
  count as much as the crop. A smiling person with a magnifying glass held up to the
  moss beats the moss at ten times life size.
- **Show the face when there is one,** from an angle a friend would see it. No severed
  eyes, no up-the-nostrils, no body parts that read as anatomy.
- **Get the physics right.** A hoop goes around the waist, with the far side hidden
  behind the body. A paddle is in the hands. If the object is in the wrong place the
  picture reads as wrong before it reads as anything else.
- **Whole bodies need their clothes named** ("pine tank top and full-length leggings").
  Left unsaid, the model has drawn a yoga figure unclothed.

**The test:** shrink it to 120 pixels wide. If you can't say what it is in two words,
redo it closer.

- **Fallback model (Higgsfield only):** `recraft-v4-1`, `model_type: "standard"`, `colors` set to the
  five inks, same prompt.
- **Prompt:** the locked wrapper above, with the subject and its real place filled in.

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
     > color from only this palette: cream `#F3E8D2` background, pine
     > `#315D54`, rust red `#A94A34`. Plain cream background. Hand-drawn engraving,
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
