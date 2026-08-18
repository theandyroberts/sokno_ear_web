import { describe, it, expect } from "vitest";
import { loadEpisodes, getLatest, getBySlug, getPast, calendarRowDay } from "@/lib/episodes";
import path from "node:path";

const dir = path.resolve(__dirname, "fixtures/episodes");

describe("episodes loader", () => {
  it("loads + sorts newest first", () => {
    const all = loadEpisodes(dir);
    expect(all.map((e) => e.slug)).toEqual(["2026-06-20", "2026-06-13"]);
  });
  it("getLatest returns newest", () => {
    expect(getLatest(dir).slug).toBe("2026-06-20");
  });
  it("getBySlug finds one; missing returns null", () => {
    expect(getBySlug(dir, "2026-06-13")?.number).toBeDefined();
    expect(getBySlug(dir, "nope")).toBeNull();
  });
  it("getPast excludes the latest", () => {
    expect(getPast(dir).map((e) => e.slug)).toEqual(["2026-06-13"]);
  });
});

describe("calendarRowDay", () => {
  const ep = "2026-08-19"; // Wed; the Aug 20-23 episode

  it("resolves a calendar row to its weekday using the episode's year", () => {
    expect(calendarRowDay("AUG", "20", ep)).toBe("Thu");
    expect(calendarRowDay("AUG", "21", ep)).toBe("Fri");
    expect(calendarRowDay("AUG", "22", ep)).toBe("Sat");
    expect(calendarRowDay("AUG", "23", ep)).toBe("Sun");
  });

  it("dates look-ahead rows outside the weekend window", () => {
    expect(calendarRowDay("AUG", "25", ep)).toBe("Tue");
    expect(calendarRowDay("AUG", "26", ep)).toBe("Wed");
  });

  it("is case- and whitespace-insensitive on the month", () => {
    expect(calendarRowDay(" aug ", "20", ep)).toBe("Thu");
  });

  it("rolls a far-past row into the next year (Dec episode, Jan row)", () => {
    expect(calendarRowDay("JAN", "2", "2026-12-30")).toBe("Sat"); // Jan 2 2027
    expect(calendarRowDay("DEC", "31", "2026-12-30")).toBe("Thu"); // stays in 2026
  });

  it("returns undefined for junk rather than guessing", () => {
    expect(calendarRowDay("XXX", "20", ep)).toBeUndefined();
    expect(calendarRowDay("AUG", "nope", ep)).toBeUndefined();
    expect(calendarRowDay("FEB", "31", ep)).toBeUndefined();
  });
});
