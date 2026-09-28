import { describe, it, expect } from "vitest";
import { placeDaySlots, SAME_DAY_GAP_H, EARLIEST_STORY_HOUR, MAX_VENUE_POSTS_PER_DAY } from "../scripts/ig-schedule.mjs";

const slot = (key: string, day: string, hour: number) => ({ key, day, hour });

describe("placeDaySlots", () => {
  it("leaves posts that are already far enough apart exactly where they wanted", () => {
    const out = placeDaySlots([slot("a", "2026-09-19", 11), slot("b", "2026-09-19", 16), slot("c", "2026-09-19", 19)]);
    expect([...out.values()].every((s) => s.how === "as-wanted")).toBe(true);
    expect(out.get("b")).toMatchObject({ day: "2026-09-19", hour: 16 });
  });

  it("replays No. 14's Sunday: no more four-in-a-row, and nothing loses lead time", () => {
    // Wanted slots as the builder computes them (event start − 3h, floor 08:00),
    // plus Saturday as it actually stood.
    const wanted = [
      slot("caving-trip", "2026-09-19", 11),
      slot("circus-moon", "2026-09-19", 16),
      slot("puckers-titans", "2026-09-19", 19),
      slot("sunday-yoga", "2026-09-20", 8), // 11:30 start
      slot("paint-pond", "2026-09-20", 8), // 11:00 start
      slot("fungi-workshop", "2026-09-20", 9), // 12:30 start
      slot("bluegrass-jam", "2026-09-20", 11), // 14:00 start
    ];
    const out = placeDaySlots(wanted);

    for (const day of ["2026-09-19", "2026-09-20"]) {
      const hours = [...out.values()].filter((s) => s.day === day).map((s) => s.hour).sort((a, b) => a - b);
      for (let i = 1; i < hours.length; i++) expect(hours[i] - hours[i - 1]).toBeGreaterThanOrEqual(SAME_DAY_GAP_H);
    }
    // Never later than wanted on the same day — lead time only grows.
    for (const w of wanted) {
      const s = out.get(w.key)!;
      if (s.day === w.day) expect(s.hour).toBeLessThanOrEqual(w.hour);
    }
    // Both 08:00 Sunday posts go out on Saturday instead — one at 21:00, one in the
    // first open afternoon hour — leaving Sunday with two posts, not four.
    expect(out.get("paint-pond")).toMatchObject({ day: "2026-09-19", hour: 21, how: "evening-before" });
    expect(out.get("sunday-yoga")).toMatchObject({ day: "2026-09-19", hour: 14, how: "day-before" });
    expect([...out.values()].filter((s) => s.day === "2026-09-20")).toHaveLength(2);
    expect(out.get("bluegrass-jam")).toMatchObject({ day: "2026-09-20", hour: 11, how: "as-wanted" });
  });

  it("walks a collision earlier, not later", () => {
    const out = placeDaySlots([slot("late", "2026-09-20", 13), slot("early", "2026-09-20", 13)]);
    const hours = [out.get("late")!.hour, out.get("early")!.hour].sort();
    expect(hours).toEqual([11, 13]);
  });

  it("never walks below the earliest story hour", () => {
    const out = placeDaySlots([slot("a", "2026-09-20", 9), slot("b", "2026-09-20", 9), slot("c", "2026-09-20", 9)]);
    for (const s of out.values()) if (s.day === "2026-09-20") expect(s.hour).toBeGreaterThanOrEqual(EARLIEST_STORY_HOUR);
  });

  it("spills to the evening before across a month boundary", () => {
    const out = placeDaySlots([slot("a", "2026-10-01", 9), slot("b", "2026-10-01", 8)]);
    expect(out.get("b")).toMatchObject({ day: "2026-09-30", hour: 21, how: "evening-before" });
  });

  it("uses an open daytime hour the day before when the evening is taken", () => {
    const out = placeDaySlots([slot("fri1", "2026-09-18", 21), slot("fri2", "2026-09-18", 18), slot("sat1", "2026-09-19", 9), slot("sat2", "2026-09-19", 8)]);
    expect(out.get("sat2")).toMatchObject({ day: "2026-09-18", hour: 16, how: "day-before" });
  });

  it("falls back to the first free hour when the whole day before is full", () => {
    const friday = [8, 10, 12, 14, 16, 18, 20].map((h) => slot(`fri${h}`, "2026-09-18", h));
    const out = placeDaySlots([...friday, slot("sat1", "2026-09-19", 9), slot("sat2", "2026-09-19", 8)]);
    expect(out.get("sat2")).toMatchObject({ day: "2026-09-19", hour: 8, how: "fallback" });
  });

  it("places every post exactly once", () => {
    const items = Array.from({ length: 12 }, (_, i) => slot(`p${i}`, "2026-09-20", 8 + (i % 4)));
    const out = placeDaySlots(items);
    expect(out.size).toBe(12);
  });
});

