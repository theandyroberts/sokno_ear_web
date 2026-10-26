// @vitest-environment node
import { describe, it, expect } from "vitest";
import { reelIsOn, buildReelPost, REEL_HOUR, reelMaxSeconds, REEL_SECONDS, SHORT_REEL_MOVE, reelOpensOnStory, REEL_OPEN_MOVE } from "../scripts/ig-reel.mjs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { publishPost, userTagsFor, artistTagsOn, adIsOn, CONTAINER_WAIT, MAX_IMAGE_TAGS } from "../scripts/ig-container.mjs";

const episode = { number: 18, shortDate: "Oct 15–18", date: "2026-10-14", feature: { title: "The Pink Cactus turns one" } };

describe("the weekly Reel", () => {
  it("is on unless Andy said Don't", () => {
    expect(reelIsOn([])).toBe(true);
    expect(reelIsOn(undefined)).toBe(true);
    expect(reelIsOn([{ key: "weekly-reel", answer: "go", note: "no ad next week" }])).toBe(true);
    expect(reelIsOn([{ key: "weekly-reel", answer: "no" }])).toBe(false);
  });

  it("is cut to 45 seconds unless Andy said Don't to the shorter Reel", () => {
    expect(reelMaxSeconds([])).toBe(45);
    expect(reelMaxSeconds([{ key: SHORT_REEL_MOVE, answer: "go" }])).toBe(REEL_SECONDS.short);
    expect(reelMaxSeconds([{ key: SHORT_REEL_MOVE, answer: "no" }])).toBe(REEL_SECONDS.full);
    expect(reelMaxSeconds([{ key: "weekly-reel", answer: "no" }])).toBe(45);
  });

  it("is one queue entry on publish day at one o'clock, carrying the video and its poster", () => {
    const p = buildReelPost({ episode, videoUrl: "https://s/reel.mp4", coverUrl: "https://s/reel.jpg", hashtags: "#SoKno", seconds: 88.4, stories: 16 });
    expect(p).toMatchObject({ id: "reel", title: "Weekly Reel (No. 18)", videoUrl: "https://s/reel.mp4", coverUrl: "https://s/reel.jpg", imageUrl: "https://s/reel.jpg", tags: [], dated: false, status: "pending" });
    expect(p.postAt).toBe(`2026-10-14T${REEL_HOUR}:00:00-04:00`);
    expect(p.caption).toContain("16 things to do in South Knoxville · Oct 15–18 in 88 seconds. Sound on.");
    expect(p.caption).toContain("The Pink Cactus turns one.");
    expect(p.caption).toContain("episode No. 18 — link in bio");
    expect(p.caption.trim().endsWith("#SoKno")).toBe(true);
  });

  it("publishes as one REELS container that is given the video wait, then the publish", async () => {
    const calls: Array<{ url: string; body?: Record<string, string> }> = [];
    let polls = 0;
    const fetchImpl = (async (url: string, init?: { body?: URLSearchParams }) => {
      calls.push({ url, body: init?.body ? Object.fromEntries(init.body) : undefined });
      let out: unknown;
      if (url.endsWith("/media")) out = { id: "reel-c" };
      else if (url.endsWith("/media_publish")) out = { id: "reel-published" };
      else out = ++polls < 3 ? { status_code: "IN_PROGRESS" } : { status_code: "FINISHED" }; // transcoding takes a while
      return { ok: true, json: async () => out } as Response;
    }) as unknown as typeof fetch;
    const slept: number[] = [];
    const r = await publishPost(
      { videoUrl: "https://s/reel.mp4", coverUrl: "https://s/reel.jpg", imageUrl: "https://s/reel.jpg", caption: "This weekend" },
      { graph: "https://g", userId: "u", token: "t", fetchImpl, sleep: async (ms: number) => { slept.push(ms); }, warn: () => {} },
    );
    expect(r).toEqual({ id: "reel-published", kind: "reel", containers: 1 });
    expect(calls[0].body).toEqual({ media_type: "REELS", video_url: "https://s/reel.mp4", caption: "This weekend", share_to_feed: "true", cover_url: "https://s/reel.jpg", access_token: "t" });
    expect(calls[0].body).not.toHaveProperty("image_url");
    expect(slept).toEqual([CONTAINER_WAIT.video.everyMs, CONTAINER_WAIT.video.everyMs]);
    expect(calls.at(-1)!.body!.creation_id).toBe("reel-c");
  });

  it("gives a Reel minutes, an image seconds", () => {
    expect(CONTAINER_WAIT.video.polls * CONTAINER_WAIT.video.everyMs).toBeGreaterThanOrEqual(5 * 60 * 1000);
    expect(CONTAINER_WAIT.image.polls * CONTAINER_WAIT.image.everyMs).toBeLessThanOrEqual(60 * 1000);
  });

  it("says when the video fails to process, and does not publish", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      const out = url.endsWith("/media") ? { id: "c" } : { status_code: "ERROR", status: "Video too short" };
      return { ok: true, json: async () => out } as Response;
    }) as unknown as typeof fetch;
    await expect(publishPost({ videoUrl: "v.mp4", caption: "x" }, { graph: "https://g", userId: "u", token: "t", fetchImpl, sleep: async () => {}, warn: () => {} }))
      .rejects.toThrow(/reel processing ERROR: .*Video too short/);
    expect(calls.some((u) => u.endsWith("/media_publish"))).toBe(false);
  });
});

