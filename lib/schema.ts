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

export const Fact = z.object({ label: z.string(), value: z.string() });

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

export const StorySchema = z.object({
  id: z.string(),
  label: z.string(),
  labelColor: LabelColor.default("rust"),
  days: z.array(z.string()).optional(),
  layout: Layout.default("imageLeft"),
  image: z.string().optional(),
  imageCaption: z.string().optional(),
  title: z.string(),
  deck: z.string().optional(),
  facts: z.array(Fact).default([]),
  body: z.array(Block).min(1),
  sources: z.array(Source).optional(),
  event: EventDetails.optional(),
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
});

export const Audio = z.object({
  title: z.string().default("Weekend Audio Briefing"),
  intro: z.string(),
  description: z.string(),
  duration: z.string(),
  src: z.string(),
});

export const EditionSchema = z.object({
  slug: z.string(),
  volume: z.number(),
  number: z.number(),
  edition: z.string(),
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

export type Edition = z.infer<typeof EditionSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Block = z.infer<typeof Block>;
export type StoryCard = z.infer<typeof StoryCard>;
export type CalEvent = z.infer<typeof CalEvent>;
export type Audio = z.infer<typeof Audio>;
export type Source = z.infer<typeof Source>;
export type EventDetails = z.infer<typeof EventDetails>;
