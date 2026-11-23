import { describe, it, expect } from "vitest";
import { assignTimingArms, earlyPostsOn, timingMode, EARLY_POSTS_MOVE, ALL_EARLY_MOVE } from "../scripts/ig-schedule.mjs";

const post = (key: string, day: string, hour: number, venue?: string) => ({ key, day, hour, venue });
const dayBefore = (day: string) => { const [y, m, d] = day.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10); };
const week = [
  post("fbn-thu", "2026-10-29", 18, "@flybynightknox"),
  post("fbn-sat", "2026-10-31", 17, "@flybynightknox"),
  post("ijams-fri", "2026-10-30", 16, "@ijamsnaturecenter"),
  post("ijams-sun", "2026-11-01", 11, "@ijamsnaturecenter"),
  post("trailhead-fri", "2026-10-30", 16, "@trailheadbeer"),
];

describe("assignTimingArms, the half-and-half test (mode: split)", () => {
  it("sends half the week out the day before and leaves the rest day-of", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28", mode: "split" });
    const arms = [...out.values()].map((a) => a.arm);
    expect(arms.filter((a) => a === "early").length).toBe(3);
    expect(arms.filter((a) => a === "day-of").length).toBe(2);
  });

  it("puts each of a venue's two posts in a different arm", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28", mode: "split" });
    expect(out.get("fbn-thu")!.arm).not.toBe(out.get("fbn-sat")!.arm);
    expect(out.get("ijams-fri")!.arm).not.toBe(out.get("ijams-sun")!.arm);
  });

  it("moves an early post exactly a day earlier, same hour, and leaves day-of alone", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28", mode: "split" });
    expect(out.get("fbn-thu")).toEqual({ arm: "early", day: "2026-10-28", hour: 18 });
    expect(out.get("fbn-sat")).toEqual({ arm: "day-of", day: "2026-10-31", hour: 17 });
  });

  it("flips the arms on alternate weeks so a one-post venue gets both", () => {
    const a = assignTimingArms(week, { floorDay: "2026-10-28", mode: "split" });
    const b = assignTimingArms(week, { floorDay: "2026-10-28", flip: true, mode: "split" });
    for (const it of week) expect(a.get(it.key)!.arm).not.toBe(b.get(it.key)!.arm);
  });

  it("never moves a post before publish day", () => {
    const out = assignTimingArms([post("wed-night", "2026-10-28", 17, "@x"), ...week], { floorDay: "2026-10-28", mode: "split" });
    expect(out.get("wed-night")).toEqual({ arm: "no-room", day: "2026-10-28", hour: 17 });
    for (const a of out.values()) expect(a.day >= "2026-10-28").toBe(true);
  });

  it("crosses a month end", () => {
    const out = assignTimingArms([post("a", "2026-11-01", 11, "@x")], { floorDay: "2026-10-28", mode: "split" });
    expect(out.get("a")).toEqual({ arm: "early", day: "2026-10-31", hour: 11 });
  });
});

describe("assignTimingArms, the rule since 2026-11-23 (every dated post a day early)", () => {
  it("is the default: every dated post goes out 24 hours before its slot, same hour", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28" });
    for (const it of week) expect(out.get(it.key)).toEqual({ arm: "early", day: dayBefore(it.day), hour: it.hour });
  });

  it("still never moves a post before publish day", () => {
    const out = assignTimingArms([post("wed-night", "2026-10-28", 17, "@x"), ...week], { floorDay: "2026-10-28" });
    expect(out.get("wed-night")).toEqual({ arm: "no-room", day: "2026-10-28", hour: 17 });
    expect([...out.values()].filter((a) => a.arm === "early").length).toBe(week.length);
  });

  it("ignores flip: there is nothing to alternate", () => {
    const a = assignTimingArms(week, { floorDay: "2026-10-28" });
    const b = assignTimingArms(week, { floorDay: "2026-10-28", flip: true });
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("puts everything back day-of when told to", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28", mode: "day-of" });
    for (const it of week) expect(out.get(it.key)).toEqual({ arm: "day-of", day: it.day, hour: it.hour });
  });
});

describe("timingMode", () => {
  it("is all-early unless Andy said otherwise on the dashboard", () => {
    expect(timingMode([])).toBe("all-early");
    expect(timingMode(undefined)).toBe("all-early");
    expect(timingMode([{ key: ALL_EARLY_MOVE, answer: "go" }, { key: EARLY_POSTS_MOVE, answer: "go" }])).toBe("all-early");
  });
  it("keeps the split running when Andy says Don't to making early the rule", () => {
    expect(timingMode([{ key: ALL_EARLY_MOVE, answer: "no" }])).toBe("split");
  });
  it("goes back to day-of when Andy says Don't to posting early at all, whatever else he answered", () => {
    expect(timingMode([{ key: EARLY_POSTS_MOVE, answer: "no" }])).toBe("day-of");
    expect(timingMode([{ key: EARLY_POSTS_MOVE, answer: "no" }, { key: ALL_EARLY_MOVE, answer: "no" }])).toBe("day-of");
  });
});

describe("earlyPostsOn", () => {
  it("runs the test unless Andy answered Don't on the dashboard", () => {
    expect(earlyPostsOn([])).toBe(true);
    expect(earlyPostsOn(undefined)).toBe(true);
    expect(earlyPostsOn([{ key: EARLY_POSTS_MOVE, answer: "go" }])).toBe(true);
    expect(earlyPostsOn([{ key: "weekend-roundup", answer: "no" }])).toBe(true);
    expect(earlyPostsOn([{ key: EARLY_POSTS_MOVE, answer: "no" }])).toBe(false);
  });
});
