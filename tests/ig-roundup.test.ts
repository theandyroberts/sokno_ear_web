// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  pickSingles, chooseVaried, buildRoundup, buildVenueRoundup, roundupIsOn, venueCarouselsOn, downgradeCarousel, shortTitle,
  MAX_SINGLES_PER_VENUE, MAX_SLIDES,
} from "../scripts/ig-roundup.mjs";
import { publishPost, userTagsFor, imageTagsOn, abBucket, USER_TAG_SPOT } from "../scripts/ig-container.mjs";

const IJAMS = "@ijamsnaturecenter";
const story = (id: string, venue: string | null, day: string, start?: string, banner?: string) => ({
  id, title: `Long headline for ${id}`, days: [day], tags: venue ? [venue] : [],
  event: start ? { startDate: start } : undefined,
  social: banner ? { igBanner: [banner, "when"] } : undefined,
});
// No. 15, in the order the episode lists it.
const no15 = [
  { ...story("end-of-summer-jam", IJAMS, "Sun", "2026-09-27T12:00:00-04:00", "Free End of Summer Jam at Ijams Nature Center"), feature: true },
  story("harvest-moon-paddle", IJAMS, "Sat", "2026-09-26T19:30:00-04:00"),
  story("cyanotype-day", IJAMS, "Sat", "2026-09-26T12:00:00-04:00"),
  story("puckers-texas", "@puckersknoxville", "Sat", "2026-09-26T09:00:00-04:00"),
  story("kerns-tailgate", "@kernsknox", "Sat", "2026-09-26T08:00:00-04:00"),
  story("playing-possum", IJAMS, "Sat", "2026-09-26T15:00:00-04:00"),
  story("bats-after-dark", IJAMS, "Thu", "2026-09-24T20:00:00-04:00"),
  story("urban-wilderness-cool", "@legacyparks", "Fri"),
  story("renew-in-nature", IJAMS, "Sun", "2026-09-27T10:00:00-04:00"),
  story("wildflower-walk", IJAMS, "Thu", "2026-09-24T17:30:00-04:00"),
  story("stained-glass", IJAMS, "Sat", "2026-09-26T11:00:00-04:00"),
  story("hooping", IJAMS, "Thu", "2026-09-24T18:00:00-04:00"),
];
const io = { episode: { number: 15, shortDate: "Sep 24–27" }, bannerUrl: (s: { id: string }) => `https://x/${s.id}.jpg`, tagsOf: (s: { tags: string[] }) => s.tags };

describe("which stories get a post of their own", () => {
  it("keeps a venue's first three in the editor's order and folds the rest", () => {
    const { keep, fold } = pickSingles(no15);
    expect(keep.filter((id) => no15.find((s) => s.id === id)!.tags[0] === IJAMS)).toEqual(["end-of-summer-jam", "harvest-moon-paddle", "cyanotype-day"]);
    expect(fold).toEqual(["playing-possum", "bats-after-dark", "renew-in-nature", "wildflower-walk", "stained-glass", "hooping"]);
    expect(keep).toEqual(expect.arrayContaining(["puckers-texas", "kerns-tailgate", "urban-wilderness-cool"]));
    expect(MAX_SINGLES_PER_VENUE).toBe(3);
  });

  it("always keeps the feature, wherever it sits in the list", () => {
    const last = [...no15.slice(1), no15[0]];
    expect(pickSingles(last).keep).toContain("end-of-summer-jam");
    expect(pickSingles(last).keep.filter((id) => last.find((s) => s.id === id)!.tags[0] === IJAMS)).toHaveLength(3);
  });

  it("never folds a story with no venue, and loses nothing", () => {
    const many = Array.from({ length: 6 }, (_, i) => story(`news-${i}`, null, "Fri"));
    expect(pickSingles(many).fold).toEqual([]);
    const { keep, fold } = pickSingles(no15);
    expect([...keep, ...fold].sort()).toEqual(no15.map((s) => s.id).sort());
  });
});

