import { describe, it, expect } from "vitest";
import { placeDaySlots, SAME_DAY_GAP_H, EARLIEST_STORY_HOUR } from "../scripts/ig-schedule.mjs";

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
