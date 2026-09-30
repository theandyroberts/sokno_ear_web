import { describe, it, expect } from "vitest";
import { weekOf, weekDays, clock, dayLabel, deriveWeek, mergeMarks } from "../scripts/pub-status-lib.mjs";

const at = (iso: string) => new Date(iso).getTime();
const find = (w: any, id: string) => [...w.days.flatMap((d: any) => d.items), ...(w.stray ?? [])].find((i: any) => i.id === id);

const episode = { slug: "2026-09-23", date: "2026-09-23", number: 15, shortDate: "Sep 24–27", feature: { id: "jam", title: "End of summer jam" }, stories: [] };
const queue = {
  slug: "2026-09-23", approved: true,
  posts: [
    { id: "call-the-ear", title: "Call the Ear (weekly ad)", postAt: "2026-09-23T11:35:00-04:00", status: "posted", tags: [] },
    { id: "bats", title: "Bats after dark", postAt: "2026-09-24T17:00:00-04:00", status: "posted", tags: ["@ijamsnaturecenter"], abGroup: "img-tagged" },
    { id: "paddle", title: "Harvest moon paddle", postAt: "2026-09-26T16:00:00-04:00", status: "pending", tags: [] },
    { id: "gone", title: "Morning walk", postAt: "2026-09-25T09:00:00-04:00", status: "stale", tags: [] },
    { id: "broke", title: "Broken one", postAt: "2026-09-25T13:00:00-04:00", status: "failed", attempts: 4, tags: [] },
  ],
};
const venueDrafts = {
  kerns: { key: "kerns", name: "Kern's Food Hall", action: "draft", to: "events@kernsbakery.com", lastDay: "2026-09-26", gmailDraftId: "r1", gmailAccount: "andy@note15.com" },
  puckers: { key: "puckers", name: "Puckers Sports Grill", action: "draft", to: null, instagram: "@puckersknoxville", lastDay: "2026-09-27", gmailDraftId: "r2", gmailAccount: "andy@note15.com" },
  old: { key: "old", name: "Old one", action: "draft", to: "x@y.z", lastDay: "2026-09-20", superseded: "2026-09-25" },
};
const facts = (over: Record<string, unknown> = {}) => ({
  week: "2026-09-23", now: at("2026-09-25T12:00:00-04:00"), episode, draft: null, hasAudio: true, igAssets: 16, queue,
  nightlife: { updated: "2026-09-22", weekend: "Sep 24–27" }, reviews: ["2026-09-15", "2026-09-21"],
  venues: [
    { key: "kerns", name: "Kern's Food Hall", introduced: null, to: "events@kernsbakery.com" },
    { key: "puckers", name: "Puckers Sports Grill", introduced: null, to: null },
  ],
  venueLog: {}, venueDrafts, ...over,
});