describe("the weekend roundup", () => {
  const r = buildRoundup({ ...io, stories: no15, coverUrl: "https://x/cover.jpg", hashtags: "#SoKno", fallbackCaption: "Episode No. 15 is up" })!;

  it("opens on the cover and never exceeds Instagram's ten slides", () => {
    expect(r.slides[0]).toBe("https://x/cover.jpg");
    expect(r.slides).toHaveLength(MAX_SLIDES);
    expect(r.slides).toHaveLength(r.stories.length + 1);
  });

  it("takes every venue's top story before any venue's second", () => {
    expect(r.stories).toEqual(expect.arrayContaining(["puckers-texas", "kerns-tailgate", "urban-wilderness-cool", "end-of-summer-jam"]));
    const picked = chooseVaried(no15, 4, (s) => s.tags[0]).map((s) => s.id);
    expect(picked).toEqual(["end-of-summer-jam", "puckers-texas", "kerns-tailgate", "urban-wilderness-cool"]);
  });

  it("runs in the order the weekend happens", () => {
    const days = r.stories.map((id) => no15.find((s) => s.id === id)!.days[0]);
    const rank = (d: string) => ["Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(d);
    for (let i = 1; i < days.length; i++) expect(rank(days[i])).toBeGreaterThanOrEqual(rank(days[i - 1]));
  });

  it("names each slide by its banner line, tags every venue once, and stays under the caption limit", () => {
    expect(r.caption).toContain("Free End of Summer Jam at Ijams Nature Center");
    expect(r.caption).toContain("This weekend in South Knoxville · Sep 24–27");
    expect(r.caption.match(/@ijamsnaturecenter/g)).toHaveLength(1);
    expect(r.caption).toContain("with 3 more");
    expect(r.caption.length).toBeLessThan(2200);
    expect(shortTitle({ id: "x", title: "T" })).toBe("T");
  });

  it("isn't built for a week with fewer than three stories", () => {
    expect(buildRoundup({ ...io, stories: no15.slice(0, 2), coverUrl: "c" })).toBeNull();
  });
});

describe("a venue's own carousel", () => {
  const folded = no15.filter((s) => pickSingles(no15).fold.includes(s.id));
  const v = buildVenueRoundup({ ...io, key: "ijams", name: "Ijams Nature Center", handle: IJAMS, stories: folded, hashtags: "#SoKno" })!;

  it("carries every folded story, in weekend order, under the venue's house name", () => {
    expect(v.id).toBe("roundup-ijams");
    expect(v.stories).toEqual(["wildflower-walk", "hooping", "bats-after-dark", "stained-glass", "playing-possum", "renew-in-nature"]);
    expect(v.caption).toContain("6 more at Ijams Nature Center this week");
    expect(v.caption).not.toMatch(/at Ijams this week/);
    expect(v.tags).toEqual([IJAMS]);
  });

  it("leaves a single folded story alone", () => {
    expect(buildVenueRoundup({ ...io, key: "ijams", name: "Ijams Nature Center", handle: IJAMS, stories: folded.slice(0, 1) })).toBeNull();
  });
});

describe("Andy's switch", () => {
  it("is on unless he said no", () => {
    expect(roundupIsOn([])).toBe(true);
    expect(roundupIsOn(undefined)).toBe(true);
    expect(roundupIsOn([{ key: "weekend-roundup", answer: null }])).toBe(true);
    expect(roundupIsOn([{ key: "weekend-roundup", answer: "go" }])).toBe(true);
    expect(roundupIsOn([{ key: "weekend-roundup", answer: "no" }])).toBe(false);
    expect(roundupIsOn([{ key: "weekly-reel", answer: "no" }])).toBe(true);
  });

  it("keeps every story as a single post unless he says Don't to 'venue stories back to single posts'", () => {
    // Since 2026-10-05 a venue's own carousel is off: No. 16's read 4 for three stories.
    expect(venueCarouselsOn([])).toBe(false);
    expect(venueCarouselsOn(undefined)).toBe(false);
    expect(venueCarouselsOn([{ key: "venue-singles", answer: null }])).toBe(false);
    expect(venueCarouselsOn([{ key: "venue-singles", answer: "go" }])).toBe(false);
    expect(venueCarouselsOn([{ key: "venue-singles", answer: "no" }])).toBe(true);
    expect(venueCarouselsOn([{ key: "weekend-roundup", answer: "no" }])).toBe(false);
  });
});

describe("the venue tagged in the image", () => {
  it("tags every banner with a venue, by its first handle, on the band", () => {
    expect(userTagsFor(["@kernsknox", "@legacyparks"])).toEqual([{ username: "kernsknox", ...USER_TAG_SPOT }]);
    expect(userTagsFor(["@ijamsnaturecenter"])).toEqual([{ username: "ijamsnaturecenter", x: 0.5, y: 0.88 }]);
  });
  it("leaves an untagged post alone", () => {
    expect(userTagsFor([])).toBeUndefined();
    expect(userTagsFor(undefined)).toBeUndefined();
    expect(userTagsFor(["not a handle"])).toBeUndefined();
  });
  it("is on for every post unless Andy says Don't, which brings the 50/50 split back", () => {
    expect(imageTagsOn([])).toBe(true);
    expect(imageTagsOn([{ key: "tag-every-post", answer: "go" }])).toBe(true);
    expect(imageTagsOn([{ key: "tag-every-post", answer: "no" }])).toBe(false);
    // The split is stable per id, and it is the split the three-week test ran on.
    expect(abBucket("kerns-tailgate")).toBe(abBucket("kerns-tailgate"));
    expect(abBucket("end-of-summer-jam")).toBe(true);
    expect(abBucket("wildflower-walk")).toBe(false);
  });
});

describe("a carousel that won't publish", () => {
  it("goes out as the card it replaced, in the card's own words", () => {
    const plain = downgradeCarousel({ id: "weekend-roundup", slides: ["c.jpg", "a.jpg"], imageUrl: "c.jpg", caption: "Swipe for 9", fallbackCaption: "Episode No. 15 is up", attempts: 2 })!;
    expect(plain).toMatchObject({ imageUrl: "c.jpg", caption: "Episode No. 15 is up", attempts: 2, downgradedFrom: "carousel" });
    expect(plain).not.toHaveProperty("slides");
    expect(downgradeCarousel({ id: "kerns", imageUrl: "k.jpg", caption: "x" })).toBeNull();
  });
});

describe("publishing", () => {
  function fakeInstagram(overrides: Record<string, (body: URLSearchParams) => unknown> = {}) {
    const calls: Array<{ url: string; body: Record<string, string> }> = [];
    let n = 0;
    const fetchImpl = (async (url: string, init?: { body?: URLSearchParams }) => {
      const body = init?.body ? Object.fromEntries(init.body) : {};
      if (init?.body) calls.push({ url, body });
      let out: unknown;
      if (url.endsWith("/media")) out = overrides.media?.(init!.body!) ?? { id: `c${++n}` };
      else if (url.endsWith("/media_publish")) out = overrides.publish?.(init!.body!) ?? { id: "published-1" };
      else out = { status_code: "FINISHED" };
      const ok = !(out as { error?: unknown }).error;
      return { ok, json: async () => out } as Response;
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }
  const base = { graph: "https://g", userId: "u", token: "t", sleep: async () => {}, warn: () => {} };

  it("posts one image as one container, with the in-image tag when it has one", async () => {
    const ig = fakeInstagram();
    const r = await publishPost({ imageUrl: "a.jpg", caption: "cap", userTags: [{ username: "kernsknox", x: 0.5, y: 0.88 }] }, { ...base, fetchImpl: ig.fetchImpl });
    expect(r).toEqual({ id: "published-1", kind: "image", containers: 1 });
    expect(ig.calls.map((c) => c.url)).toEqual(["https://g/u/media", "https://g/u/media_publish"]);
    expect(ig.calls[0].body).toMatchObject({ image_url: "a.jpg", caption: "cap" });
    expect(JSON.parse(ig.calls[0].body.user_tags)[0].username).toBe("kernsknox");
  });

  it("posts a carousel as one child per slide, then a parent that carries the caption", async () => {
    const ig = fakeInstagram();
    const r = await publishPost({ imageUrl: "c.jpg", slides: ["c.jpg", "a.jpg", "b.jpg"], caption: "Swipe" }, { ...base, fetchImpl: ig.fetchImpl });
    expect(r).toEqual({ id: "published-1", kind: "carousel", containers: 4 });
    const media = ig.calls.filter((c) => c.url.endsWith("/media"));
    expect(media.slice(0, 3).map((c) => c.body)).toEqual([
      expect.objectContaining({ image_url: "c.jpg", is_carousel_item: "true" }),
      expect.objectContaining({ image_url: "a.jpg", is_carousel_item: "true" }),
      expect.objectContaining({ image_url: "b.jpg", is_carousel_item: "true" }),
    ]);
    expect(media.slice(0, 3).every((c) => !("caption" in c.body))).toBe(true);
    expect(media[3].body).toMatchObject({ media_type: "CAROUSEL", children: "c1,c2,c3", caption: "Swipe" });
    expect(ig.calls.at(-1)!.body.creation_id).toBe("c4");
  });

  it("refuses a carousel Instagram would refuse, before asking", async () => {
    const ig = fakeInstagram();
    await expect(publishPost({ imageUrl: "c.jpg", slides: Array(11).fill("a.jpg"), caption: "x" }, { ...base, fetchImpl: ig.fetchImpl })).rejects.toThrow(/2 to 10 slides, got 11/);
    expect(ig.calls).toHaveLength(0);
  });

  it("retries a publish that says the media isn't ready, and gives up on a real refusal", async () => {
    let tries = 0;
    const flaky = fakeInstagram({ publish: () => (++tries < 3 ? { error: { code: 9007, message: "Media ID is not available" } } : { id: "third-time" }) });
    expect((await publishPost({ imageUrl: "a.jpg", caption: "c" }, { ...base, fetchImpl: flaky.fetchImpl })).id).toBe("third-time");
    const refused = fakeInstagram({ publish: () => ({ error: { code: 100, message: "Invalid parameter" } }) });
    await expect(publishPost({ imageUrl: "a.jpg", caption: "c" }, { ...base, fetchImpl: refused.fetchImpl })).rejects.toThrow(/publish: .*Invalid parameter/);
  });

  it("says which slide failed", async () => {
    let n = 0;
    const ig = fakeInstagram({ media: () => (++n === 2 ? { error: { message: "Only photo or video can be accepted as media type" } } : { id: `c${n}` }) });
    await expect(publishPost({ imageUrl: "c.jpg", slides: ["c.jpg", "bad.jpg", "b.jpg"], caption: "x" }, { ...base, fetchImpl: ig.fetchImpl })).rejects.toThrow(/^slide 2: /);
  });
});
