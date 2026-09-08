import { describe, it, expect } from "vitest";
import {
  spaceOutPosts,
  nextDaylightSlot,
  DAY_START_HOUR,
  DAY_END_HOUR,
  MIN_GAP_MIN,
} from "../scripts/ig-schedule.mjs";

const ms = (iso: string) => new Date(iso).getTime();
const hourOf = (iso: string) => new Date(iso).getHours();
const at = (iso: string) => ({ id: iso, postAt: iso });

// The No. 12 publish ran at 01:31 ET on Wednesday Sep 2. Every past-due slot —
// the promo pair and the feature — was walked forward from "now", so the drip
// opened at 01:45, 02:00 and 02:30 in the morning.
const NIGHT_PUBLISH = ms("2026-09-02T01:31:00-04:00");

describe("nextDaylightSlot", () => {
  it("leaves a time already inside the posting window alone", () => {
    const t = ms("2026-09-03T13:00:00-04:00");
    expect(nextDaylightSlot(t)).toBe(t);
  });

  it("lifts the small hours to the same morning's opening slot", () => {
    const out = new Date(nextDaylightSlot(ms("2026-09-02T01:45:00-04:00")));
    expect(out.getDate()).toBe(2);
    expect(out.getHours()).toBe(DAY_START_HOUR);
    expect(out.getMinutes()).toBe(0);
  });

  it("pushes a late-night time to the next morning, not the same one", () => {
    const out = new Date(nextDaylightSlot(ms("2026-09-03T22:10:00-04:00")));
    expect(out.getDate()).toBe(4);
    expect(out.getHours()).toBe(DAY_START_HOUR);
  });

  it("treats the closing hour as outside the window", () => {
    const out = new Date(nextDaylightSlot(ms(`2026-09-03T${String(DAY_END_HOUR).padStart(2, "0")}:00:00-04:00`)));
    expect(out.getDate()).toBe(4);
  });

  it("never moves a time backwards", () => {
    for (const h of [0, 6, 8, 9, 12, 19, 20, 23]) {
      const t = ms(`2026-09-03T${String(h).padStart(2, "0")}:30:00-04:00`);
      expect(nextDaylightSlot(t)).toBeGreaterThanOrEqual(t);
    }
  });
});

describe("spaceOutPosts keeps rescheduled posts out of the small hours", () => {
  it("does not open the drip at 1:45 in the morning", () => {
    // The real No. 12 shape: promo pair stamped `now`, feature slot already past.
    const posts = [
      { id: "call-the-ear", lead: true, leadOrder: 0, postAt: "2026-09-02T01:31:00-04:00" },
      { id: "episode-drop", lead: true, leadOrder: 1, postAt: "2026-09-02T01:32:00-04:00" },
      { id: "gameday-south", postAt: "2026-09-01T09:00:00-04:00" },
      at("2026-09-03T12:00:00-04:00"),
    ];
    const { posts: out } = spaceOutPosts(posts, NIGHT_PUBLISH);
    for (const p of out) {
      const h = hourOf(p.postAt);
      expect(h, `${p.id} posted at ${p.postAt}`).toBeGreaterThanOrEqual(DAY_START_HOUR);
      expect(h, `${p.id} posted at ${p.postAt}`).toBeLessThan(DAY_END_HOUR);
    }
  });

  it("still opens with the promo pair, in order, a full gap apart", () => {
    const posts = [
      { id: "call-the-ear", lead: true, leadOrder: 0, postAt: "2026-09-02T01:31:00-04:00" },
      { id: "episode-drop", lead: true, leadOrder: 1, postAt: "2026-09-02T01:32:00-04:00" },
      { id: "gameday-south", postAt: "2026-09-01T09:00:00-04:00" },
    ];
    const { posts: out } = spaceOutPosts(posts, NIGHT_PUBLISH);
    expect(out.map((p) => p.id)).toEqual(["call-the-ear", "episode-drop", "gameday-south"]);
    const apart = (a: string, b: string) => (ms(b) - ms(a)) / 60000;
    expect(apart(out[0].postAt, out[1].postAt)).toBeGreaterThanOrEqual(MIN_GAP_MIN);
    expect(apart(out[1].postAt, out[2].postAt)).toBeGreaterThanOrEqual(MIN_GAP_MIN);
  });

  it("leaves a slot the editor actually chose exactly where it is", () => {
    // A deliberate future 20:00 slot is an editorial decision, not a reschedule.
    const posts = [at("2026-09-04T20:00:00-04:00")];
    const { posts: out, moved } = spaceOutPosts(posts, NIGHT_PUBLISH);
    expect(moved).toBe(0);
    expect(out[0].postAt).toBe("2026-09-04T20:00:00-04:00");
  });

  it("records the original time when it lifts one out of the night", () => {
    const posts = [{ id: "x", postAt: "2026-09-01T09:00:00-04:00" }];
    const { posts: out, moved } = spaceOutPosts(posts, NIGHT_PUBLISH);
    expect(moved).toBe(1);
    expect(out[0]).toHaveProperty("rescheduledFrom", "2026-09-01T09:00:00-04:00");
    expect(hourOf(out[0].postAt)).toBe(DAY_START_HOUR);
  });
});
