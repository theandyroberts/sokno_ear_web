import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { checkResearch, districtTable, ACT_GATE_FROM } from "../scripts/research-lib.mjs";

const registry = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../content/sources.json"), "utf8"));
const story = (id: string, label: string) => ({ id, label });
const allChecked = () =>
  Object.fromEntries(registry.sources.filter((s: any) => s.weekly !== false).map((s: any) => [s.key, { how: s.instagram ? "instagram" : "web", found: 1 }]));
const balanced = {
  feature: story("f", "Old Sevier"),
  stories: [story("a", "Old Sevier"), story("b", "Old Sevier"), story("c", "Ijams Nature Center"), story("d", "Kern's"), story("e", "Suttree Landing")],
};
const hubLead = { source: "old-sevier-district", what: "First Friday", story: "a" };

describe("the source list", () => {
  it("covers Old Sevier venue by venue, with the district's own account as the hub", () => {
    const keys = registry.sources.map((s: any) => s.key);
    for (const k of ["old-sevier-district", "the-808", "alliance", "hi-wire", "fly-by-night", "printshop", "trailhead", "pink-cactus", "mighty-mud", "sokno-sourdough", "borderland", "old-sevier-market"]) {
      expect(keys).toContain(k);
    }
    expect(registry.sources.find((s: any) => s.hub).instagram).toBe("oldsevierdistrict");
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("checkResearch", () => {
  it("passes a week that read everything and is spread across the beat", () => {
    const r = checkResearch(registry, { checked: allChecked(), leads: [hubLead] }, balanced);
    expect(r.errors).toEqual([]);
  });
  it("fails when there is no log at all", () => {
    expect(checkResearch(registry, null, balanced).errors[0]).toMatch(/no research log/);
  });
  it("fails when a source was skipped, and when only a venue's website was read", () => {
    const checked = allChecked();
    delete checked["the-808"];
    checked["alliance"] = { how: "web", found: 0 };
    const r = checkResearch(registry, { checked, leads: [hubLead] }, balanced);
    expect(r.errors.some((e) => /not checked: The 808/.test(e))).toBe(true);
    expect(r.errors.some((e) => /Alliance Brewing: only the website/.test(e))).toBe(true);
  });
  it("an unreadable venue is a warning, an unreadable hub is a failure", () => {
    const checked = allChecked();
    checked["hi-wire"] = { unreadable: "age-gated" };
    expect(checkResearch(registry, { checked, leads: [hubLead] }, balanced).errors).toEqual([]);
    checked["old-sevier-district"] = { unreadable: "login wall" };
    expect(checkResearch(registry, { checked, leads: [] }, balanced).errors.some((e) => /hub has to be read/.test(e))).toBe(true);
  });
  it("fails a lead that went nowhere, or points at a story that isn't there", () => {
    const leads = [hubLead, { source: "the-808", what: "Opening night" }, { source: "pink-cactus", what: "Knoxferno", story: "nope" }, { source: "printshop", what: "D&D night", skipped: "Tuesday, outside the weekend" }];
    const r = checkResearch(registry, { checked: allChecked(), leads }, balanced);
    expect(r.errors).toHaveLength(2);
  });
  it("fails No. 16's shape: nine Ijams Nature Center stories and one from Old Sevier", () => {
    const no16 = { feature: story("f", "Ijams Nature Center"), stories: [...Array.from({ length: 8 }, (_, i) => story(`i${i}`, "Ijams Nature Center")), story("p", "Old Sevier"), story("k", "Kern's"), story("u", "Urban Wilderness"), story("e", "Suttree Landing")] };
    expect(districtTable(no16)["Ijams Nature Center"]).toBe(9);
    const r = checkResearch(registry, { checked: allChecked(), leads: [{ ...hubLead, story: "p" }] }, no16);
    expect(r.errors.some((e) => /9 Ijams Nature Center stories/.test(e))).toBe(true);
    expect(r.errors.some((e) => /Old Sevier has 1 stories/.test(e))).toBe(true);
  });
  it("a quiet Old Sevier week passes only with a reason written down", () => {
    const thin = { feature: story("f", "Kern's"), stories: [story("a", "Old Sevier"), story("c", "Ijams Nature Center"), story("e", "Suttree Landing")] };
    const base = { checked: allChecked(), leads: [hubLead] };
    expect(checkResearch(registry, base, thin).errors).toHaveLength(1);
    expect(checkResearch(registry, { ...base, quiet: { "Old Sevier": "district feed had only the gameday guide" } }, thin).errors).toEqual([]);
  });
});

describe("the act in the picture (from No. 19)", () => {
  const handles = { "fly-by-night": {}, ahun: {} };
  const withActs = {
    date: ACT_GATE_FROM,
    feature: { id: "f", label: "Old Sevier", social: { igTags: ["fly-by-night", "ahun"], igAct: { key: "ahun" } } },
    stories: [
      { id: "a", label: "Old Sevier", social: { igTags: ["fly-by-night"], igAct: { none: "a trivia night, no act" } } },
      { id: "b", label: "Old Sevier", social: { igTags: ["printshop"], igAct: { none: "a social run" } } },
      { id: "c", label: "Ijams Nature Center", social: { igAct: { none: "a guided walk" } } },
      { id: "d", label: "Kern's", social: { igAct: { none: "a market" } } },
      { id: "e", label: "Suttree Landing", social: { igAct: { none: "a park clean-up" } } },
    ],
  };
  const log = { checked: allChecked(), leads: [hubLead] };

  it("passes when every story names its act or says there is none", () => {
    expect(checkResearch(registry, log, withActs, handles).errors).toEqual([]);
  });
  it("refuses a story that says nothing about its act", () => {
    const ep = { ...withActs, stories: [...withActs.stories, { id: "x", label: "Old Sevier", social: { igTags: ["fly-by-night"] } }] };
    expect(checkResearch(registry, log, ep, handles).errors.join("\n")).toMatch(/x: no social.igAct/);
  });
  it("refuses an act that the picture would not tag, or that the registry does not know", () => {
    const untagged = { ...withActs, feature: { ...withActs.feature, social: { igTags: ["fly-by-night"], igAct: { key: "ahun" } } } };
    expect(checkResearch(registry, log, untagged, handles).errors.join("\n")).toMatch(/not in social.igTags/);
    const unknown = { ...withActs, feature: { ...withActs.feature, social: { igTags: ["fly-by-night", "nobody"], igAct: { key: "nobody" } } } };
    expect(checkResearch(registry, log, unknown, handles).errors.join("\n")).toMatch(/not in content\/ig-handles.json/);
  });
  it("leaves the weeks before the gate alone", () => {
    const old = { ...balanced, date: "2026-10-14" };
    expect(checkResearch(registry, log, old, handles).errors).toEqual([]);
  });
});
