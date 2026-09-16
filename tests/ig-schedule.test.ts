import { describe, it, expect } from "vitest";
import { spaceOutPosts, MIN_GAP_MIN, LEAD_MIN, nextLeadWindow } from "../scripts/ig-schedule.mjs";

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

describe("the promo pair opens the drip", () => {
  const lead = (id: string, order: number, postAt: string) => ({ id, lead: true, leadOrder: order, postAt });

  it("puts call-the-ear then episode-drop ahead of every story", () => {
    const posts = [
      at("2026-08-18T09:00:00-04:00"), // feature, already past due
      at("2026-08-18T10:00:00-04:00"),
      lead("call-the-ear", 0, "2026-08-18T11:52:00-04:00"),
      lead("episode-drop", 1, "2026-08-18T11:53:00-04:00"),
      at("2026-08-20T09:00:00-04:00"),
    ];
    const { posts: out } = spaceOutPosts(posts, now);
    expect(out.slice(0, 2).map((p) => p.id)).toEqual(["call-the-ear", "episode-drop"]);
    for (let i = 1; i < out.length; i++) {
      expect(new Date(out[i].postAt).getTime()).toBeGreaterThan(new Date(out[i - 1].postAt).getTime());
    }
  });

  it("leads even when every story slot is in the future", () => {
    const posts = [
      at("2026-08-20T09:00:00-04:00"),
      lead("call-the-ear", 0, "2026-08-18T11:52:00-04:00"),
      lead("episode-drop", 1, "2026-08-18T11:53:00-04:00"),
    ];
    const { posts: out } = spaceOutPosts(posts, now);
    expect(out.map((p) => p.id)).toEqual([
      "call-the-ear",
      "episode-drop",
      "2026-08-20T09:00:00-04:00",
    ]);
  });

  it("still spaces the pair a full gap apart", () => {
    const posts = [lead("call-the-ear", 0, "2026-08-18T11:52:00-04:00"), lead("episode-drop", 1, "2026-08-18T11:53:00-04:00")];
    const { posts: out } = spaceOutPosts(posts, now);
    expect(minsApart(out[0].postAt, out[1].postAt)).toBeGreaterThanOrEqual(MIN_GAP_MIN);
  });
});

// ── A9: aim the lead cards, don't just floor them. `isoPromoSlot` used to take
// max(now, publishDay 09:00) and walk it into the 09:00–20:00 band, so the real
// 16:55 publish of No. 13 opened the drip at 17:00 — the second-worst cell on
// record. See docs/ig-reviews/2026-09-15.md, finding 7.
describe("nextLeadWindow", () => {
  const at = (s: string) => new Date(s).getTime();
  const hour = (ms: number) => new Date(ms).getHours();
  const day = (ms: number) => new Date(ms).getDate();

  it("leaves a time already inside 09:00–13:00 alone", () => {
    const t = at("2026-09-09T10:30:00-04:00");
    expect(nextLeadWindow(t)).toBe(t);
  });

  it("pulls an early-morning publish up to 09:00 the same day", () => {
    const got = nextLeadWindow(at("2026-09-09T01:45:00-04:00"));
    expect(hour(got)).toBe(9);
    expect(day(got)).toBe(9);
  });

  it("pushes a late-afternoon publish to 09:00 the NEXT morning — the actual No. 13 case", () => {
    const got = nextLeadWindow(at("2026-09-09T16:55:00-04:00"));
    expect(hour(got)).toBe(9);
    expect(day(got)).toBe(10);
  });

  it("treats 13:00 as outside the window", () => {
    expect(day(nextLeadWindow(at("2026-09-09T13:00:00-04:00")))).toBe(10);
    expect(day(nextLeadWindow(at("2026-09-09T12:59:00-04:00")))).toBe(9);
  });

  it("never moves backwards", () => {
    const t = at("2026-09-09T19:30:00-04:00");
    expect(nextLeadWindow(t)).toBeGreaterThan(t);
  });

  it("stays put rather than jumping past the ceiling", () => {
    // A 16:55 publish whose first story goes out at 19:00 the same evening: taking
    // the morning slot would drag that story to the next day, behind the card that
    // is supposed to introduce it. The ceiling wins.
    const publish = at("2026-09-09T16:55:00-04:00");
    const firstStory = at("2026-09-09T19:00:00-04:00");
    expect(nextLeadWindow(publish, firstStory)).toBe(publish);
  });

  it("takes the morning slot when the first story is far enough out", () => {
    const publish = at("2026-09-09T16:55:00-04:00");
    const firstStory = at("2026-09-11T17:00:00-04:00");
    expect(hour(nextLeadWindow(publish, firstStory))).toBe(9);
    expect(day(nextLeadWindow(publish, firstStory))).toBe(10);
  });

  it("keeps the lead pair ahead of the stories it announces", () => {
    // The whole point of the ceiling: whatever it returns, the cards still open the run.
    const publish = at("2026-09-09T16:55:00-04:00");
    for (const story of ["2026-09-09T18:00:00-04:00", "2026-09-10T09:30:00-04:00", "2026-09-12T14:00:00-04:00"]) {
      expect(nextLeadWindow(publish, at(story))).toBeLessThan(at(story));
    }
  });
});
