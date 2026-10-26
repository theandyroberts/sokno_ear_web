import { describe, it, expect } from "vitest";
import { loadEpisodes } from "@/lib/episodes";
import { loadVenues } from "@/lib/venues";
import { EpisodeSchema } from "@/lib/schema";
import {
  buildIndex, search, groupVenueEvents, groupByEpisode, groupByWeekday, episodeWeekend,
  resolveVenue, dateKey, formatDay, formatTime, timeCell, dateLine, articleMeta, parseWeekday, slugify,
  type ArticleEntry,
} from "@/lib/search";
import fixture from "@/tests/fixtures/episodes/2026-06-20.json";

const registry = loadVenues();
const episodes = loadEpisodes();
const index = buildIndex(episodes, registry);

describe("buildIndex — the real episodes", () => {
  it("indexes every published story once, with its permalink", () => {
    const n = episodes.reduce((sum, e) => sum + 1 + e.stories.length, 0);
    expect(index.articles).toHaveLength(n);
    const hrefs = new Set(index.articles.map((a) => a.href));
    expect(hrefs.size).toBe(n);
    for (const a of index.articles) expect(a.href).toBe(`/${a.slug}/${a.storyId}`);
  });
  it("folds every Ijams room, lawn and landing into one venue", () => {
    const ijams = index.venues.filter((v) => /ijams/i.test(v.name) || /ijams/.test(v.key));
    expect(ijams).toHaveLength(1);
    expect(ijams[0].key).toBe("ijams-nature-center");
    expect(ijams[0].name).toBe("Ijams Nature Center");
    expect(ijams[0].href).toBe("/venue/ijams-nature-center");
    const stories = index.articles.filter((a) => a.venueKey === "ijams-nature-center");
    expect(stories.length).toBeGreaterThan(40);
  });
  it("uses the registry's key for Kern's, Hi-Wire and the Pink Cactus, with the logo", () => {
    const kerns = index.venues.find((v) => v.key === "kerns")!;
    expect(kerns.name).toBe("Kern's");
    expect(kerns.logo).toBe("/assets/venues/kerns.png");
    expect(index.venues.find((v) => v.key === "hi-wire")?.name).toBe("Hi-Wire Brewing");
    expect(index.venues.find((v) => v.key === "the-pink-cactus")).toBeTruthy();
    expect(index.venues.some((v) => v.key === "kerns-food-hall" || v.key === "hi-wire-brewing-knoxville")).toBe(false);
  });
  it("gives an unregistered venue a page of its own under a slug of its name", () => {
    const v = resolveVenue("Borderland Playhouse", registry)!;
    expect(v.key).toBe("borderland-playhouse");
    expect(v.logo).toBeNull();
    expect(resolveVenue(undefined, registry)).toBeNull();
    expect(resolveVenue("Puckers Sports Grill Knoxville", registry)?.key).toBe("puckers");
  });
  it("files the old 'Ijams Park' pill under Ijams Nature Center — never a bare or Park category", () => {
    expect(index.categories.find((c) => c.key === "ijams-park")).toBeUndefined();
    const inc = index.categories.find((c) => c.key === "ijams-nature-center")!;
    expect(inc.label).toBe("Ijams Nature Center");
    expect(inc.href).toBe("/place/ijams-nature-center");
    expect(inc.count).toBeGreaterThan(60);
    expect(index.categories.find((c) => c.key === "old-sevier")?.labelColor).toBe("rust");
  });
  it("lowercases title, deck, body and facts into the match text", () => {
    const a = index.articles.find((x) => x.slug === "2026-10-21")!;
    expect(a.text).toBe(a.text.toLowerCase());
    expect(a.text).toContain(a.title.toLowerCase().slice(0, 20));
  });
});

