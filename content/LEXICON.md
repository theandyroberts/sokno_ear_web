# The South Knoxville Ear — Script & Editorial Lexicon

A living reference for how words are **said** (audio briefings / ElevenLabs) and
**written** (copy) across The Ear. Add an entry the moment something trips us up.

---

## Pronunciation — for the audio briefing

| Term | Say it as | Notes |
|---|---|---|
| **SoKno** | **"SO-no"** (two beats: *So · No*) | NOT "sock-no." Short for South Knoxville. When generating TTS, spell it `So-No` / use a phoneme alias so the voice never says "sock-no." |
| Sevier Ave | "suh-VEER" (like the word *severe*) | Not "SEE-vee-er" or "Sue-veer." For TTS, spell it **`Severe`**. |
| **Ijams** | **ONE syllable** — *times* without the T. Think the plural of "I'm": **I'ms**. "I'ms Park," "I'ms Nature Center." | Not "EYE-ams," not "EYE-jams," not "ih-JAMS." The J is silent **and there is no second syllable** — that's the part everyone gets wrong, including us. For TTS, spell it **`Imes`** — confirmed by Andy 2026-08-12 (he judged `Imes` and `I'ms` both correct and very close; `Imes` wins for having no apostrophe to trip the engine). The old `Eye-ams` spelling gave a two-beat read and shipped in every briefing Jul–Aug 2026. **Always say "Ijams Park"** in scripts & copy — never bare "Ijams" (the official "Ijams Nature Center" is fine but almost no one uses it). |
| **Resy** | **"REZ-ee"** | The reservation platform. For TTS spell it **`Rezzy`** — plain "Resy" reads as "reese". Added 2026-09-01 (Puckers takes bookings there). |
| **Krutch Park** | **"crutch"** | The downtown park on Clinch Ave (KAT's football shuttle stop). Confirmed by Andy 2026-09-01. Reads correctly as spelled — no TTS respelling needed. |
| **Neyland** | **"NEE-land"** — rhymes with *knee* | Neyland Stadium / Neyland Drive. Not "NAY-land." For TTS spell it **`Nee-land`**. Added 2026-09-01 for the No. 12 briefing (first home game of the season). |
| **Patrón** | **"puh-TRONE"** — rhymes with *drone* | Andy's own pronunciation, 2026-08-25: *"I always say Patrón to rhyme with drone… it's what I'd say and I get my order."* Not "pa-TRON," not "PAT-ron," not three beats. For TTS spell it **`puh-trone`** — the earlier `Pa-trone` spelling read a little off in the No. 11 take. |
*(Add venue names, street names, and people as we confirm them.)*

---

## Style & usage

- **Weekly releases are EPISODES.** Never "editions" or "issues" — the Ear is an
  episodic media thing (site now; podcast/YouTube later), not a print run. Say
  "this week's episode," "Past Episodes," "a fresh episode is up." Code, file
  names, and the schema use `episode`/`content/episodes/` to match.
- **Never call the Ear a "paper" or "newspaper."** In *all* content — stories, audio,
  emails, on-page UI — say **"the Ear," "the SoKno Ear,"** or **"this week's Ear."** It
  wears the look of a community newspaper but isn't one; calling it a paper misrepresents
  it. (Exceptions: "vintage **newspaper** engraving" in art prompts describes the art
  style, not the Ear; and `--paper-*` CSS tokens are internal names.) Grep new drafts for
  `\bpaper\b` before publishing.
- **What "E.A.R." means.** "South Knoxville **Events And Rumors**" → **E.A.R.** is a
  backronym for the name. Treat **"rumors" as *real local stories*** — events,
  openings, civic/zoning news, things to plan your weekend around. **Not gossip.**
- **No certainty labels.** Do *not* use "Confirmed / Probably true / We'll see."
  Stories are vetted as real before they run (Andy reviews each week for now).
- **Voice:** neighborly, curious, lightly funny, useful, locally fluent — never mean.
- **Casing:** headlines & section rubrics ALL CAPS; body sentence case; labels/tags
  condensed caps. **No emoji** — print ornaments only (★ ◆ ❧).
- **Community submission form** collects **future events and news** the neighborhood
  wants in the Ear. Never call it a "tip line" or ask for "rumors." Copy is
  invitational, e.g. "Got an event? Tell The Ear."
- **Audio briefing** is delivered in **Andy's own voice**, first person, like a
  short neighborhood radio dispatch. **Greeting must be time-of-day neutral**
  (no "evening/morning" — we don't know when they'll listen). **Standing sign-off:
  "see you around SoKno!"** — emphasize the community, not the publication. Vary the
  opening line week to week; never reuse the previous week's open. (The never-a-"paper"
  rule above applies here too.)
