import { describe, it, expect } from "vitest";
import { resolveVenues, planNotifications, renderMessage, upcomingStories, lastEventDay, SIGNATURE } from "../scripts/venue-notify-lib.mjs";

const contacts: Record<string, any> = {
  ijams: { name: "Ijams Nature Center", match: ["Ijams"], instagram: "@ijamsnaturecenter", email: "info@ijams.org", introduced: null },
  kerns: { name: "Kern's Food Hall", match: ["Kern's", "Kerns"], instagram: "@kernsknox", email: "hello@kerns.example", introduced: "2026-09-24" },
  earls: { name: "Earl's", match: ["Earl's"], instagram: "@earlsknoxville", email: null, introduced: "2026-09-24" },
  puckers: { name: "Puckers Sports Grill", match: ["Puckers"], instagram: "@puckersknoxville", email: "team@puckers.example", people: [{ name: "Sam Example", role: "Owner" }], introduced: "2026-09-24" },
};

const episode = {
  slug: "2026-09-16", date: "2026-09-16", number: 14, shortDate: "Sep 17–20",
  feature: { id: "sevier-day", title: "Sevier Day at Marble Springs", facts: [{ label: "Where", value: "Marble Springs State Historic Site" }] },
  stories: [
    { id: "lotr-lawn", title: "LOTR on the Ijams lawn", social: { igTags: ["ijams"] }, facts: [{ label: "Where", value: "Ijams Park" }] },
    { id: "caving-trip", title: "A guided caving trip", social: { igTags: ["ijams"] } },
    { id: "specials-board", title: "The specials board at Earl's", facts: [{ label: "Where", value: "Earl's, 610 Waterfront Dr" }] },
    { id: "puckers-titans", title: "Brunch through kickoff", social: { igTags: ["@puckersknoxville"] } },
    { id: "kerns-rooftop", title: "Rooftop night", facts: [{ label: "Venue", value: "The rooftop at Kern's" }] },
  ],
};

describe("resolveVenues", () => {
  const { venues, unresolved } = resolveVenues(episode, contacts);

  it("groups stories under the venue they tag", () => {
    expect(venues.get("ijams")!.stories.map((s: any) => s.id)).toEqual(["lotr-lawn", "caving-trip"]);
  });
  it("accepts a handle in igTags, not just a key", () => {
    expect(venues.get("puckers")!.stories[0].id).toBe("puckers-titans");
  });
  it("falls back to matching the Where/Venue fact when a story was never tagged", () => {
    expect(venues.get("earls")!.stories[0].id).toBe("specials-board");
    expect(venues.get("kerns")!.stories[0].id).toBe("kerns-rooftop");
  });
  it("reports a venue nobody has a contact for", () => {
    expect(unresolved).toEqual([{ id: "sevier-day", where: "Marble Springs State Historic Site" }]);
  });
});

describe("planNotifications", () => {
  const { venues } = resolveVenues(episode, contacts);

  it("drafts a first contact for a venue that has not been introduced, even with an email on file", () => {
    const plan = planNotifications(venues, contacts);
    expect(plan.find((p) => p.key === "ijams")!.action).toBe("draft");
  });
  it("sends automatically once introduced and an email is on file", () => {
    const plan = planNotifications(venues, contacts);
    expect(plan.find((p) => p.key === "kerns")!.action).toBe("send");
    expect(plan.find((p) => p.key === "puckers")!.action).toBe("send");
  });
  it("flags an introduced venue with nothing to send to", () => {
    expect(planNotifications(venues, contacts).find((p) => p.key === "earls")!.action).toBe("no-email");
  });
  it("never sends twice for the same episode", () => {
    const plan = planNotifications(venues, contacts, { kerns: { at: "2026-09-16T17:00:00Z" } });
    expect(plan.find((p) => p.key === "kerns")!.action).toBe("done");
  });
  it("prefers an explicit `to` over the general inbox", () => {
    const c = { ...contacts, kerns: { ...contacts.kerns, to: "events@kerns.example" } };
    expect(planNotifications(venues, c).find((p) => p.key === "kerns")!.to).toBe("events@kerns.example");
  });
});

