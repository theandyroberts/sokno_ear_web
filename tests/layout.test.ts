import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EpisodeSchema, type Episode } from "@/lib/schema";
import { liftCount, estimateStoryHeight, estimateSidebarHeight } from "@/lib/layout";

const load = (file: string): Episode =>
  EpisodeSchema.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")));

// No. 15 as published, measured on the live site at 1360px on 2026-09-28.
const no15 = load("content/episodes/2026-09-23.json");

describe("layout — lifting stories beside a long sidebar", () => {
  it("estimates land close to what the browser measured on No. 15", () => {
    expect(Math.abs(estimateStoryHeight(no15.feature) - 1551)).toBeLessThan(60);      // feature, banner image
    expect(Math.abs(estimateStoryHeight(no15.stories[0]) + 123 - 1293)).toBeLessThan(60); // first story, lifted
    expect(Math.abs(estimateSidebarHeight(no15.sidebar) - 2805)).toBeLessThan(90);    // ad, player, 17 rows
  });

  it("No. 15 lifts one story, as it did under the row-count rule", () => {
    expect(liftCount(no15)).toBe(1);
  });

  it("a 14-row calendar beside an ordinary feature lifts a story (No. 16 ran a third empty)", () => {
    const rows = ["1", "2", "3", "4"].flatMap((day, d) =>
      Array.from({ length: d < 2 ? 3 : 4 }, () => ({ ...no15.sidebar.calendar[0], month: "OCT", day })),
    );
    expect(rows).toHaveLength(14);
    const episode = { ...no15, sidebar: { ...no15.sidebar, calendar: rows } };
    expect(liftCount(episode)).toBe(1);
  });

  it("never leaves the sidebar more than the tolerated gap past the main column", () => {
    const lifted = liftCount(no15);
    const main = estimateStoryHeight(no15.feature)
      + no15.stories.slice(0, lifted).reduce((sum, s) => sum + estimateStoryHeight(s) + 123, 0);
    expect(estimateSidebarHeight(no15.sidebar) - main).toBeLessThanOrEqual(300);
  });

  it("lifts nothing beside a short calendar, and stops when the stories run out", () => {
    const short = { ...no15, sidebar: { ...no15.sidebar, calendar: no15.sidebar.calendar.slice(0, 4) } };
    expect(liftCount(short)).toBe(0);
    const long = { ...no15, stories: no15.stories.slice(0, 1), sidebar: { ...no15.sidebar, calendar: [...no15.sidebar.calendar, ...no15.sidebar.calendar, ...no15.sidebar.calendar] } };
    expect(liftCount(long)).toBe(1);
  });
});
