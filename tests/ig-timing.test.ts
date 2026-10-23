import { describe, it, expect } from "vitest";
import { assignTimingArms } from "../scripts/ig-schedule.mjs";

const post = (key: string, day: string, hour: number, venue?: string) => ({ key, day, hour, venue });

describe("assignTimingArms", () => {
  const week = [
    post("fbn-thu", "2026-10-29", 18, "@flybynightknox"),
    post("fbn-sat", "2026-10-31", 17, "@flybynightknox"),
    post("ijams-fri", "2026-10-30", 16, "@ijamsnaturecenter"),
    post("ijams-sun", "2026-11-01", 11, "@ijamsnaturecenter"),
    post("trailhead-fri", "2026-10-30", 16, "@trailheadbeer"),
  ];

  it("sends half the week out the day before and leaves the rest day-of", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28" });
    const arms = [...out.values()].map((a) => a.arm);
    expect(arms.filter((a) => a === "early").length).toBe(3);
    expect(arms.filter((a) => a === "day-of").length).toBe(2);
  });

  it("puts each of a venue's two posts in a different arm", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28" });
    expect(out.get("fbn-thu")!.arm).not.toBe(out.get("fbn-sat")!.arm);
    expect(out.get("ijams-fri")!.arm).not.toBe(out.get("ijams-sun")!.arm);
  });

  it("moves an early post exactly a day earlier, same hour, and leaves day-of alone", () => {
    const out = assignTimingArms(week, { floorDay: "2026-10-28" });
    expect(out.get("fbn-thu")).toEqual({ arm: "early", day: "2026-10-28", hour: 18 });
    expect(out.get("fbn-sat")).toEqual({ arm: "day-of", day: "2026-10-31", hour: 17 });
  });

  it("flips the arms on alternate weeks so a one-post venue gets both", () => {
    const a = assignTimingArms(week, { floorDay: "2026-10-28" });
    const b = assignTimingArms(week, { floorDay: "2026-10-28", flip: true });
    for (const it of week) expect(a.get(it.key)!.arm).not.toBe(b.get(it.key)!.arm);
  });

  it("never moves a post before publish day", () => {
    const out = assignTimingArms([post("wed-night", "2026-10-28", 17, "@x"), ...week], { floorDay: "2026-10-28" });
    expect(out.get("wed-night")).toEqual({ arm: "no-room", day: "2026-10-28", hour: 17 });
    for (const a of out.values()) expect(a.day >= "2026-10-28").toBe(true);
  });

  it("crosses a month end", () => {
    const out = assignTimingArms([post("a", "2026-11-01", 11, "@x")], { floorDay: "2026-10-28" });
    expect(out.get("a")).toEqual({ arm: "early", day: "2026-10-31", hour: 11 });
  });
});