describe("search", () => {
  it("returns nothing for an empty query", () => {
    expect(search(index, "   ")).toEqual({ venues: [], categories: [], articles: [] });
  });
  it("finds a venue by name or alias and a place by label", () => {
    expect(search(index, "kern").venues.map((v) => v.key)).toContain("kerns");
    expect(search(index, "hi-wire").venues[0].key).toBe("hi-wire");
    expect(search(index, "sevier").categories.map((c) => c.key)).toContain("old-sevier");
  });
  it("ranks title hits ahead of deck and body hits and caps the lists", () => {
    const r = search(index, "ijams");
    expect(r.venues.length).toBeLessThanOrEqual(5);
    expect(r.categories.length).toBeLessThanOrEqual(5);
    expect(r.articles.length).toBeLessThanOrEqual(20);
    const first = r.articles[0];
    expect(first.title.toLowerCase()).toContain("ijams");
    const lastTitleHit = r.articles.map((a) => a.title.toLowerCase().includes("ijams")).lastIndexOf(true);
    const firstMiss = r.articles.map((a) => a.title.toLowerCase().includes("ijams")).indexOf(false);
    if (firstMiss !== -1) expect(lastTitleHit).toBeLessThan(firstMiss);
  });
  it("needs every word of a multi-word query", () => {
    const r = search(index, "scruffy roots");
    expect(r.articles.length).toBeGreaterThan(0);
    for (const a of r.articles) expect(a.text).toMatch(/scruffy/);
    for (const a of r.articles) expect(a.text).toMatch(/roots/);
  });
});

function entry(over: Partial<ArticleEntry>): ArticleEntry {
  return {
    slug: "2026-10-21", storyId: "x", href: "/2026-10-21/x", title: "T", label: "Old Sevier", labelColor: "rust",
    categoryKey: "old-sevier", startDate: "2026-10-21", episodeNumber: 19, episodeDate: "2026-10-21", episodeShortDate: "Oct 22–25",
    allDay: false, text: "t", ...over,
  };
}

describe("groupVenueEvents", () => {
  const rows = [
    entry({ storyId: "a", startDate: "2026-10-30T19:00:00-04:00", eventStart: "2026-10-30T19:00:00-04:00" }),
    entry({ storyId: "b", startDate: "2026-11-07T10:00:00-05:00", eventStart: "2026-11-07T10:00:00-05:00" }),
    entry({ storyId: "c", startDate: "2026-10-10T19:00:00-04:00", eventStart: "2026-10-10T19:00:00-04:00" }),
    entry({ storyId: "d", startDate: "2026-10-24T19:00:00-04:00", eventStart: "2026-10-24T19:00:00-04:00" }),
    // started yesterday, runs through tomorrow: still coming up
    entry({ storyId: "e", startDate: "2026-10-25T09:00:00-04:00", eventStart: "2026-10-25T09:00:00-04:00", endDate: "2026-10-27T17:00:00-04:00" }),
    // no event: files under the episode date
    entry({ storyId: "f", startDate: "2026-10-14", episodeDate: "2026-10-14" }),
  ];
  it("splits on the South Knoxville calendar date: today onward ascending, then the past descending", () => {
    const { upcoming, past } = groupVenueEvents(rows, "2026-10-26");
    expect(upcoming.map((r) => r.storyId)).toEqual(["e", "a", "b"]);
    expect(past.map((r) => r.storyId)).toEqual(["d", "f", "c"]);
  });
  it("compares by date, not instant — a 7 PM show tonight is still upcoming at 10 PM UTC-ish", () => {
    // 2026-10-26T23:30Z is 7:30 PM in Knoxville; the show at 8 PM the same evening is upcoming.
    const show = entry({ storyId: "s", startDate: "2026-10-26T20:00:00-04:00", eventStart: "2026-10-26T20:00:00-04:00" });
    const { upcoming } = groupVenueEvents([show], new Date("2026-10-26T23:30:00Z"));
    expect(upcoming).toHaveLength(1);
    // and at 1 AM UTC on the 27th it is still the 26th in Knoxville
    expect(dateKey(new Date("2026-10-27T01:00:00Z"))).toBe("2026-10-26");
  });
});

