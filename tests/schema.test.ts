import { describe, it, expect } from "vitest";
import { EpisodeSchema } from "@/lib/schema";

const minimal = {
  slug: "2026-06-20", volume: 1, number: 1, episode: "Weekend Episode",
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

describe("EpisodeSchema", () => {
  it("accepts a valid episode", () => {
    expect(() => EpisodeSchema.parse(minimal)).not.toThrow();
  });
  it("rejects an unknown layout", () => {
    const bad = structuredClone(minimal);
    (bad.stories[0] as any).layout = "diagonal";
    expect(() => EpisodeSchema.parse(bad)).toThrow();
  });
  it("rejects a story with neither text nor runs in a paragraph", () => {
    const bad = structuredClone(minimal);
    (bad.stories[0].body[0] as any) = { type: "paragraph" };
    expect(() => EpisodeSchema.parse(bad)).toThrow();
  });
  it("defaults labelColor to rust", () => {
    const e = EpisodeSchema.parse(minimal);
    expect(e.stories[0].labelColor).toBe("rust");
  });
});
