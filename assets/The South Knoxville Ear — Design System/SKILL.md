---
name: sokno-ear-design
description: Use this skill to generate well-branded interfaces and assets for The South Knoxville Ear — a campy, retro South Knoxville weekly events & rumors newspaper — for production or for throwaway prototypes/mocks. Contains the brand's design guidelines, colors, type, fonts, assets, and reusable UI kit components.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Vibe:** beloved neighborhood newspaper survived into the web era — retro, handmade, funny, locally fluent, mildly nosy but never mean. *"We report it. You live it. We hear things."*
- **Product shape:** a **one-page weekly web paper** — full-width masthead, then every story inline on one printed scroll. No "read more," no second pages, no app depth.
- **Foundations:** black ink + newsprint cream (never flat white); teal & rust as editorial accents; gold is rare (the Sunsphere mic). Distressed woodtype display (Rye), worn-typewriter stamped labels (Special Elite), old-style serif body (PT Serif). Rounded print-panel corners, thin black ink borders, dry letterpress offset shadows. Ornaments (★ ◆ ❧) — **no emoji, no icon packs.** Cropped black-ink spot engravings (`assets/spots/`) lead each story.
- **Tokens:** link `styles.css` for all CSS custom properties and webfonts.
- **Components:** `components/core/` (Button, Tag, Divider, SectionHeader, Ribbon) and `components/editorial/` (StoryCard, Article, AudioBriefing, CalendarItem, Tipline). Read each `.prompt.md` for usage.
- **Reference build:** `ui_kits/sokno-ear/` is the full one-page weekly paper — start there for a complete example.
