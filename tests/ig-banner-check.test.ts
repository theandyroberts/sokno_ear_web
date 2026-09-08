import { describe, it, expect } from "vitest";
import { venueAliases, resolveVenue, checkBanner } from "../scripts/ig-banner-check.mjs";

const HANDLES = {
  ijams: { handle: "@ijamsnaturecenter", name: "Ijams Nature Center" },
  kerns: { handle: "@kernsknox", name: "Kern's" },
  hiwire: { handle: "@hiwirebrewing_knx", name: "Hi-Wire Brewing Knoxville" },
  earls: { handle: "@earlsknoxville", name: "Earl's Knoxville" },
  trailhead: { handle: "@trailheadbeer", name: "Trailhead Beer Market" },
  puckers: { handle: "@puckersknoxville", name: "Puckers Sports Grill Knoxville" },
  "pink-cactus": { handle: "@thepinkcactusknox", name: "The Pink Cactus" },
  mimosas: { handle: "@mimosasknoxville", name: "Mimosas (Kennedy Concepts)" },
};

describe("venueAliases", () => {
  it("keeps the registry name and strips the generic tail off it", () => {
    expect(venueAliases("Ijams Nature Center")).toEqual(
      expect.arrayContaining(["Ijams Nature Center", "Ijams"])
    );
    expect(venueAliases("Hi-Wire Brewing Knoxville")).toContain("Hi-Wire");
    expect(venueAliases("Trailhead Beer Market")).toContain("Trailhead");
    expect(venueAliases("Puckers Sports Grill Knoxville")).toContain("Puckers");
  });

  it("leaves a name that is already short alone", () => {
    expect(venueAliases("Kern's")).toEqual(["Kern's"]);
  });

  it("drops a parenthetical qualifier", () => {
    expect(venueAliases("Mimosas (Kennedy Concepts)")).toContain("Mimosas");
  });

  it("offers the bare form of a leading 'The'", () => {
    expect(venueAliases("The Pink Cactus")).toEqual(
      expect.arrayContaining(["The Pink Cactus", "Pink Cactus"])
    );
  });

  it("never strips a name down to nothing", () => {
    for (const n of ["Knoxville", "Brewing", "Kern's", "WDVX"]) {
      expect(venueAliases(n).every((a) => a.length > 0)).toBe(true);
      expect(venueAliases(n).length).toBeGreaterThan(0);
    }
  });
});

describe("resolveVenue", () => {
  it("resolves a registry key, which is how igTags are actually written", () => {
    expect(resolveVenue("ijams", HANDLES)?.name).toBe("Ijams Nature Center");
  });
  it("also resolves a bare or @-prefixed handle", () => {
    expect(resolveVenue("@ijamsnaturecenter", HANDLES)?.name).toBe("Ijams Nature Center");
    expect(resolveVenue("ijamsnaturecenter", HANDLES)?.name).toBe("Ijams Nature Center");
  });
  it("returns null for something not in the registry", () => {
    expect(resolveVenue("not-a-venue", HANDLES)).toBeNull();
  });
});

describe("checkBanner", () => {
  const run = (lines: string[], tags: string[], dated = true, story = {}) =>
    checkBanner({ lines, tags, dated, handles: HANDLES, ...story }).map((p) => p.code);

  it("passes a card that names the venue and says when", () => {
    expect(run(["Pint night at Hi-Wire", "Thursday, all-day happy hour too"], ["hiwire"])).toEqual([]);
  });

  it("flags the real Playscape card, which never says Ijams", () => {
    expect(run(["Free storytime Saturday", "Ten to noon, in the shade"], ["ijams"])).toEqual(["no-venue"]);
  });

  it("flags the real specials board, which never says Earl's", () => {
    expect(run(["The SoKno Specials Board", "A different deal every day"], ["earls"])).toContain("no-venue");
  });

  it("accepts the venue on either line — the card travels whole", () => {
    expect(run(["Free trivia Thursday", "Seven o'clock at Trailhead"], ["trailhead"])).toEqual([]);
  });

  it("accepts a short form and is case-insensitive", () => {
    expect(run(["Bats after dark Thursday", "ijams park, eight o'clock"], ["ijams"])).toEqual([]);
  });

  it("flags a dated card that never says which day", () => {
    expect(run(["Puckers' first game day", "The patio looks at the stadium"], ["puckers"])).toEqual(["no-when"]);
  });

  it("does not ask a news story for a day or time", () => {
    expect(run(["Kerbela: approved", "225 apartments and a public plaza"], [], false)).toEqual([]);
  });

  it("says nothing about a story with no tags — there is no venue to miss", () => {
    expect(run(["Sevier Ave Streetscape", "The deadline came and went"], [], false)).toEqual([]);
  });

  it("ignores a tag that is not in the registry rather than guessing", () => {
    expect(run(["Something happens Friday", "At eight"], ["not-a-venue"])).toEqual([]);
  });

  it("passes when any one of several tagged venues is named", () => {
    expect(run(["Hi-Wire & Alliance", "Emo drag Friday at eight"], ["hiwire", "alliance"])).toEqual([]);
  });

  it("honours an explicit opt-out for the genuine exceptions", () => {
    const out = checkBanner({
      lines: ["The SoKno Specials Board", "A different deal every day"],
      tags: ["earls"], dated: true, handles: HANDLES, skip: true,
    });
    expect(out).toEqual([]);
  });

  it("carries a human-readable message, not just a code", () => {
    const [p] = checkBanner({
      lines: ["Free storytime Saturday", "Ten to noon"], tags: ["ijams"], dated: true, handles: HANDLES,
    });
    expect(p.message).toMatch(/Ijams/);
  });
});