describe("the artist in the picture too", () => {
  it("tags every verified handle the story names, venue first, spread along the band", () => {
    expect(userTagsFor(["@flybynightknox", "@feralkittyband"])).toEqual([
      { username: "flybynightknox", x: 0.2, y: 0.88 },
      { username: "feralkittyband", x: 0.8, y: 0.88 },
    ]);
    expect(userTagsFor(["@kernsknox", "@wdvx", "@emisunshine"]).map((t) => t.x)).toEqual([0.2, 0.5, 0.8]);
    expect(userTagsFor(["@kernsknox"])).toEqual([{ username: "kernsknox", x: 0.5, y: 0.88 }]);
  });
  it("tags the venue alone when Andy says Don't", () => {
    expect(userTagsFor(["@flybynightknox", "@feralkittyband"], { everyone: false })).toEqual([{ username: "flybynightknox", x: 0.5, y: 0.88 }]);
    expect(artistTagsOn([])).toBe(true);
    expect(artistTagsOn([{ key: "tag-the-artist", answer: "no" }])).toBe(false);
  });
  it("never tags the same account twice, and stops at the limit", () => {
    expect(userTagsFor(["@kernsknox", "@kernsknox"])).toHaveLength(1);
    expect(userTagsFor(Array.from({ length: 9 }, (_, i) => `@h${i}`))).toHaveLength(MAX_IMAGE_TAGS);
  });
});

describe("the Call-the-Ear ad while the phone line changes", () => {
  const on = { held: false };
  it("runs when there is no hold, and once Andy marks the hold Done or it is closed", () => {
    // Andy's standing decision (2026-10-19): the ad stays off until he says otherwise.
    expect(adIsOn([])).toBe(false);
    expect(adIsOn([{ key: "call-the-ear-ad", answer: "done" }])).toBe(false);
    // Once AD_HELD is flipped, the old move's answer still reads.
    expect(adIsOn([], on)).toBe(true);
    expect(adIsOn([{ key: "call-the-ear-ad", answer: "done" }], on)).toBe(true);
    expect(adIsOn([{ key: "call-the-ear-ad", answer: null, closedAt: "2026-11-01T00:00:00Z" }], on)).toBe(true);
  });
  it("is held while the hold is open and unanswered, or answered Not this week", () => {
    expect(adIsOn([{ key: "call-the-ear-ad", answer: null }], on)).toBe(false);
    expect(adIsOn([{ key: "call-the-ear-ad", answer: "later" }], on)).toBe(false);
  });
});

describe("the Reel opens on the feature", () => {
  it("does unless Andy said Don't", () => {
    expect(reelOpensOnStory([])).toBe(true);
    expect(reelOpensOnStory(undefined)).toBe(true);
    expect(reelOpensOnStory([{ key: REEL_OPEN_MOVE, answer: "go" }])).toBe(true);
    expect(reelOpensOnStory([{ key: REEL_OPEN_MOVE, answer: "no" }])).toBe(false);
  });

  // cut_order and bridge_text live in scripts/ig-reel.py, beside the cut. Ask Python.
  const script = path.join(__dirname, "..", "scripts", "ig-reel.py");
  let python = true;
  try { execFileSync("python3", ["-c", "import PIL"], { stdio: "ignore" }); } catch { python = false; }
  function ask(expr: string): unknown {
    const code = [
      "import importlib.util, json, sys",
      `spec = importlib.util.spec_from_file_location("igr", ${JSON.stringify(script)})`,
      "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
      "S = lambda name, feature=False: m.Segment('story', name, name, name, feature=feature)",
      "intro = m.Segment('intro', 'cover', 'intro', 'intro'); outro = m.Segment('outro', 'cover', 'outro', 'outro')",
      `print(json.dumps(${expr}))`,
    ].join("\n");
    return JSON.parse(execFileSync("python3", ["-c", code], { encoding: "utf8" }));
  }

  it.skipIf(!python)("plays the feature, then the title card as the bridge, then the rest, then the sign-off", () => {
    expect(ask("[s.art for s in m.cut_order(intro, [S('feature', True), S('thu'), S('sat')], outro)]"))
      .toEqual(["feature", "cover", "thu", "sat", "cover"]);
  });

  it.skipIf(!python)("keeps the title card first when asked, or when no feature was kept", () => {
    expect(ask("[s.art for s in m.cut_order(intro, [S('feature', True), S('thu')], outro, story_first=False)]"))
      .toEqual(["cover", "feature", "thu", "cover"]);
    expect(ask("[s.art for s in m.cut_order(intro, [S('thu'), S('sat')], outro)]"))
      .toEqual(["cover", "thu", "sat", "cover"]);
  });

  it.skipIf(!python)("has the title card count the rest and say where they all are", () => {
    expect(ask("m.bridge_text(6, 16)")).toBe("Five more of the sixteen things in South Knoxville this weekend. All of them at soknoear.com.");
    expect(ask("m.bridge_text(4, 4)")).toBe("Three more things to do in South Knoxville this weekend. All of them at soknoear.com.");
    expect(ask("m.bridge_text(6, 16, story_first=False)")).toBe("Six of the sixteen things in South Knoxville this weekend. All of them at soknoear.com.");
    expect(ask("m.bridge_text(4, 4, story_first=False)")).toBeNull();
  });
});
