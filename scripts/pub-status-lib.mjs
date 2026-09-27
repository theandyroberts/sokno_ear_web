// The pure half of the publishing desk (soknoear.com/desk/<token>): what a week's
// checklist IS, and how far along it is. No I/O — pub-status-store.mjs gathers the
// facts and this turns them into the week the page draws.
//
// A week runs Mon → Sun and is keyed by its WEDNESDAY (publish day), which is also
// the episode slug in a normal week. Two kinds of task:
//
//   auto — the pipeline's own files are the evidence (the episode JSON exists, the
//          queue says "posted"). Nobody ticks these; they tick themselves on sync.
//   mark — nothing on disk proves it (the research pass happened, Andy read the
//          draft, a DM went out). A script, Claude, or Andy's click records it.
//
// A task is done if the evidence says so OR someone marked it. A mark never
// un-does evidence.

// One schema, shared by the pipeline (pub-status-store.mjs) and the app (lib/desk.ts).
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS pub_weeks (
    week TEXT PRIMARY KEY, snapshot TEXT NOT NULL, synced_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pub_marks (
    week TEXT NOT NULL, task TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 1,
    note TEXT, by TEXT, at TEXT NOT NULL,
    PRIMARY KEY (week, task)
  );
  CREATE TABLE IF NOT EXISTS pub_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export const CHANNELS = {
  site: "SoKnoEar.com",
  party: "Dirty South party",
  instagram: "Instagram",
  venues: "Venue notes",
};

export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Today in Knoxville, as YYYY-MM-DD. */
export const todayET = (now = Date.now()) =>
  new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/** The Wednesday of the Mon–Sun week that contains `ymd`. */
export function weekOf(ymd) {
  const mon0 = (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(ymd, 2 - mon0);
}

/** "Sat Sep 26" */
export function dayLabel(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`);
  return `${DOW[(d.getUTCDay() + 6) % 7]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** The seven days of a week, Monday first. */
export function weekDays(week) {
  return DOW.map((dow, i) => {
    const date = addDays(week, i - 2);
    return { date, dow, label: dayLabel(date) };
  });
}

/** "13:00" → "1:00 PM" */
export function clock(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const QUEUE_STATE = { posted: "done", pending: "todo", failed: "failed", stale: "skipped" };

/**
 * Build a week's checklist from the facts.
 *
 * @param {object} f
 * @param {string} f.week            the week's Wednesday, YYYY-MM-DD
 * @param {object|null} f.episode    the published episode in this week, if any
 * @param {object|null} f.draft      the draft in this week, if any
 * @param {number} [f.expectedNumber] episode number to show before a draft exists
 * @param {boolean} f.hasAudio       public/audio/<slug>.mp3 exists
 * @param {number} f.igAssets        images in public/assets/ig/<slug>/
 * @param {object|null} f.queue      content/ig-queue/<slug>.json
 * @param {{updated?: string, weekend?: string}|null} f.nightlife
 * @param {string[]} f.reviews       dates of docs/ig-reviews/*.md
 * @param {Array<{key:string,name:string,introduced:string|null,to:string|null}>} f.venues  venues this episode references
 * @param {object} f.venueLog        content/venue-notify/<slug>.json — automatic sends
 * @param {object|null} f.venueDrafts content/venue-notify/<slug>/drafts.json — null if venue-notify never ran
 * @param {number} [f.now]
 */
export function deriveWeek(f) {
  const now = f.now ?? Date.now();
  const ep = f.episode ?? f.draft ?? null;
  const published = Boolean(f.episode);
  const days = weekDays(f.week);
  const [mon, tue, wed] = days.map((d) => d.date);
  const sun = days[6].date;
  const items = [];
  const add = (date, item) => items.push({ date, who: "Pipeline", kind: "auto", done: false, detail: "", ...item });

  // ── Monday ────────────────────────────────────────────────────────────────
  const review = (f.reviews ?? []).filter((d) => d >= mon && d <= sun).sort()[0];
  add(mon, {
    id: "ig-review", channel: "instagram", title: "Weekly Instagram review", who: "Claude", kind: "mark", time: "9:00 AM",
    done: Boolean(review), detail: review ? `report filed ${dayLabel(review)}` : "last week's numbers, findings, action plan",
  });

  // ── Tuesday ───────────────────────────────────────────────────────────────
  add(tue, { id: "research", channel: "site", title: "Research pass for the weekend", who: "Claude", kind: "mark", time: "9:00 AM", done: published, detail: published ? "" : "venues, calendars, the week's rumors" });
  add(tue, {
    id: "draft", channel: "site", title: "Episode draft up at /next", who: "Claude",
    done: Boolean(ep), detail: ep ? `No. ${ep.number} · ${ep.feature?.title ?? ""}`.trim() : "",
  });
  add(tue, { id: "audio", channel: "site", title: "Audio briefing rendered", who: "Claude", done: Boolean(f.hasAudio) });
  const partyFresh = Boolean(ep && f.nightlife?.weekend && f.nightlife.weekend === ep.shortDate);
  add(tue, {
    id: "party-plan", channel: "party", title: "Party plan rebuilt for the weekend", who: "Claude",
    done: partyFresh,
    detail: partyFresh ? `${f.nightlife.weekend} · updated ${f.nightlife.updated ?? "?"}`
      : f.nightlife?.weekend ? `still showing ${f.nightlife.weekend}` : "",
  });

  // ── Wednesday: Andy's review, then the publish ────────────────────────────
  add(wed, { id: "review", channel: "site", title: "Read the draft, send notes", who: "Andy", kind: "mark", done: published, detail: published ? "" : "soknoear.com/next" });
  add(wed, {
    id: "site-live", channel: "site", title: "Episode live on soknoear.com", who: "Andy",
    done: published, detail: published ? `No. ${f.episode.number} · ${f.episode.shortDate ?? ""}` : "say “run it”",
  });
  add(wed, { id: "party-live", channel: "party", title: "/dirtysouthparty shows this weekend", done: published && partyFresh, detail: published && partyFresh ? f.nightlife.weekend : "" });
  add(wed, { id: "newsletter", channel: "site", title: "Newsletter sent to subscribers", who: "Andy", kind: "mark", detail: "preview first, then the real send" });
  add(wed, { id: "party-notice", channel: "party", title: "Party notice sent to the list", who: "Andy", kind: "mark", detail: "preview first, then the real send" });
  add(wed, { id: "ig-art", channel: "instagram", title: "Instagram artwork built", done: f.igAssets > 0, detail: f.igAssets ? `${f.igAssets} images` : "" });
  const posts = f.queue?.posts ?? [];
  add(wed, {
    id: "ig-queue", channel: "instagram", title: "Drip staged and approved",
    done: Boolean(f.queue?.approved), detail: f.queue ? `${posts.length} posts${f.queue.approved ? "" : " · NOT approved"}` : "",
  });

  // Venue notes. Introduced venues are mailed by the pipeline; everyone else is a
  // Gmail draft Andy sends himself, before the event.
  const ran = f.venueDrafts !== null && f.venueDrafts !== undefined;
  const auto = (f.venues ?? []).filter((v) => v.introduced && v.introduced < f.week && v.to);
  const autoSent = auto.filter((v) => f.venueLog?.[v.key]);
  add(wed, {
    id: "venue-auto", channel: "venues", title: "Weekly notes sent to venues we know",
    done: auto.length > 0 && autoSent.length === auto.length,
    state: published && auto.length === 0 ? "na" : undefined,
    detail: auto.length ? `${autoSent.length} of ${auto.length} sent · ${auto.map((v) => v.name).join(", ")}` : published ? "no introduced venues in this episode yet" : "",
  });
  const drafts = Object.values(f.venueDrafts ?? {}).filter((d) => !d.superseded);
  const inGmail = drafts.filter((d) => d.gmailDraftId && d.gmailAccount === "andy@note15.com");
  add(wed, {
    id: "venue-drafts", channel: "venues", title: "First-contact drafts in Gmail", who: "Claude", time: "5:30 PM",
    done: drafts.length > 0 && inGmail.length === drafts.length,
    state: ran && drafts.length === 0 ? "na" : undefined,
    detail: drafts.length ? `${inGmail.length} of ${drafts.length} in andy@note15.com` : ran ? "nobody new this week" : "",
  });
  const today = todayET(now);
  const byKey = Object.fromEntries((f.venues ?? []).map((v) => [v.key, v]));
  for (const d of drafts.sort((a, b) => String(a.lastDay).localeCompare(String(b.lastDay)) || a.name.localeCompare(b.name))) {
    const introduced = byKey[d.key]?.introduced ?? null;
    const sent = Boolean(d.sentAt) || Boolean(introduced && introduced >= mon);
    const missed = !sent && d.lastDay && d.lastDay < today;
    add(wed, {
      id: `venue-sent:${d.key}`, channel: "venues", who: "Andy", kind: "mark",
      title: `Send the first note to ${d.name}`,
      done: sent, due: d.lastDay ?? null,
      state: missed ? "missed" : undefined,
      detail: [
        sent ? `sent ${dayLabel(d.sentAt ? d.sentAt.slice(0, 10) : introduced)}` : d.lastDay ? `${missed ? "event passed" : "send by"} ${dayLabel(d.lastDay)}` : "",
        d.to ? `to ${d.to}` : `no email — DM ${d.instagram ?? "them"}`,
      ].filter(Boolean).join(" · "),
    });
  }
  add(wed, { id: "publish-check", channel: "site", title: "Publish check — every channel went", who: "Claude", kind: "mark", time: "2:00 PM" });

  // ── The drip, post by post ────────────────────────────────────────────────
  for (const p of [...posts].sort((a, b) => a.postAt.localeCompare(b.postAt))) {
    const state = QUEUE_STATE[p.status] ?? "todo";
    add(p.postAt.slice(0, 10), {
      id: `ig-post:${p.id}`, channel: "instagram", title: p.title ?? p.id, time: clock(p.postAt.slice(11, 16)),
      done: state === "done", state: state === "done" || state === "todo" ? undefined : state,
      detail: state === "failed" ? `failed after ${p.attempts ?? "?"} tries` : state === "skipped" ? "dropped — its event had started"
        : [p.tags?.join(" "), p.abGroup === "img-tagged" ? "tagged in image" : ""].filter(Boolean).join(" · "),
    });
  }

  return {
    week: f.week,
    slug: ep?.slug ?? null,
    number: ep?.number ?? f.expectedNumber ?? null,
    shortDate: ep?.shortDate ?? null,
    feature: ep?.feature?.title ?? null,
    stage: published ? "published" : f.draft ? "draft" : "not-started",
    days: days.map((d) => ({ ...d, items: items.filter((i) => i.date === d.date) })),
    // A post that spilled outside Mon–Sun would vanish; keep it visible.
    stray: items.filter((i) => i.date < mon || i.date > sun),
    generatedAt: new Date(now).toISOString(),
  };
}

/**
 * Lay the recorded marks over a derived week and settle each task's state:
 *   done · todo · late (its day has passed) · failed · skipped · missed · na
 *
 * @param {object} snapshot  deriveWeek() output
 * @param {Array<{task:string, done:number|boolean, note?:string, by?:string, at?:string}>} marks
 */
export function mergeMarks(snapshot, marks = [], now = Date.now()) {
  const today = todayET(now);
  const byTask = Object.fromEntries(marks.map((m) => [m.task, m]));
  const settle = (i) => {
    const m = byTask[i.id];
    const marked = Boolean(m?.done);
    const done = i.done || marked;
    let state = i.state;
    // A task with its own deadline (a venue note's send-by day) is late by THAT day,
    // not by the day it was handed out.
    if (done) state = "done";
    else if (!state) state = (i.due ?? i.date) < today ? "late" : "todo";
    return {
      ...i, done, state,
      dueToday: !done && state === "todo" && i.due === today,
      detail: marked && m.note ? m.note : i.detail || (m?.note ?? ""),
      markedBy: marked ? m.by ?? null : null,
      markedAt: marked ? m.at ?? null : null,
      // Evidence can't be un-ticked; only a mark can.
      locked: i.kind === "auto" || (i.done && !marked),
    };
  };
  const days = snapshot.days.map((d) => ({ ...d, isToday: d.date === today, items: d.items.map(settle) }));
  const all = [...days.flatMap((d) => d.items), ...(snapshot.stray ?? []).map(settle)];
  const counted = all.filter((i) => i.state !== "na" && i.state !== "skipped");
  const channels = Object.entries(CHANNELS).map(([key, name]) => {
    const mine = counted.filter((i) => i.channel === key);
    return { key, name, done: mine.filter((i) => i.done).length, total: mine.length, trouble: mine.filter((i) => ["failed", "late", "missed"].includes(i.state)).length };
  });
  // What is waiting on Andy, soonest deadline first. Missed ones are history, not a to-do.
  const waiting = all
    .filter((i) => i.who === "Andy" && !i.done && i.state !== "missed" && i.state !== "na")
    .sort((a, b) => String(a.due ?? a.date).localeCompare(String(b.due ?? b.date)));
  return { ...snapshot, days, channels, waiting, done: counted.filter((i) => i.done).length, total: counted.length, today };
}
