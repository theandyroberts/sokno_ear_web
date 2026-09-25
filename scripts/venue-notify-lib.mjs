// The pure half of scripts/venue-notify.mjs: which venues an episode mentions, who
// gets a note this week, and what the note says. No I/O here, so tests can drive it.
//
// The rule (Andy, 2026-09-23): every venue the Ear covers gets told, every week.
// FIRST contact with a venue is a draft Andy sends himself, from his own account —
// a relationship starts with a person. Once `introduced` is set on the contact,
// the weekly note goes out automatically at publish.

export const SITE = "https://soknoear.com";
export const IG_PROFILE = "https://www.instagram.com/soknoear/";

export const SIGNATURE = [
  "Andy Roberts",
  "Editor, The South Knoxville Ear — South Knoxville Events & Rumors",
  "Note Fifteen Marketing",
  "soknoear.com · @soknoear",
].join("\n");

/**
 * Every venue an episode references, with the stories that reference it.
 * Primary signal is `social.igTags` (keys shared with content/ig-handles.json and
 * content/contacts.json). Fallback is the contact's `match` strings against the
 * story's Where/Venue facts and title — for stories that were never tagged.
 *
 * @returns {{ venues: Map<string, {key: string, stories: Array}>, unresolved: Array<{id: string, where: string}> }}
 */
