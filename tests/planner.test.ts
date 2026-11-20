import { describe, it, expect } from "vitest";
import { catOf, nightDates, parsePlanParams, planQuery, lineup, shareText, buildFeatured, minutesOf, inTimeOrder, weekKey, freshPlan, type PlanOption, type PlannerData } from "@/lib/planner";
import { buildDirectory, buildMerryAll } from "@/lib/planner-data";
import { loadVenues } from "@/lib/venues";
import type { NightDay, NightItem } from "@/lib/nightlife";
import type { Episode } from "@/lib/schema";

const row = (id: string, cat: string, venue: string, href = `/2026-11-18/${id}`): NightItem =>
  ({ id, cat, venue, headline: id, time: "7:00 PM", href, brand: venue.split(" · ")[0], logo: null });
const empty = (): Record<NightDay, NightItem[]> => ({ Thu: [], Fri: [], Sat: [], Sun: [] });

describe("planner basics", () => {
  it("folds the nightlife icons into eat, drink and be merry", () => {
    expect(catOf("food")).toBe("eat");
    expect(catOf("drink")).toBe("drink");
    for (const c of ["music", "dance", "mic", "star", undefined]) expect(catOf(c)).toBe("merry");
  });
  it("orders times, untimed last", () => {
    expect(minutesOf("11:00 AM")).toBeLessThan(minutesOf("12:00 PM"));
    expect(minutesOf("12:00 PM")).toBeLessThan(minutesOf("7:00 PM"));
    expect(minutesOf(undefined)).toBeGreaterThan(minutesOf("11:59 PM"));
  });
  it("reads the weekend label into dates, and refuses a label that doesn't start on Thursday", () => {
    expect(nightDates("Nov 19–22", "2026-11-16")).toEqual({ Thu: "Thu, Nov 19", Fri: "Fri, Nov 20", Sat: "Sat, Nov 21", Sun: "Sun, Nov 22" });
    expect(nightDates("Oct 29–Nov 1", "2026-10-26").Sun).toBe("Sun, Nov 1");
    expect(nightDates("Dec 31–Jan 3", "2026-12-28").Fri).toBe("Fri, Jan 1");
    expect(nightDates("Nov 20–23", "2026-11-16")).toEqual({}); // Nov 20 2026 is a Friday
    expect(nightDates("whenever", "2026-11-16")).toEqual({});
  });
  it("stamps a plan link with its weekend, and a link from another week loses its picks", () => {
    expect(weekKey("Nov 19–22")).toBe("nov-19-22");
    expect(weekKey("Oct 29–Nov 1")).toBe("oct-29-nov-1");
    const q = planQuery({ day: "Fri", picks: { eat: "fri-dumplings" }, types: ["eat", "drink", "merry"] }, "nov-19-22");
    expect(q).toBe("day=Fri&eat=fri-dumplings&w=nov-19-22");
    expect(planQuery({ day: "Fri", picks: {}, types: ["eat", "drink", "merry"] }, "nov-19-22")).toBe("day=Fri"); // no picks, no stamp
    const data = { week: "nov-19-22" } as PlannerData;
    const parsed = parsePlanParams(Object.fromEntries(new URLSearchParams(q)));
    expect(freshPlan(parsed, data)).toEqual({ day: "Fri", picks: { eat: "fri-dumplings" }, week: "nov-19-22" });
    expect(freshPlan(parsed, { week: "nov-26-29" } as PlannerData)).toEqual({ day: "Fri" });
    expect(freshPlan({ day: "Fri", picks: { eat: "x" } }, data)).toEqual({ day: "Fri", picks: { eat: "x" } }); // unstamped: as is
  });
  it("round-trips a plan through the share link and ignores junk", () => {
    const q = planQuery({ day: "Sat", picks: { eat: "sat-burger", merry: "s:summoners" }, types: ["eat", "merry"] });
    const back = parsePlanParams(Object.fromEntries(new URLSearchParams(q)));
    expect(back).toEqual({ day: "Sat", picks: { eat: "sat-burger", merry: "s:summoners" }, types: ["eat", "merry"] });
    expect(planQuery({ day: "Fri", picks: { drink: "x" }, types: ["eat", "drink", "merry"] })).toBe("day=Fri&drink=x");
    expect(parsePlanParams({ day: "Mon", t: "nonsense" })).toEqual({});
  });
});

