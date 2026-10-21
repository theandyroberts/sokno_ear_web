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
  z.object({
    type: z.literal("agenda"),
    title: z.string().optional(),
    rows: z.array(z.object({ time: z.string(), what: z.string() })).min(1),
  }),
]);

// A fact can point somewhere: `href` makes the value a link (an in-page "#story-id"
// resolves to the story's own page on a permalink), and `zoom` names an image that a
// small "open the map" control pops full screen, no thumbnail needed. (Andy, 2026-10-14:
// the two 808 show stories carry a Parking row that links down to the parking map.)
export const Fact = z.object({ label: z.string(), value: z.string(), href: z.string().optional(), zoom: z.string().optional() });

// Attribution for the end of an article. url present -> link; url absent -> plain
// credit text (e.g. "Info from A. Roberts" for a tip with no link).
export const Source = z.object({ label: z.string(), url: z.string().optional() });

// Optional machine-readable event data → schema.org Event JSON-LD (SEO rich results).
export const EventDetails = z.object({
  startDate: z.string(),
  endDate: z.string().optional(),
  locationName: z.string(),
  locationAddress: z.string().optional(),
});

// Social promo for this story. `igTags` are the accounts to @-mention when the
// story's engraving goes up on Instagram — only handles VERIFIED against the
// venue's own site/socials belong here (a wrong tag @s a stranger). Keys into
// content/ig-handles.json. `igPromo` overrides the auto-built caption lede.
export const Social = z.object({
  igTags: z.array(z.string()).optional(),
  /** The act in the story — the band, DJ, comic, promoter or organizer with its own
   *  crowd — as a key into content/ig-handles.json, which must also be in `igTags` so the
   *  picture tags them; or `{ none: "why" }` when the story has no act (a trail ride, a
   *  market). Required from No. 19 on: scripts/research-check.mjs refuses a draft without it.
   *  Andy, 2026-10-09: "tags the venue and artist"; No. 18 carried no act at all. */
  igAct: z.union([z.object({ key: z.string().min(1) }), z.object({ none: z.string().min(3) })]).optional(),
  igPromo: z.string().optional(),
  /** One spoken line for the week's Reel (scripts/ig-reel.py): said in the briefing's
   *  voice over this story's artwork and burned in. Under about fifteen words, real
   *  spellings. content/reel-scripts/<slug>.json overrides it; the banner lines are the fallback. */
  igQuip: z.string().optional(),
  igSkip: z.boolean().optional(),
  /** Two banner lines composited onto the IG image: ["Earl's Happy Hour!", "Two ritas, two nights"].
   *  Line 2 renders ALL CAPS. scripts/ig-banners.py rasterizes real type — never AI-generated text. */
  igBanner: z.array(z.string()).optional(),
  /** This story is a standing item — true most weeks (Earl's board, Hi-Wire pint night,
   *  the Playscape story time). The drip's repeat cap treats it as a repeat from its
   *  FIRST run instead of waiting to see the id twice. */
  standing: z.boolean().optional(),
  /** Stable identity for a standing item across retitles. The cap counts runs by
   *  `standingKey ?? id`, so renaming `playscape-storytelling` → `playscape-fall`
   *  no longer resets the counter and hand the banner a third straight Friday
   *  (docs/ig-reviews/2026-09-15.md, finding 8 / A10). */
  standingKey: z.string().optional(),
});

// A reusable venue ticket button, placed immediately below the story deck.
export const Ticket = z.object({
  href: z.string().url().regex(/^https?:\/\//),
  image: z.string().min(1),
  alt: z.string().min(1),
});

export const StorySchema = z.object({
  id: z.string(),
  label: z.string(),
  labelColor: LabelColor.default("rust"),
  days: z.array(z.string()).optional(),
  layout: Layout.default("imageLeft"),
  image: z.string().optional(),
  imageCaption: z.string().optional(),
  /** A click opens the image full screen with zoom and pan: maps, diagrams, anything with detail. */
  imageZoom: z.boolean().optional(),
  ticket: Ticket.optional(),
  title: z.string(),
  deck: z.string().optional(),
  facts: z.array(Fact).default([]),
  body: z.array(Block).min(1),
  sources: z.array(Source).optional(),
  event: EventDetails.optional(),
  social: Social.optional(),
});

export const StoryCard = z.object({
  label: z.string(),
  labelColor: LabelColor.default("rust"),
  days: z.array(z.string()).optional(),
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
  /** Jump target — usually "#story-id" of the story covering this event. */
  href: z.string().optional(),
});

export const Audio = z.object({
  title: z.string().default("Weekend Audio Briefing"),
  intro: z.string(),
  description: z.string(),
  duration: z.string(),
  src: z.string(),
});

export const EpisodeSchema = z.object({
  slug: z.string(),
  volume: z.number(),
  number: z.number(),
  episode: z.string(),
  date: z.string(),
  dateLabel: z.string().optional(),
  shortDate: z.string().optional(),
  place: z.string(),
  feature: StorySchema,
  scanner: z.array(StoryCard).min(1),
  stories: z.array(StorySchema),
  sidebar: z.object({
    audio: Audio.optional(),
    calendar: z.array(CalEvent),
  }),
});

export type Episode = z.infer<typeof EpisodeSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Block = z.infer<typeof Block>;
export type StoryCard = z.infer<typeof StoryCard>;
export type CalEvent = z.infer<typeof CalEvent>;
export type Audio = z.infer<typeof Audio>;
export type Source = z.infer<typeof Source>;
export type EventDetails = z.infer<typeof EventDetails>;
export type Social = z.infer<typeof Social>;