- **ONE HEADLINE = ONE STORY.** Never put two events under a single headline, and never
  write a venue/location roundup. Each subject is its own `Story` with its own headline,
  its own art, its own scanner card and its own anchor. If a venue has two events that
  weekend, that is two stories. (Andy, 2026-08-25 — a feature headlined "Opera at the
  quarry, then the moon goes dark" and a five-event "Ijams Park after dark" roundup were
  the offense.) **There is no cap on story count** — twelve single-subject stories beat
  five combined ones.
  - **The test:** an event earns an article when it can carry **its own headline AND its
    own art**. If it can't, it belongs in the sidebar calendar (and maybe a scanner card) —
    it never gets bolted onto a neighboring story as an extra paragraph.
  - **Related ≠ combined.** One sentence of context inside a story ("the paddles that same
    weekend sold out") is fine. A crosshead that changes the subject is not.
  - **Headlines name the thing.** Say "Puckers opens on Blount Avenue," not "The room on
    Blount has a new name." No coy withholding of the subject.
- **Crossheads structure ONE subject.** `subhead` blocks (★ Special Elite crossheads) mark
  movement *within* a single story — background → detail → the practical part — never a
  change of topic. Never before the lede (the opening paragraph belongs to the headline).
- **Art is generated per story, and it must depict that story.** Never reuse an existing
  file from `public/assets/spots/` as filler and never repeat art across episodes. Prompt
  the literal subject of the headline (goats on yoga mats; lips puckered at a football; a
  chalkboard with specials actually written on it). See the `sokno-ear-art` skill; check
  each result at thumbnail size and ask whether it would let you guess the headline.
- **Confirmed content only — and never say so.** If a fact can't be verified this week
  (a specials page that won't load, a listing nobody can reach), it doesn't run — not
  with a caveat, not "carried from last week." Cut the story. And never write "honest,"
  "honest note," "to be honest," "the honest caveat," or anything that vouches for our own
  truthfulness. We are honest; it's a given. A line that says "we're not lying now" invites
  the question of whether we were before. (Andy, 2026-09-08 — a specials board that ran
  with an "honest note" about an unreachable source was the offense.)
- **Always attribute sources.** Every article ends with its source(s): an external
  link when the info came from one (official site, @handle, agency), or plain credit
  text like "Info from A. Roberts" when it came from a form submission/tip with no
  link. It's bad form to run info unattributed, especially while we're getting started.
  Schema: `Story.sources: { label, url? }[]` → renders a "Source(s):" line at the foot
  of the article. Use the `agenda` block (time → activity rows) for event schedules
  when the times are definitively sourced.

## Instagram banners — the card has to travel alone

When a venue reshares one of our posts to their story, **Instagram carries the image
and drops the caption.** So an @-tag in the caption earns us nothing on a reshare —
every fact that makes the card worth resharing has to be in the band. Of the first
52 banners, 11 tagged a venue the artwork never named; the specials board did it on
all six runs.

Two lines, `social.igBanner`:

- **Line 1** (PT Serif) — the event. **Name the venue here** wherever the sentence
  will carry it: *"Pint night at Hi-Wire," "Game day rooms at Kern's," "Free
  storytime at Ijams Park."*
- **Line 2** (Special Elite caps) — **the day, and the time.** *"Saturday, ten to
  noon." "Thursday, all-day happy hour too."*

The venue may sit on line 2 instead when line 1 reads better without it (*"Free
trivia Thursday" / "Seven o'clock at Trailhead"*) — the card travels whole, so
either line counts. What must never happen is neither line naming it.

House style still applies inside the band: **"Ijams Park," never bare "Ijams."**

`scripts/ig-queue.mjs` warns at approval time when a banner names no tagged venue,
or when a dated item carries no day or time. Genuine exceptions — a multi-venue
roundup like the specials board, or an org co-presenter tagged beside the real
venue — opt out with `social.igBannerSkipCheck: true`.

**No venue logos on banners.** The mark stays in `content/venues.json` for page use.
Every logo in that registry carries at least one off-palette brand color (Puckers is
bright green and fire-engine red; even the ink-recolored Hi-Wire SVG keeps `#00b5f0`),
and a card carrying a venue's brand mark reads as an ad *made for* them rather than
coverage *about* them. The venue's name in our own type does the same job.

## SoKno locations (the pill vocabulary)

Story **labels are geographic location pills** — make them accurate. Keep one color per
place for recognition: **Old Sevier = rust, Ijams Park = teal, Kern's = green.**

- **Old Sevier** — the Sevier Avenue corridor (the main drag); Honeybee Coffee, Alliance
  Brewing, SouthSide Garage, the Pink Cactus, Fly by Night.
- **Kern's** — the Kern's Bakery / Food Hall pocket. Its own SoKno section, **no water
  view** (starts ~2 cross streets up from the river). Roni's Mac Bar lives here.
- **Ijams Park** — Ijams Nature Center / Meads Quarry; its own call-out (fireflies, bird
  banding, the bluegrass jam). Say "Ijams Park," never just "nature center" — and never bare "Ijams."
- **Suttree Landing** — Suttree Landing Park, the riverside park down on the waterfront.
  Reach it by turning toward the river at the Citgo on Sevier, down Claude St to Waterfront
  Dr. Give it its own pill (not "South Waterfront").
- **Urban Wilderness** — the trail district, anchored by a converted church that now holds
  a bar, a restaurant, and a bike shop, with miles of mountain-biking trails.
- **Island Home** — established residential community: older homes, higher property values.
- **South Waterfront** — a realtor marketing moniker for the riverfront strip; we rarely
  use it (it's just South Knoxville).
