// Does the banner earn a reshare on its own?
//
// When a venue reshares one of our feed posts to their story, the caption does not
// travel — only the image, plus a small @soknoear chip. So tagging @ijamsnaturecenter
// in the caption does nothing for a reshare: every fact that earns it has to be ON
// the artwork. Eleven of the first fifty-two banners named a venue in their tags and
// never once named it in the band; the specials board did it on all six of its runs.
//
// Two things a card needs to stand alone:
//   · the venue it tags, named in the band (either line — the card travels whole)
//   · for a dated item, the day or the time
//
// These are warnings, not failures. A handful of legitimate exceptions exist — a
// multi-venue roundup, an org co-presenter tagged alongside the real venue — so a
// story can opt out with social.igBannerSkipCheck.
//
// See docs/ig-reviews/2026-09-07.md.

/** Generic tails that are never how anyone refers to the place out loud. */
const TAIL =
  /(\s*\([^)]*\))|(\s+(Nature Center|Beer Market|Sports Grill|Food Hall|Sporting Club|Brewing Company|Brewing|Company|Foundation|Cantina|Knoxville|Knox))+$/i;

const DAY = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\b|\b(today|tonight|weekend|daily)\b/i;
const TIME =
  /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b|\b(noon|midnight|o.clock|morning|evening|night|dark|dawn|dusk|every day)\b/i;

/**
 * The ways we might reasonably write a venue's name on a card: the registry name,
 * and the same name with its generic tail cut off ("Ijams Nature Center" → "Ijams",
 * which is what the band and the house style actually say). Never returns empty.
 *
 * @param {string} name registry display name
 * @returns {string[]} longest first
 */
export function venueAliases(name) {
  const out = [];
  const add = (v) => { const t = v.trim(); if (t && !out.includes(t)) out.push(t); };
  add(name);
  let s = name.trim();
  for (let i = 0; i < 4; i++) {
    const next = s.replace(TAIL, "").trim();
    if (!next || next === s) break;
    s = next;
    add(s);
  }
  if (/^the\s+/i.test(s)) add(s.replace(/^the\s+/i, ""));
  return out;
}

/**
 * igTags are written as registry keys ("ijams"), but a handle may be used instead.
 * Accept either, the same way ig-queue.mjs resolveTags does.
 */
export function resolveVenue(tag, handles) {
  const key = String(tag).replace(/^@/, "").toLowerCase();
  for (const [k, v] of Object.entries(handles ?? {})) {
    if (k.toLowerCase() === key) return v;
    if (String(v?.handle ?? "").replace(/^@/, "").toLowerCase() === key) return v;
  }
  return null;
}

/**
 * @param {object} a
 * @param {string[]} a.lines      social.igBanner
 * @param {string[]} a.tags       social.igTags
 * @param {boolean}  a.dated      does this story sit on a day? (news stories do not)
 * @param {object}   a.handles    content/ig-handles.json → handles
 * @param {boolean} [a.skip]      social.igBannerSkipCheck
 * @returns {Array<{code: string, message: string}>}
 */
export function checkBanner({ lines, tags, dated, handles, skip = false }) {
  if (skip || !lines?.length) return [];
  const text = lines.join(" ");
  const problems = [];

  const known = (tags ?? []).map((t) => resolveVenue(t, handles)).filter(Boolean);
  if (known.length) {
    const named = known.some((v) =>
      venueAliases(v.name).some((a) => text.toLowerCase().includes(a.toLowerCase()))
    );
    if (!named) {
      problems.push({
        code: "no-venue",
        message: `banner never names ${known.map((v) => venueAliases(v.name).at(-1)).join(" or ")} — a reshare carries the image without the caption`,
      });
    }
  }

  if (dated && !DAY.test(text) && !TIME.test(text)) {
    problems.push({ code: "no-when", message: "banner carries no day or time — the card can't be acted on alone" });
  }
  return problems;
}