describe("dates and lines", () => {
  it("formats the facts-box way", () => {
    expect(formatDay("2026-10-31T19:00:00-04:00")).toBe("Sat Oct 31");
    expect(formatTime("2026-10-31T19:00:00-04:00")).toBe("7 PM");
    expect(formatTime("2026-10-31T17:30:00-04:00")).toBe("5:30 PM");
    expect(formatTime("2026-10-31T10:00:00-04:00")).toBe("10 AM");
    expect(formatTime("2026-10-31T00:00:00-04:00")).toBe("");
    expect(formatDay("2026-10-21")).toBe("Wed Oct 21");
  });
  it("time cell: the start, 'all day' from the facts, or a dash", () => {
    expect(timeCell(entry({ eventStart: "2026-10-31T19:00:00-04:00" }))).toBe("7 PM");
    expect(timeCell(entry({ allDay: true }))).toBe("all day");
    expect(timeCell(entry({}))).toBe("—");
  });
  it("row line and search meta", () => {
    const a = entry({ eventStart: "2026-10-31T19:00:00-04:00", venueName: "The 808", episodeNumber: 20 });
    expect(dateLine(a)).toBe("Sat Oct 31 · 7 PM");
    expect(articleMeta(a)).toBe("No. 20 · Sat Oct 31 · The 808");
    expect(dateLine(entry({}))).toBe("Oct 22–25");
  });
  it("slugify", () => {
    expect(slugify("Kern's")).toBe("kerns");
    expect(slugify("The Pink Cactus")).toBe("the-pink-cactus");
    expect(slugify("City County Building — Main Assembly Room")).toBe("city-county-building-main-assembly-room");
  });
});

describe("groupByEpisode", () => {
  it("newest episode first, stories kept in order", () => {
    const rows = [
      entry({ slug: "2026-10-14", storyId: "a", episodeNumber: 18, episodeDate: "2026-10-14" }),
      entry({ slug: "2026-10-21", storyId: "b" }),
      entry({ slug: "2026-10-21", storyId: "c" }),
    ];
    const g = groupByEpisode(rows);
    expect(g.map((x) => x.slug)).toEqual(["2026-10-21", "2026-10-14"]);
    expect(g[0].articles.map((a) => a.storyId)).toEqual(["b", "c"]);
  });
});

describe("day pages", () => {
  it("parses weekdays long and short", () => {
    expect(parseWeekday("Thursday")).toBe("thu");
    expect(parseWeekday("SAT")).toBe("sat");
    expect(parseWeekday("monday")).toBeNull();
  });
  it("finds the episode's Thu–Sun whether it published on the Wednesday or the Saturday", () => {
    expect(episodeWeekend("2026-10-21")).toEqual({ thu: "2026-10-22", fri: "2026-10-23", sat: "2026-10-24", sun: "2026-10-25" });
    expect(episodeWeekend("2026-06-20")).toEqual({ thu: "2026-06-18", fri: "2026-06-19", sat: "2026-06-20", sun: "2026-06-21" });
  });
  it("this week's Thursday first, earliest start first, chip-only rows last; then last week's", () => {
    const fx = EpisodeSchema.parse(fixture); // slug 2026-06-20 → Thu Jun 18
    const older = { ...fx, slug: "2026-06-13", number: 0, date: "2026-06-13" };
    const mk = (id: string, start?: string, days?: string[], end?: string) => ({
      ...fx.stories[0], id, days, event: start ? { startDate: start, endDate: end, locationName: "Earl's" } : undefined,
    });
    const week = {
      ...fx,
      stories: [
        mk("late", "2026-06-18T21:00:00-04:00"),
        mk("chip", undefined, ["Thu"]),
        mk("early", "2026-06-18T10:00:00-04:00"),
        mk("friday", "2026-06-19T19:00:00-04:00"),
        mk("festival", "2026-06-17T12:00:00-04:00", undefined, "2026-06-19T22:00:00-04:00"),
      ],
    };
    const idx = buildIndex([week, older], registry);
    const weeks = groupByWeekday(idx, "thu");
    expect(weeks.map((w) => w.slug)).toEqual(["2026-06-20", "2026-06-13"]);
    expect(weeks[0].date).toBe("2026-06-18");
    expect(weeks[0].articles.map((a) => a.storyId)).toEqual(["festival", "early", "late", "chip"]);
    expect(weeks[1].date).toBe("2026-06-11");
    expect(groupByWeekday(idx, "fri")[0].articles.map((a) => a.storyId)).toEqual(["festival", "friday"]);
  });
  it("works over the real index", () => {
    const weeks = groupByWeekday(index, "sat");
    expect(weeks[0].slug).toBe(episodes[0].slug);
    expect(weeks.length).toBe(episodes.length);
  });
});