describe("renderMessage", () => {
  const { venues } = resolveVenues(episode, contacts);
  const now = new Date("2026-09-16T13:00:00-04:00").getTime();

  it("links every story and signs as Andy", () => {
    const { text, html, subject } = renderMessage({ episode, name: "Ijams Nature Center", contact: contacts.ijams, stories: venues.get("ijams")!.stories , now });
    expect(subject).toBe("You're in this week's South Knoxville Ear (No. 14)");
    expect(text).toContain("https://soknoear.com/2026-09-16/lotr-lawn");
    expect(text).toContain("https://soknoear.com/2026-09-16/caving-trip");
    expect(text).toContain("The week's picks go out on Instagram over the weekend from @soknoear, tagging @ijamsnaturecenter, too.");
    expect(text.endsWith(SIGNATURE)).toBe(true);
    expect(html).toContain('href="https://soknoear.com/2026-09-16/lotr-lawn"');
  });
  it("addresses a named person by first name", () => {
    const { text } = renderMessage({ episode, name: "Puckers Sports Grill", contact: contacts.puckers, stories: venues.get("puckers")!.stories , now });
    expect(text.startsWith("Hi Sam,")).toBe(true);
  });
  it("has a first-contact variant that introduces the Ear", () => {
    const { text, subject } = renderMessage({ episode, name: "Ijams Nature Center", contact: contacts.ijams, stories: venues.get("ijams")!.stories, first: true , now });
    expect(subject).toBe("Ijams Nature Center is in this week's South Knoxville Ear");
    expect(text).toContain("I edit The South Knoxville Ear");
    expect(text).toContain("2 stories about you");
  });
  it("singularises one story", () => {
    const { text } = renderMessage({ episode, name: "Earl's", contact: contacts.earls, stories: venues.get("earls")!.stories , now });
    expect(text).toContain("The story:");
    expect(text).toContain("It also goes out on Instagram over the weekend");
  });
  it("switches to past tense once the drip week is over", () => {
    const late = new Date("2026-09-23T12:00:00-04:00").getTime();
    const { text } = renderMessage({ episode: { ...episode, date: "2026-09-16" }, name: "Earl's", contact: contacts.earls, stories: venues.get("earls")!.stories, now: late });
    expect(text).toContain("It went out on Instagram from @soknoear, tagging @earlsknoxville, too.");
  });
});

describe("upcomingStories", () => {
  // Episode dated Wed Sep 23; a Friday-morning run in Knoxville.
  const ep = { date: "2026-09-23" };
  const fri = Date.parse("2026-09-25T13:00:00Z");
  const stories = [
    { id: "thu", days: ["Thu"] },
    { id: "sat", days: ["Sat"] },
    { id: "thu-sun", days: ["Thu", "Sun"] },
    { id: "undated" },
  ];

  it("counts days forward from the episode's Wednesday", () => {
    expect(lastEventDay(ep, { days: ["Wed"] })).toBe("2026-09-23");
    expect(lastEventDay(ep, { days: ["Thu", "Sun"] })).toBe("2026-09-27");
    expect(lastEventDay(ep, {})).toBe("2026-09-27");
  });
  it("drops stories whose events are over and keeps the rest", () => {
    expect(upcomingStories(ep, stories, fri).map((s) => s.id)).toEqual(["sat", "thu-sun", "undated"]);
  });
  it("keeps an event on the day it happens, in Knoxville time", () => {
    // 11:30 PM Thursday in Knoxville is already Friday in UTC.
    expect(upcomingStories(ep, [{ id: "thu", days: ["Thu"] }], Date.parse("2026-09-25T03:30:00Z"))).toHaveLength(1);
  });
});
