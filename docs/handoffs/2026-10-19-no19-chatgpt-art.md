# Handoff: No. 19 art via the ChatGPT desktop app (GPT Image)

Written 2026-10-19 by the Tuesday research session. Andy asked for this week's
engravings to be made in his ChatGPT app on his own subscription instead of
Higgsfield, which has 0.25 credits. A scheduled session cannot raise the
computer-use approval card, so a normal session does this.

## State

- Draft: `content/drafts/2026-10-21.json` (No. 19, 17 stories) is deployed at
  soknoear.com/next text-only: every story has `layout: "textOnly"` and no
  `image`; the eight scanner cards point at `/assets/possum_street_art.png`.
- Prompts: `content/research/2026-10-21.art.json`, one per story id, with the
  output file name and aspect ratio.
- Rules: `.claude/skills/sokno-ear-art/SKILL.md` (one subject, close in; a
  likeable face; clothes named on whole bodies; no text in the picture; no two
  pictures in a week alike). Palette: ink #171512, cream #F3E8D2, teal #7FAEA3,
  rust #A94A34.
- Publishing waits on Andy's "run it". Do not publish, send mail or queue Instagram.

## Steps

1. ToolSearch "computer-use", then `request_access` for "ChatGPT" with
   clipboardWrite (Andy sees the card).
2. In the app, new chat. For each story in the art file: paste the prompt,
   prefixed "Generate an image, " with the aspect ratio (16:9 for
   spooky-streets, 1:1 otherwise) and "Palette: black ink #171512, cream paper
   #F3E8D2, muted teal #7FAEA3, rust red #A94A34 only". Save each image to
   ~/Downloads and note which is which. Regenerate only when a result breaks
   the rules.
3. `scripts/optimize-image.sh <in> public/assets/spots/<file> 900 88`. View
   each with Read, then at 120 px wide; redo closer if the subject can't be
   named in two words. Compare the week side by side.
4. In the draft: set each story's `image`, feature `layout: "imageTop"`, the
   rest alternating imageLeft / imageRight, short `imageCaption`s, and the
   scanner cards' images. Leave ids, text and `igAct` alone.
   `npx vitest run` and `node scripts/research-check.mjs 2026-10-21` must pass.
5. Commit ("art No. 19: 17 engravings via GPT Image"), push, then
   `ssh andy@143.244.188.235 'bash /var/www/soknoear/scripts/redeploy.sh'`.
   `node scripts/pub-status.mjs note draft --week 2026-10-21 "art in: 17 engravings via GPT Image"`
   and `node scripts/pub-status.mjs sync --week 2026-10-21`.
6. Report which images came out and which were redone. No. 19 still waits
   for "run it".
