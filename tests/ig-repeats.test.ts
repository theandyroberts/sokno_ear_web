import { describe, it, expect } from "vitest";
import { priorRunsById, pickRepeatsToDrop, standingKeyOf, MAX_REPEATS_PER_EPISODE } from "../scripts/ig-repeats.mjs";

// The real shape of content/episodes: each episode lists the story ids that ran in it.
const EPISODES = [
  { date: "2026-07-30", ids: ["specials-board", "kerns-weekend"] },
  { date: "2026-08-06", ids: ["specials-board", "kerns-weekend"] },
  { date: "2026-08-13", ids: ["specials-board"] },
  { date: "2026-08-19", ids: ["specials-board", "kerns-weekend"] },
  { date: "2026-08-26", ids: ["specials-board", "hiwire-thursday", "playscape-storytelling"] },
];

describe("priorRunsById", () => {
  it("counts runs and remembers the last date each story ran", () => {
    const h = priorRunsById(EPISODES, "2026-09-02");
    expect(h.get("specials-board")).toEqual({ runs: 5, lastRun: "2026-08-26" });
    expect(h.get("hiwire-thursday")).toEqual({ runs: 1, lastRun: "2026-08-26" });
    expect(h.has("trailhead-trivia")).toBe(false);
  });

  it("ignores the episode being built, and anything after it", () => {
    const h = priorRunsById(
      [...EPISODES, { date: "2026-09-02", ids: ["specials-board"] }, { date: "2026-09-09", ids: ["specials-board"] }],
      "2026-09-02"
    );
    expect(h.get("specials-board")!.runs).toBe(5);
  });
});

describe("pickRepeatsToDrop", () => {
  const history = priorRunsById(EPISODES, "2026-09-02");

  it("never drops a story that has not run before", () => {
    const ids = ["gameday-south", "ijams-bats", "trailhead-trivia"];
    expect(pickRepeatsToDrop(ids, history)).toEqual([]);
  });

  it("keeps one repeat and drops the rest — the real No. 12 line-up", () => {
    const ids = [
      "gameday-south",
      "ijams-bats",
      "playscape-storytelling",
      "hiwire-thursday",
      "trailhead-trivia",
      "specials-board",
    ];
    const dropped = pickRepeatsToDrop(ids, history);
    expect(dropped).toHaveLength(2);
    // The one kept is the freshest rotation pick; the four-times-run board is not it.
    expect(dropped).toContain("specials-board");
    expect(dropped).not.toContain("gameday-south");
    expect(dropped).not.toContain("trailhead-trivia");
  });

  it("rotates: the repeat that has gone longest without running is the keeper", () => {
    const h = priorRunsById(
      [
        { date: "2026-08-12", ids: ["alpha"] },
        { date: "2026-08-26", ids: ["beta"] },
      ],
      "2026-09-02"
    );
    expect(pickRepeatsToDrop(["alpha", "beta"], h)).toEqual(["beta"]);
  });

  it("breaks a tie on last run by favouring the one that has run least", () => {
    const h = priorRunsById(
      [
        { date: "2026-08-12", ids: ["heavy"] },
        { date: "2026-08-19", ids: ["heavy"] },
        { date: "2026-08-26", ids: ["heavy", "light"] },
      ],
      "2026-09-02"
    );
    expect(pickRepeatsToDrop(["heavy", "light"], h)).toEqual(["heavy"]);
  });

  it("is a no-op when there is only one repeat in the week", () => {
    expect(pickRepeatsToDrop(["specials-board", "gameday-south"], history)).toEqual([]);
  });

  it("caps at one repeat per episode", () => {
    expect(MAX_REPEATS_PER_EPISODE).toBe(1);
  });

  it("keeps the cap configurable without touching callers' defaults", () => {
    const ids = ["specials-board", "hiwire-thursday", "playscape-storytelling"];
    expect(pickRepeatsToDrop(ids, history, { max: 2 })).toHaveLength(1);
    expect(pickRepeatsToDrop(ids, history, { max: 0 })).toHaveLength(3);
  });
});

// ── A10: the rename hole. `playscape-storytelling` was retitled `playscape-fall`
// after two runs; the cap keyed on the bare id, saw a brand-new story, and let the
// same banner run a third straight Friday. Counting by `social.standingKey` fixes it.
// See docs/ig-reviews/2026-09-15.md, finding 8.
describe("standing keys survive a retitle", () => {
  const ARCHIVE = [
    { date: "2026-08-26", keys: ["playscape-storytime", "specials-board"] },
    { date: "2026-09-02", keys: ["playscape-storytime", "specials-board"] },
  ];

  it("standingKeyOf prefers the declared key and falls back to the id", () => {
    expect(standingKeyOf({ id: "playscape-fall", social: { standingKey: "playscape-storytime" } })).toBe("playscape-storytime");
    expect(standingKeyOf({ id: "trailhead-trivia" })).toBe("trailhead-trivia");
    expect(standingKeyOf({ id: "x", social: {} })).toBe("x");
  });

  it("carries the run count across the rename", () => {
    const h = priorRunsById(ARCHIVE, "2026-09-09");
    expect(h.get("playscape-storytime")).toEqual({ runs: 2, lastRun: "2026-09-02" });
    // The new id on its own would have looked untouched — that was the bug.
    expect(h.has("playscape-fall")).toBe(false);
  });

  it("drops the retitled standing item when another repeat is fresher", () => {
    const h = priorRunsById(
      [{ date: "2026-08-26", keys: ["playscape-storytime"] },
       { date: "2026-09-02", keys: ["playscape-storytime"] },
       { date: "2026-09-02", keys: ["hiwire-pint-night"] }],
      "2026-09-09"
    );
    const keys = ["playscape-storytime", "hiwire-pint-night", "trailhead-trivia"];
    const dropped = pickRepeatsToDrop(keys, h);
    expect(dropped).toHaveLength(1);
    expect(dropped).not.toContain("trailhead-trivia");
  });

  it("still reads legacy archives that carry `ids` instead of `keys`", () => {
    const h = priorRunsById([{ date: "2026-08-26", ids: ["specials-board"] }], "2026-09-02");
    expect(h.get("specials-board")).toEqual({ runs: 1, lastRun: "2026-08-26" });
  });
});

describe("declared standing items count from their first run", () => {
  it("treats social.standing:true as a repeat even with no history", () => {
    const h = priorRunsById([{ date: "2026-08-26", keys: ["earls-specials-board"] }], "2026-09-02");
    const keys = ["earls-specials-board", "brand-new-standing", "one-off"];
    // Without the declaration the new standing item is invisible to the cap.
    expect(pickRepeatsToDrop(keys, h)).toEqual([]);
    // With it, two repeats compete for one slot and the one-off is never touched.
    const dropped = pickRepeatsToDrop(keys, h, { standingKeys: ["brand-new-standing"] });
    expect(dropped).toHaveLength(1);
    expect(dropped).not.toContain("one-off");
  });

  it("a never-run standing item keeps its slot over one that has already decayed", () => {
    const h = priorRunsById([{ date: "2026-08-26", keys: ["ran-before"] }], "2026-09-02");
    expect(pickRepeatsToDrop(["ran-before", "never-run"], h, { standingKeys: ["never-run"] }))
      .toEqual(["ran-before"]);
  });
});