export function resolveVenues(episode, contacts) {
  const stories = [episode.feature ? { ...episode.feature, __isFeature: true } : null, ...(episode.stories ?? [])].filter(Boolean);
  const venues = new Map();
  const unresolved = [];
  const add = (key, story) => {
    if (!venues.has(key)) venues.set(key, { key, stories: [] });
    const v = venues.get(key);
    if (!v.stories.some((s) => s.id === story.id)) v.stories.push(story);
  };

  for (const s of stories) {
    const keys = new Set();
    for (const t of s.social?.igTags ?? []) {
      const k = String(t).replace(/^@/, "").toLowerCase();
      if (contacts[k]) keys.add(k);
      else {
        const byHandle = Object.entries(contacts).find(([, c]) => String(c.instagram ?? "").replace(/^@/, "").toLowerCase() === k);
        if (byHandle) keys.add(byHandle[0]);
      }
    }
    const where = (s.facts ?? []).filter((f) => /^(where|venue)$/i.test(f.label ?? "")).map((f) => f.value).join(" · ");
    const hay = `${where} ${s.title ?? ""}`.toLowerCase();
    for (const [k, c] of Object.entries(contacts)) {
      if (keys.has(k)) continue;
      if ((c.match ?? []).some((m) => m && hay.includes(String(m).toLowerCase()))) keys.add(k);
    }
    if (!keys.size && where) unresolved.push({ id: s.id, where });
    for (const k of keys) add(k, s);
  }
  return { venues, unresolved };
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The last calendar day (YYYY-MM-DD) a story's event runs, from its `days` —
 * weekday names counted forward from the episode date (a Wednesday). A story
 * with no days runs the whole Wed–Sun week.
 */
export function lastEventDay(episode, story) {
  const start = new Date(`${episode.date}T12:00:00Z`);
  const offsets = (story.days ?? []).map((d) => DOW.indexOf(String(d).slice(0, 3))).filter((i) => i > -1)
    .map((i) => (i - start.getUTCDay() + 7) % 7);
  const off = offsets.length ? Math.max(...offsets) : 4;
  return new Date(start.getTime() + off * 86400000).toISOString().slice(0, 10);
}

/**
 * The point of a venue note is a reason to reshare BEFORE the event (Andy,
 * 2026-09-25). Keep only stories whose last day is today or later, in Knoxville time.
 */
export function upcomingStories(episode, stories, now = Date.now()) {
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return stories.filter((s) => lastEventDay(episode, s) >= today);
}

/**
 * Decide what happens for each venue this week.
 *   send     — introduced, has an email, not already notified for this slug
 *   draft    — no `introduced` date yet: write the note for Andy to send himself
 *   no-email — introduced (or not) but nothing to send to; Andy DMs or we find one
 *   done     — already sent for this episode
 */
export function planNotifications(venues, contacts, sentLog = {}) {
  const plan = [];
  for (const v of venues.values()) {
    const c = contacts[v.key] ?? {};
    const to = c.to ?? c.email ?? null;
    let action;
    if (sentLog[v.key]) action = "done";
    else if (!c.introduced) action = "draft";
    else if (!to) action = "no-email";
    else action = "send";
    plan.push({ key: v.key, name: c.name ?? v.key, to, action, stories: v.stories, contact: c });
  }
  return plan.sort((a, b) => a.name.localeCompare(b.name));
}

const storyUrl = (episode, s) => `${SITE}/${episode.slug}/${s.id}`;

/**
 * The weekly note. Plain text first — it has to read like a person wrote it —
 * with an HTML twin that is the same words, linked. `first` is the introduction
 * variant Andy sends himself.
 */
export function renderMessage({ episode, name, contact = {}, stories, first = false, now = Date.now() }) {
  const who = contact.salutation ?? (contact.people?.[0]?.name ? `Hi ${contact.people[0].name.split(" ")[0]},` : `Hi ${name} team,`);
  const ep = `No. ${episode.number}`;
  const when = episode.shortDate ?? episode.dateLabel ?? episode.date;
  const n = stories.length;
  const igTag = contact.instagram ? `, tagging ${contact.instagram}` : "";
  // The drip runs Wed–Sun. A note sent after that (a first contact Andy gets to late)
  // has to say "went", not "goes". And not every story is queued — the standing cap
  // holds repeats — so with several stories the claim is about the week's picks.
  const over = now > new Date(`${episode.date}T00:00:00-04:00`).getTime() + 6 * 86400000;
  const igLine = n === 1
    ? `It ${over ? "went" : "also goes"} out on Instagram ${over ? "" : "over the weekend "}from @soknoear${igTag}, too.`
    : `The week's picks ${over ? "went" : "go"} out on Instagram ${over ? "" : "over the weekend "}from @soknoear${igTag}, too.`;

  const lines = [];
  if (first) {
    lines.push(
      `${who}`,
      "",
      `I edit The South Knoxville Ear, a weekly guide to what's happening in South Knoxville, and I wanted to make sure you knew we cover ${name} regularly. This week's episode (${ep}, ${when}) has ${n === 1 ? "a story" : `${n} stories`} about you:`,
    );
  } else {
    lines.push(
      `${who}`,
      "",
      `${name} is in this week's South Knoxville Ear (${ep}, ${when}). ${n === 1 ? "The story" : `The ${n} stories`}:`,
    );
  }
  lines.push("");
  for (const s of stories) lines.push(`  • ${s.title}`, `    ${storyUrl(episode, s)}`);
  lines.push(
    "",
    `${igLine} Everything we publish about you is yours to share — a repost, a story, a link, whatever's useful.`,
    "",
    "If we've got a detail wrong, or there's something coming up you'd like us to know about, just reply to this email. You can also call or text the Ear's tip line any time: 865-252-6500.",
    "",
    first ? "Thanks for giving the neighborhood things to do." : "Thanks, as always, for keeping South Knoxville interesting.",
    "",
    SIGNATURE,
  );
  const text = lines.join("\n");

  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const p = (t) => `<p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#171512;">${t}</p>`;
  const list = stories.map((s) => `<li style="margin:0 0 8px;"><a href="${storyUrl(episode, s)}" style="color:#A94A34;">${esc(s.title)}</a></li>`).join("");
  const body = first
    ? `I edit <a href="${SITE}" style="color:#A94A34;">The South Knoxville Ear</a>, a weekly guide to what's happening in South Knoxville, and I wanted to make sure you knew we cover ${esc(name)} regularly. This week's episode (${ep}, ${esc(when)}) has ${n === 1 ? "a story" : `${n} stories`} about you:`
    : `${esc(name)} is in this week's <a href="${SITE}" style="color:#A94A34;">South Knoxville Ear</a> (${ep}, ${esc(when)}). ${n === 1 ? "The story" : `The ${n} stories`}:`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px 16px;background:#ffffff;"><div style="max-width:560px;margin:0 auto;">
${p(esc(who))}
${p(body)}
<ul style="margin:0 0 14px 20px;padding:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;">${list}</ul>
${p(`${esc(igLine).replace("@soknoear", `<a href="${IG_PROFILE}" style="color:#A94A34;">@soknoear</a>`)} Everything we publish about you is yours to share — a repost, a story, a link, whatever's useful.`)}
${p(`If we've got a detail wrong, or there's something coming up you'd like us to know about, just reply to this email. You can also call or text the Ear's tip line any time: 865-252-6500.`)}
${p(first ? "Thanks for giving the neighborhood things to do." : "Thanks, as always, for keeping South Knoxville interesting.")}
${p(SIGNATURE.split("\n").map(esc).join("<br>"))}
</div></body></html>`;

  const subject = first
    ? `${name} is in this week's South Knoxville Ear`
    : `You're in this week's South Knoxville Ear (${ep})`;
  return { subject, text, html };
}