describe("planner lists", () => {
  const registry = loadVenues();

  it("show all lists the registry's eating spots, Kern's rooms, and new places on the plan — never closed ones", () => {
    const days = empty();
    days.Fri.push(row("fri-new", "food", "Brand New Diner · 1 Sevier Ave", "https://example.com"));
    const dir = buildDirectory(registry, days);
    const eat = dir.eat.map((o) => o.title);
    expect(eat).toContain("Angry Dumplings");
    expect(eat).toContain("Roni's Mac Bar");
    expect(eat).toContain("Brand New Diner");
    expect(eat).not.toContain("Mimosas");
    expect(dir.eat.find((o) => o.title === "Roni's Mac Bar")?.address).toBe("at Kern's");
    expect(dir.eat.find((o) => o.title === "Brand New Diner")?.address).toBe("1 Sevier Ave");
    expect(dir.drink.map((o) => o.title)).toContain("Trailhead Beer Market");
    expect(dir.drink.map((o) => o.title)).not.toContain("The 808"); // a stage, not a bar
    // alphabetical, "The" ignored
    const sorted = [...eat].sort((a, b) => a.replace(/^the /i, "").localeCompare(b.replace(/^the /i, ""), undefined, { sensitivity: "base" }));
    expect(eat.map((t) => t.toLowerCase())).toEqual(sorted.map((t) => t.toLowerCase()));
  });

  it("be merry's show all adds the night's stories, minus ones the plan files under eat or drink", () => {
    const days = empty();
    days.Fri.push(row("fri-808", "music", "The 808 · 808 Sevier Ave", "/2026-11-18/deadtronica-808"));
    days.Fri.push(row("fri-earls", "drink", "Earl's · 610 Waterfront Dr", "/2026-11-18/specials-board"));
    const story = (id: string, title: string, extra = {}) => ({
      id, label: "Old Sevier", labelColor: "rust", layout: "imageLeft", title, facts: [], body: [{ type: "paragraph", text: "x" }], days: ["Fri"], ...extra,
    });
    const episode = {
      slug: "2026-11-18", feature: story("pitch", "Pitch a Friend at Hi-Wire", { event: { startDate: "2026-11-20T19:00:00-05:00", locationName: "Hi-Wire Brewing" } }),
      stories: [story("deadtronica-808", "Deadtronica"), story("specials-board", "Specials"), story("sunday-only", "Sunday thing", { days: ["Sun"] })],
      scanner: [{ href: "#pitch", title: "Pitch a Friend" }],
    } as unknown as Episode;
    const featured = buildFeatured(days);
    const merry = buildMerryAll(featured, days, episode, registry).Fri;
    expect(merry.map((o) => o.id)).toEqual(["fri-808", "s:pitch"]); // 808 already carried; specials is drink; Sunday story is another night
    expect(merry[1]).toMatchObject({ title: "Pitch a Friend", time: "7:00 PM", brand: "Hi-Wire Brewing", href: "/2026-11-18/pitch" });
  });

  it("the game plan runs eat, drink, be merry and words it for the share", () => {
    const days = empty();
    days.Fri.push(row("a", "star", "Hi-Wire Brewing · 2020 Barber St"), row("b", "food", "Angry Dumplings · 1119 Sevier Ave"));
    const featured = buildFeatured(days);
    const data: PlannerData = { featured, directory: { eat: [], drink: [] }, merryAll: { ...{ Thu: [], Sat: [], Sun: [] }, Fri: featured.Fri.merry }, dates: {} };
    const plan = lineup(data, { day: "Fri", picks: { merry: "a", eat: "b", drink: "gone-stale" }, types: ["eat", "drink", "merry"] });
    expect(plan.map((p) => p.cat)).toEqual(["eat", "merry"]);
    expect(shareText("Friday", plan)).toBe("The Friday game plan in the Dirty South:\nEAT — 7:00 PM · Angry Dumplings: b\nBE MERRY — 7:00 PM · Hi-Wire Brewing: a");
  });

  it("runs the night in time order; untimed picks and ties keep eat, drink, be merry", () => {
    const p = (cat: "eat" | "drink" | "merry", time?: string) => ({ cat, option: { id: cat, cat, kind: time ? "featured" : "venue", title: cat, brand: cat, icon: "star", time } as PlanOption });
    const order = (plan: ReturnType<typeof p>[]) => inTimeOrder(plan).map((x) => x.cat);
    expect(order([p("eat", "6:00 PM"), p("drink", "4:00 PM"), p("merry", "7:00 PM")])).toEqual(["drink", "eat", "merry"]);
    expect(order([p("eat", "7:00 PM"), p("drink", "7:00 PM"), p("merry", "7:00 PM")])).toEqual(["eat", "drink", "merry"]);
    expect(order([p("eat"), p("drink"), p("merry")])).toEqual(["eat", "drink", "merry"]);
    // an untimed venue holds its slot while the timed picks trade places around it
    expect(order([p("eat", "9:00 PM"), p("drink"), p("merry", "5:00 PM")])).toEqual(["merry", "drink", "eat"]);
    expect(order([p("eat"), p("drink", "8:00 PM"), p("merry", "7:00 PM")])).toEqual(["eat", "merry", "drink"]);
  });
});