describe("placeDaySlots — venue cap (A16)", () => {
  const at = (key: string, day: string, hour: number, venue?: string) => ({ key, day, hour, venue });
  const IJAMS = "@ijamsnaturecenter";
  const venueCount = (out: ReturnType<typeof placeDaySlots>, items: Array<{ key: string; venue?: string }>, day: string, venue: string) =>
    items.filter((i) => i.venue === venue && out.get(i.key)!.day === day).length;

  it("has a cap of two", () => {
    expect(MAX_VENUE_POSTS_PER_DAY).toBe(2);
  });

  it("moves a venue's third post of the day to the evening before, keeping the two closest to their events", () => {
    const out = placeDaySlots([
      at("wildflower-walk", "2026-09-24", 14, IJAMS),
      at("hooping", "2026-09-24", 15, IJAMS),
      at("bats-after-dark", "2026-09-24", 17, IJAMS),
    ]);
    expect(out.get("bats-after-dark")).toMatchObject({ day: "2026-09-24", hour: 17, how: "as-wanted" });
    expect(out.get("hooping")).toMatchObject({ day: "2026-09-24", hour: 15, how: "as-wanted" });
    expect(out.get("wildflower-walk")).toMatchObject({ day: "2026-09-23", hour: 21, how: "evening-before", venueCapped: true });
  });

  it("counts each venue on its own, and leaves untagged posts to the clock", () => {
    const out = placeDaySlots([
      at("a", "2026-09-26", 10, IJAMS),
      at("b", "2026-09-26", 12, IJAMS),
      at("c", "2026-09-26", 14, "@kernsknox"),
      at("d", "2026-09-26", 16, "@kernsknox"),
      at("e", "2026-09-26", 18),
      at("f", "2026-09-26", 20),
    ]);
    expect([...out.values()].every((s) => s.day === "2026-09-26" && s.how === "as-wanted")).toBe(true);
  });

  it("looks further back when the day before is at the cap too", () => {
    const items = [
      at("fri1", "2026-09-25", 12, IJAMS),
      at("fri2", "2026-09-25", 16, IJAMS),
      at("sat1", "2026-09-26", 12, IJAMS),
      at("sat2", "2026-09-26", 16, IJAMS),
      at("sat3", "2026-09-26", 9, IJAMS),
    ];
    const out = placeDaySlots(items, { floorDay: "2026-09-23" });
    expect(out.get("sat3")).toMatchObject({ day: "2026-09-24", hour: 21, how: "days-before", venueCapped: true });
  });

  it("never moves a post to before publish day, and never drops one", () => {
    const items = [
      at("wed1", "2026-09-23", 9, IJAMS),
      at("wed2", "2026-09-23", 13, IJAMS),
      at("thu1", "2026-09-24", 13, IJAMS),
      at("thu2", "2026-09-24", 17, IJAMS),
      at("thu3", "2026-09-24", 9, IJAMS),
    ];
    const out = placeDaySlots(items, { floorDay: "2026-09-23" });
    expect(out.size).toBe(5);
    expect(out.get("thu3")).toMatchObject({ day: "2026-09-24", hour: 9, how: "over-venue-cap", venueCapped: true });
    for (const s of out.values()) expect(s.day >= "2026-09-23").toBe(true);
  });

  it("a clock overflow still only looks one day back", () => {
    const friday = [8, 10, 12, 14, 16, 18, 20].map((h) => at(`fri${h}`, "2026-09-18", h));
    const out = placeDaySlots([...friday, at("sat1", "2026-09-19", 9, IJAMS), at("sat2", "2026-09-19", 8, "@kernsknox")]);
    expect(out.get("sat2")).toMatchObject({ day: "2026-09-19", hour: 8, how: "fallback" });
    expect(out.get("sat2")!.venueCapped).toBeUndefined();
  });

  it("replays No. 15: nine Ijams banners in four days, two a day wherever the week has room", () => {
    // Wanted slots as the builder computes them. Feature on publish day; Kern's and
    // Puckers are morning events told the night before; Renew in Nature likewise.
    const wanted = [
      at("end-of-summer-jam", "2026-09-23", 9, IJAMS),
      at("wildflower-walk", "2026-09-24", 14, IJAMS),
      at("hooping", "2026-09-24", 15, IJAMS),
      at("bats-after-dark", "2026-09-24", 17, IJAMS),
      at("urban-wilderness-cool", "2026-09-25", 9, "@legacyparks"),
      at("puckers-texas", "2026-09-25", 19, "@puckersknoxville"),
      at("kerns-tailgate", "2026-09-25", 19, "@kernsknox"),
      at("stained-glass", "2026-09-26", 8, IJAMS),
      at("cyanotype-day", "2026-09-26", 9, IJAMS),
      at("playing-possum", "2026-09-26", 12, IJAMS),
      at("harvest-moon-paddle", "2026-09-26", 16, IJAMS),
      at("renew-in-nature", "2026-09-26", 19, IJAMS),
    ];
    const out = placeDaySlots(wanted, { floorDay: "2026-09-23" });
    expect(out.size).toBe(wanted.length);

    // As it went out: Thursday carried 3 Ijams banners and Saturday 4.
    const days = ["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"];
    const perDay = days.map((d) => venueCount(out, wanted, d, IJAMS));
    // Nine posts, eight places under the cap: exactly one is over, and it says so.
    const over = [...out.entries()].filter(([, s]) => s.how === "over-venue-cap");
    expect(over.map(([k]) => k)).toEqual(["stained-glass"]);
    expect(perDay).toEqual([2, 2, 2, 3]);

    // The clock rule still holds on every day.
    for (const day of days) {
      const hours = [...out.values()].filter((s) => s.day === day).map((s) => s.hour).sort((a, b) => a - b);
      for (let i = 1; i < hours.length; i++) expect(hours[i] - hours[i - 1]).toBeGreaterThanOrEqual(SAME_DAY_GAP_H);
    }
    // Lead time only grows: nothing goes out later than it wanted.
    for (const w of wanted) {
      const s = out.get(w.key)!;
      expect(s.day < w.day || (s.day === w.day && s.hour <= w.hour)).toBe(true);
    }
    expect(out.get("wildflower-walk")).toMatchObject({ day: "2026-09-23", hour: 21 });
    expect(out.get("playing-possum")).toMatchObject({ day: "2026-09-25", hour: 21 });
  });
});
