import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildNewsletter, buildSubject, featureWhen, headline, cardHref, resolveHero } from "../scripts/newsletter-template.mjs";

const load = (slug: string) =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../content/episodes/${slug}.json`), "utf8"));

const current = load("2026-08-19"); // Aug 20-23
const previous = load("2026-08-13"); // Aug 13-16

describe("headline", () => {
  it("keeps the hook and drops the subtitle", () => {
    expect(headline("The last weekend of Mimosas: one more brunch before the sign comes down"))
      .toBe("The last weekend of Mimosas");
    expect(headline("Kerbela gets its answer")).toBe("Kerbela gets its answer");
  });
});

describe("cardHref", () => {
  it("turns an in-page anchor into the story's own page", () => {
    expect(cardHref("#kerns-weekend", "2026-08-19", "https://x.com"))
      .toBe("https://x.com/2026-08-19/kerns-weekend");
  });
  it("leaves absolute links alone and falls back to home", () => {
    expect(cardHref("https://a.test/x", "s", "https://x.com")).toBe("https://a.test/x");
    expect(cardHref(undefined, "s", "https://x.com")).toBe("https://x.com");
  });
});

describe("resolveHero", () => {
  it("prefers an _email companion when one exists", () => {
    const exists = (p: string) => p === "/assets/spots/bird_banding_email.jpg";
    expect(resolveHero("/assets/spots/bird_banding.png", exists))
      .toBe("/assets/spots/bird_banding_email.jpg");
  });
  it("falls back to the feature art", () => {
    expect(resolveHero("/assets/spots/mimosas.jpg")).toBe("/assets/spots/mimosas.jpg");
  });
});

describe("buildSubject", () => {
  it("derives a fresh subject per episode", () => {
    const a = buildSubject(current);
    const b = buildSubject(previous);
    expect(a).not.toBe(b);
    expect(a).toContain("Mimosas");
    expect(a.length).toBeLessThanOrEqual(80);
  });
  it("honours an explicit override", () => {
    expect(buildSubject({ ...current, newsletter: { subject: "Hand-written" } })).toBe("Hand-written");
  });
  it("dates a one-day feature by its own day, never the whole weekend", () => {
    // No. 16 went to preview as '"Carrie" outdoors … · Oct 1–4', which read as four nights of Carrie.
    const base = { shortDate: "Oct 1–4", scanner: [{ title: "A lead too long to pair with anything else on the list, by design", href: "#f" }] };
    const friday = { ...base, feature: { id: "f", title: "x", days: ["Fri"], event: { startDate: "2026-10-02T18:00:00-04:00" } } };
    expect(featureWhen(friday)).toBe("Friday, Oct 2");
    expect(buildSubject(friday)).toMatch(/ · Friday, Oct 2$/);
    expect(buildSubject(friday)).not.toContain("Oct 1–4");
    const undated = { ...base, feature: { id: "f", title: "x", days: ["Sun"] } };
    expect(featureWhen(undated)).toBe("Sunday");
    const allWeekend = { ...base, feature: { id: "f", title: "x", days: ["Thu", "Fri", "Sat", "Sun"] } };
    expect(featureWhen(allWeekend)).toBe("Oct 1–4");
  });
});

describe("buildNewsletter", () => {
  const built = buildNewsletter(current, { home: "https://soknoear.com" });

  it("carries this episode's feature and date", () => {
    expect(built.html).toContain("The last weekend of Mimosas");
    expect(built.text).toContain("The last weekend of Mimosas");
    expect(built.html).toContain("Thu–Sun, Aug 20–23, 2026");
  });

  it("never leaks the previous episode's copy — the bug this replaced", () => {
    for (const stale of ["hummingbird", "Hummingbird", "bird_banding", "Ted Lasso", "All Play Live", "02:52"]) {
      expect(built.html).not.toContain(stale);
      expect(built.text).not.toContain(stale);
    }
  });

  it("lists every non-feature scanner card, linked to its own page", () => {
    const others = current.scanner.filter((c: { href: string }) => c.href !== `#${current.feature.id}`);
    expect(others.length).toBeGreaterThan(0);
    for (const c of others) {
      expect(built.text).toContain(c.blurb);
      expect(built.html).toContain(`https://soknoear.com/2026-08-19/${c.href.slice(1)}`);
    }
  });

  it("quotes the real audio duration", () => {
    expect(built.text).toContain("4:09 audio briefing");
    expect(built.text).not.toContain("04:09");
  });

  it("escapes HTML rather than injecting it", () => {
    const evil = JSON.parse(JSON.stringify(current));
    evil.feature.deck = 'Bad <script>alert("x")</script>';
    const out = buildNewsletter(evil);
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("builds a different email for a different episode, from the same code", () => {
    const old = buildNewsletter(previous, { home: "https://soknoear.com" });
    expect(old.subject).not.toBe(built.subject);
    expect(old.html).toContain("Aug 13–16");
    expect(old.html).not.toContain("Aug 20–23");
  });

  it("survives an episode with no audio and no scanner extras", () => {
    const bare = { ...current, scanner: current.scanner.slice(0, 1), sidebar: { ...current.sidebar, audio: undefined } };
    const out = buildNewsletter(bare);
    expect(out.html).toContain("Read this weekend&#x27;s Ear".replace("&#x27;", "'"));
    expect(out.text).not.toContain("audio briefing");
  });
});