describe("the week", () => {
  it("is keyed by its Wednesday, whatever day you ask from", () => {
    expect(weekOf("2026-09-21")).toBe("2026-09-23"); // Monday
    expect(weekOf("2026-09-23")).toBe("2026-09-23");
    expect(weekOf("2026-09-27")).toBe("2026-09-23"); // Sunday
    expect(weekOf("2026-09-28")).toBe("2026-09-30"); // next Monday
  });
  it("runs Monday to Sunday", () => {
    const d = weekDays("2026-09-23");
    expect(d.map((x) => x.dow)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(d[0].date).toBe("2026-09-21");
    expect(d[6].label).toBe("Sun Sep 27");
  });
  it("crosses a month boundary", () => {
    expect(weekDays("2026-09-30").map((x) => x.date)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });
  it("formats times and days for people", () => {
    expect(clock("09:00")).toBe("9:00 AM");
    expect(clock("13:05")).toBe("1:05 PM");
    expect(clock("00:30")).toBe("12:30 AM");
    expect(dayLabel("2026-09-26")).toBe("Sat Sep 26");
  });
});

describe("deriveWeek — a published week", () => {
  const w = deriveWeek(facts());

  it("ticks what the files prove", () => {
    expect(w.stage).toBe("published");
    for (const id of ["draft", "audio", "party-plan", "site-live", "party-live", "ig-art", "ig-queue", "ig-review"]) expect(find(w, id).done, id).toBe(true);
    expect(find(w, "ig-queue").detail).toBe("5 posts");
    expect(find(w, "ig-review").detail).toBe("report filed Mon Sep 21");
  });
  it("treats publishing as proof the draft was researched", () => {
    expect(find(w, "research").done).toBe(true);
  });
  it("puts nothing in Andy's name", () => {
    const whos = new Set(w.days.flatMap((d: any) => d.items).map((i: any) => i.who));
    expect([...whos].sort()).toEqual(["Claude", "Pipeline"]);
    expect(find(w, "review")).toBeUndefined();
    expect(find(w, "site-live").ask).toBeUndefined(); // published: nothing to ask
  });
  it("leaves the sends unticked until a script says they went", () => {
    expect(find(w, "newsletter").done).toBe(false);
    expect(find(w, "party-notice").done).toBe(false);
  });
  it("puts each Instagram post on its own day with its time", () => {
    const thu = w.days.find((d: any) => d.dow === "Thu")!.items;
    expect(thu.map((i: any) => i.id)).toEqual(["ig-post:bats"]);
    expect(thu[0]).toMatchObject({ time: "5:00 PM", done: true, detail: "@ijamsnaturecenter · tagged in image" });
    expect(find(w, "ig-post:paddle").done).toBe(false);
  });
  it("shows a dropped post as skipped and a dead one as failed", () => {
    expect(find(w, "ig-post:gone").state).toBe("skipped");
    expect(find(w, "ig-post:broke")).toMatchObject({ state: "failed", detail: "failed after 4 tries" });
  });
  it("gives Claude one line per venue, with the deadline, and asks once to send them", () => {
    expect(find(w, "venue-sent:kerns")).toMatchObject({ who: "Claude", done: false, due: "2026-09-26", detail: "send by Sat Sep 26 · to events@kernsbakery.com" });
    expect(find(w, "venue-sent:puckers").detail).toBe("send by Sun Sep 27 · no email yet — Claude is finding one (@puckersknoxville)");
    expect(find(w, "venue-send")).toMatchObject({
      who: "Claude", kind: "mark", done: false, due: "2026-09-26",
      ask: "Send the first note to Kern's Food Hall from andy@note15.com? Tick to say yes.",
    }); // Puckers has no address, so it isn't in the ask
    expect(find(w, "venue-sent:old")).toBeUndefined(); // superseded drafts are gone
    expect(find(w, "venue-drafts")).toMatchObject({ done: true, detail: "2 of 2 in andy@note15.com" });
  });
  it("says there was nobody to auto-mail rather than showing a failure", () => {
    expect(find(w, "venue-auto")).toMatchObject({ done: false, state: "na" });
  });
});

describe("deriveWeek — venue notes as they move", () => {
  it("ticks a venue once it has been introduced this week", () => {
    const w = deriveWeek(facts({ venues: [{ key: "kerns", name: "Kern's Food Hall", introduced: "2026-09-24", to: "events@kernsbakery.com" }, { key: "puckers", name: "Puckers Sports Grill", introduced: null, to: null }] }));
    expect(find(w, "venue-sent:kerns")).toMatchObject({ done: true, detail: "sent Thu Sep 24 · to events@kernsbakery.com" });
  });
  it("marks a note missed once its event has passed unsent", () => {
    const w = deriveWeek(facts({ now: at("2026-09-27T09:00:00-04:00") }));
    expect(find(w, "venue-sent:kerns")).toMatchObject({ done: false, state: "missed", detail: "event passed Sat Sep 26 · to events@kernsbakery.com" });
    expect(find(w, "venue-sent:puckers").state).toBeUndefined(); // Sunday's is still live
  });
  it("counts automatic sends for venues introduced before this week", () => {
    const venues = [{ key: "kerns", name: "Kern's Food Hall", introduced: "2026-09-10", to: "events@kernsbakery.com" }, { key: "earls", name: "Earl's", introduced: "2026-09-12", to: "info@earlsknox.com" }];
    const half = deriveWeek(facts({ venues, venueDrafts: {}, venueLog: { kerns: { at: "2026-09-23T16:00:00Z" } } }));
    expect(find(half, "venue-auto")).toMatchObject({ done: false, detail: "1 of 2 sent · Kern's Food Hall, Earl's" });
    const all = deriveWeek(facts({ venues, venueDrafts: {}, venueLog: { kerns: {}, earls: {} } }));
    expect(find(all, "venue-auto").done).toBe(true);
    expect(find(all, "venue-drafts")).toMatchObject({ state: "na", detail: "nobody new this week" });
  });
});

describe("deriveWeek — before the publish", () => {
  it("a week with nothing yet shows the whole plan, unticked", () => {
    const w = deriveWeek({ week: "2026-09-30", now: at("2026-09-28T08:00:00-04:00"), episode: null, draft: null, expectedNumber: 16, hasAudio: false, igAssets: 0, queue: null, nightlife: { updated: "2026-09-22", weekend: "Sep 24–27" }, reviews: ["2026-09-21"], venues: [], venueLog: {}, venueDrafts: null });
    expect(w).toMatchObject({ stage: "not-started", number: 16, slug: null });
    expect(w.days.flatMap((d: any) => d.items).filter((i: any) => i.done)).toEqual([]);
    expect(find(w, "party-plan").detail).toBe("still showing Sep 24–27"); // last week's, and it says so
    expect(find(w, "site-live")).toMatchObject({ detail: "" });
    expect(find(w, "site-live").ask).toBeUndefined(); // nothing to publish yet, so nothing to ask
  });
  it("a drafted week ticks Tuesday and asks to publish", () => {
    const draft = { ...episode, slug: "2026-09-30", date: "2026-09-30", number: 16, shortDate: "Oct 1–4" };
    const w = deriveWeek({ week: "2026-09-30", now: at("2026-09-29T15:00:00-04:00"), episode: null, draft, hasAudio: true, igAssets: 0, queue: null, nightlife: { updated: "2026-09-29", weekend: "Oct 1–4" }, reviews: [], venues: [], venueLog: {}, venueDrafts: null });
    expect(w.stage).toBe("draft");
    expect(find(w, "draft").done).toBe(true);
    expect(find(w, "party-plan").done).toBe(true);
    expect(find(w, "party-live").done).toBe(false); // refreshed, but not live until the publish
    expect(find(w, "site-live")).toMatchObject({ done: false, detail: "draft at soknoear.com/next", ask: "Publish No. 16? Say “run it”." });
    expect(find(w, "research").done).toBe(false); // needs its mark
  });
  it("flags a stale party plan by naming what it still shows", () => {
    const draft = { ...episode, slug: "2026-09-30", shortDate: "Oct 1–4" };
    const w = deriveWeek({ week: "2026-09-30", episode: null, draft, hasAudio: false, igAssets: 0, queue: null, nightlife: { weekend: "Sep 24–27" }, reviews: [], venues: [], venueLog: {}, venueDrafts: null });
    expect(find(w, "party-plan")).toMatchObject({ done: false, detail: "still showing Sep 24–27" });
  });
});

describe("mergeMarks", () => {
  const snap = deriveWeek(facts());
  const now = at("2026-09-25T12:00:00-04:00");

  it("a mark ticks a box the files can't prove", () => {
    const w = mergeMarks(snap, [{ task: "newsletter", done: 1, note: "sent 23 of 23", by: "pipeline", at: "2026-09-23T16:00:00Z" }], now);
    expect(find(w, "newsletter")).toMatchObject({ done: true, state: "done", detail: "sent 23 of 23", markedBy: "pipeline", locked: false });
  });
  it("a note without a tick shows, and the box stays open", () => {
    const w = mergeMarks(snap, [{ task: "newsletter", done: 0, note: "preview sent to Andy" }], now);
    expect(find(w, "newsletter")).toMatchObject({ done: false, state: "late" });
  });
  it("evidence can't be un-ticked", () => {
    const w = mergeMarks(snap, [{ task: "site-live", done: 0 }], now);
    expect(find(w, "site-live")).toMatchObject({ done: true, locked: true });
  });
  it("calls an undone task late once its day has passed, todo before", () => {
    const w = mergeMarks(snap, [], now); // Friday
    expect(find(w, "publish-check").state).toBe("late"); // Wednesday's
    expect(find(w, "ig-post:paddle").state).toBe("todo"); // Saturday's
  });
  it("judges a task with its own deadline by that deadline", () => {
    const sunday = at("2026-09-27T09:00:00-04:00");
    const w = mergeMarks(deriveWeek(facts({ now: sunday })), [], sunday);
    expect(find(w, "venue-sent:puckers")).toMatchObject({ state: "todo", dueToday: true }); // send by Sunday, and it is Sunday
    expect(find(w, "venue-sent:kerns")).toMatchObject({ state: "missed", dueToday: false }); // Saturday's is gone
    const friday = mergeMarks(snap, [], now);
    expect(find(friday, "venue-sent:kerns")).toMatchObject({ state: "todo", dueToday: false }); // handed out Wednesday, due Saturday
  });
  it("knows which day is today", () => {
    expect(mergeMarks(snap, [], now).days.filter((d: any) => d.isToday).map((d: any) => d.dow)).toEqual(["Fri"]);
  });
  it("lists only what Claude needs Andy's yes for — the list sends are Claude's", () => {
    const w = mergeMarks(snap, [], now);
    expect(w.asks.map((i: any) => i.id)).toEqual(["venue-send"]);
  });
  it("a tick on the ask is the yes, and it leaves the list", () => {
    const w = mergeMarks(snap, [{ task: "venue-send", done: 1, by: "andy" }], now);
    expect(w.asks).toEqual([]);
    expect(find(w, "venue-send")).toMatchObject({ done: true, markedBy: "andy" });
  });
  it("stops asking once the only mailable note's event has passed", () => {
    const sunday = at("2026-09-27T09:00:00-04:00");
    const w = mergeMarks(deriveWeek(facts({ now: sunday })), [], sunday);
    expect(find(w, "venue-send").state).toBe("na");
    expect(w.asks).toEqual([]);
  });
  it("counts per channel, leaving out skipped and not-applicable", () => {
    const w = mergeMarks(snap, [], now);
    const ig = w.channels.find((c: any) => c.key === "instagram");
    expect(ig).toMatchObject({ done: 5, total: 7, trouble: 1 }); // review, art, queue, 2 posted · pending + failed · stale left out
    expect(w.channels.find((c: any) => c.key === "venues")).toMatchObject({ done: 1, total: 4 }); // drafts, the ask, two notes · venue-auto is n/a
  });
});
