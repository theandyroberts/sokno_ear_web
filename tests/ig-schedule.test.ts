import { describe, it, expect } from "vitest";
import { spaceOutPosts, MIN_GAP_MIN, LEAD_MIN } from "../scripts/ig-schedule.mjs";

const at = (iso: string) => ({ id: iso, postAt: iso });
const now = new Date("2026-08-18T11:48:00-04:00").getTime();
const minsApart = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 60000;

describe("spaceOutPosts", () => {
  it("leaves a well-spaced future queue untouched", () => {
    const posts = [at("2026-08-20T09:00:00-04:00"), at("2026-08-20T11:00:00-04:00")];
    const { posts: out, moved } = spaceOutPosts(posts, now);
    expect(moved).toBe(0);
    expect(out.map((p) => p.postAt)).toEqual(posts.map((p) => p.postAt));
  });

  it("walks past-due posts forward instead of firing them all at once", () => {
    // The real Aug 19 queue: four slots already behind `now`.
    const posts = [
      at("2026-08-18T09:00:00-04:00"),
      at("2026-08-18T10:00:00-04:00"),
      at("2026-08-18T11:48:00-04:00"),
      at("2026-08-18T11:49:00-04:00"),
      at("2026-08-20T09:00:00-04:00"),
    ];
    const { posts: out, moved } = spaceOutPosts(posts, now);
    expect(moved).toBe(4);

    for (const p of out) {
      expect(new Date(p.postAt).getTime()).toBeGreaterThanOrEqual(now + LEAD_MIN * 60000);
    }
    for (let i = 1; i < out.length; i++) {
      expect(minsApart(out[i - 1].postAt, out[i].postAt)).toBeGreaterThanOrEqual(MIN_GAP_MIN);
    }
    // The genuinely-future slot is still where it was.
    expect(out[4].postAt).toBe("2026-08-20T09:00:00-04:00");
  });

  it("keeps at most one post per 15-minute cron tick", () => {
    expect(MIN_GAP_MIN).toBeGreaterThan(15);
  });

  it("preserves order and records what it moved", () => {
    const posts = [
      { id: "a", postAt: "2026-08-18T09:00:00-04:00" },
      { id: "b", postAt: "2026-08-18T10:00:00-04:00" },
    ];
    const { posts: out } = spaceOutPosts(posts, now);
    expect(out.map((p) => p.id)).toEqual(["a", "b"]);
    expect(out[0]).toHaveProperty("rescheduledFrom", "2026-08-18T09:00:00-04:00");
  });

  it("sorts before spacing, so an out-of-order input still comes out clean", () => {
    const posts = [at("2026-08-21T08:00:00-04:00"), at("2026-08-20T09:00:00-04:00")];
    const { posts: out } = spaceOutPosts(posts, now);
    expect(out.map((p) => p.postAt)).toEqual([
      "2026-08-20T09:00:00-04:00",
      "2026-08-21T08:00:00-04:00",
    ]);
  });
});
