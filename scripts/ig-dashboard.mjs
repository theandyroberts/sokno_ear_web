#!/usr/bin/env node
// Draw one week of the Instagram dashboard (note15.com/insta/soknoear) from a data file.
//
//   node scripts/ig-dashboard.mjs docs/ig-reviews/data/2026-09-28.json            → print the block
//   node scripts/ig-dashboard.mjs docs/ig-reviews/data/2026-09-28.json --into page.html
//       → put the block into a copy of the page: newest run on top and showing, its
//         entry in the rail, every other run hidden, styles and script refreshed.
//
// Why a generator. The first nine runs were written by hand and each one grew: eight
// findings, five lettered actions, a callout that opened with what Andy owed. His
// verdict (2026-09-28) was "more like reading a book than a dashboard". So the shape
// is fixed here and the data file can only fill it in:
//   · the picture comes first — numbers against last week and against the start,
//     dials, the posts themselves as images;
//   · at most THREE moves, named in plain words, each either Claude's ("going ahead
//     unless you say no") or Andy's, each answerable on the page;
//   · the long analysis stays in docs/ig-reviews/<date>.md.
// validate() refuses a data file that breaks those rules, so a run cannot drift back.
import fs from "node:fs";

export const MAX_MOVES = 3;
export const MAX_WORDS = { headline: 12, why: 28, caption: 16, done: 24, verdict: 8 };
const API = "https://soknoear.com/api/desk/moves";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
const pad2 = (n) => String(n).padStart(2, "0");
const r1 = (n) => Math.round(n * 10) / 10;

/** A lettered ticket ("A11", "A16 —") where a name should be. */
const TICKET = /\bA\d{1,2}\b/;

/** Everything wrong with a data file, as sentences. Empty means it can be drawn. */
export function validate(d) {
  const bad = [];
  const need = (ok, msg) => { if (!ok) bad.push(msg); };
  need(Number.isInteger(d.run) && d.run > 0, "run must be a positive whole number");
  need(/^\d{4}-\d\d-\d\d$/.test(d.date ?? ""), "date must be YYYY-MM-DD");
  need(d.headline && words(d.headline) <= MAX_WORDS.headline, `headline: at most ${MAX_WORDS.headline} words`);
  need(Array.isArray(d.verdicts) && d.verdicts.length >= 2 && d.verdicts.length <= 4, "verdicts: two to four");
  for (const v of d.verdicts ?? []) need(words(v.text) <= MAX_WORDS.verdict, `verdict "${v.label}": at most ${MAX_WORDS.verdict} words`);
  need(Array.isArray(d.tiles) && d.tiles.length >= 3 && d.tiles.length <= 6, "tiles: three to six");
  for (const t of d.tiles ?? []) need(Array.isArray(t.series) && t.series.length >= 2, `tile "${t.label}": needs a series to draw`);
  need(Array.isArray(d.week) && d.week.length > 0, "week: the posts, with images");
  for (const p of d.week ?? []) need(Boolean(p.img), `post "${p.id}": no image`);
  for (const k of ["worked", "didnt"]) {
    need(Array.isArray(d[k]) && d[k].length >= 1 && d[k].length <= 3, `${k}: one to three posts`);
    for (const p of d[k] ?? []) {
      need(Boolean(p.img), `${k} "${p.title}": no image`);
      need(words(p.why) <= MAX_WORDS.caption, `${k} "${p.title}": reason is at most ${MAX_WORDS.caption} words`);
    }
  }
  need(Array.isArray(d.moves) && d.moves.length >= 1 && d.moves.length <= MAX_MOVES, `moves: one to ${MAX_MOVES}`);
  for (const m of d.moves ?? []) {
    need(/^[a-z0-9][a-z0-9-]{1,60}$/.test(m.key ?? ""), `move "${m.title}": key must be a plain slug`);
    need(m.owner === "claude" || m.owner === "andy", `move "${m.title}": owner is claude or andy`);
    need(words(m.why) <= MAX_WORDS.why, `move "${m.title}": the reason is at most ${MAX_WORDS.why} words`);
    need(Boolean(m.plan), `move "${m.title}": say what happens and when`);
  }
  for (const s of d.done ?? []) need(words(s.text) <= MAX_WORDS.done, `done "${s.title}": at most ${MAX_WORDS.done} words`);
  // Names, not ticket numbers, anywhere a person reads.
  const seen = JSON.stringify({ ...d, writeUp: undefined, writeUpHtml: undefined });
  need(!TICKET.test(seen), `a lettered ticket (${seen.match(TICKET)?.[0]}) appears where a plain name should`);
  return bad;
}

// ── drawing ─────────────────────────────────────────────────────────────────

/** A sparkline. The last point is the one that matters, so it gets the dot. */
export function spark(series, { w = 132, h = 38, good = "up" } = {}) {
  const lo = Math.min(...series), hi = Math.max(...series);
  const span = hi - lo || 1;
  const x = (i) => r1(4 + (i * (w - 8)) / (series.length - 1));
  const y = (v) => r1(h - 5 - ((v - lo) / span) * (h - 10));
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = series.at(-1), prev = series.at(-2);
  const rising = last > prev, flat = last === prev;
  const tone = flat ? "flat" : rising === (good === "up") ? "ok" : "bad";
  return `<svg class="g-spark g-spark--${tone}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(series.join(", "))}"><polyline points="${pts}"/><circle cx="${x(series.length - 1)}" cy="${y(last)}" r="3.2"/></svg>`;
}

/** A half-circle dial, 0 to max. */
export function dial({ value, max = 100, display, label, note, tone = "ink" }) {
  const frac = Math.max(0, Math.min(1, value / max));
  const R = 62, len = Math.PI * R;
  return `<div class="g-dial">
  <svg viewBox="0 0 160 92" role="img" aria-label="${esc(label)}: ${esc(display)}">
    <path class="g-dial-track" d="M18 82 A62 62 0 0 1 142 82"/>
    <path class="g-dial-fill g-tone--${tone}" d="M18 82 A62 62 0 0 1 142 82" stroke-dasharray="${r1(len * frac)} ${r1(len)}"/>
    <text class="g-dial-v" x="80" y="76" text-anchor="middle">${esc(display)}</text>
  </svg>
  <div class="g-dial-l">${esc(label)}</div>
  <div class="g-dial-n">${esc(note ?? "")}</div>
</div>`;
}

const ARROW = { up: "&#9650;", down: "&#9660;", flat: "&#9644;" };

function tile(t) {
  const c = t.vsLast ?? {};
  return `<div class="g-tile">
  <div class="g-tile-k">${esc(t.label)}</div>
  <div class="g-tile-row"><div class="g-tile-v">${esc(t.value)}</div>${spark(t.series, { good: t.good ?? "up" })}</div>
  <div class="g-tile-d"><span class="g-chip g-chip--${esc(c.tone ?? "flat")}">${ARROW[c.dir ?? "flat"]} ${esc(c.text ?? "")}</span><span class="g-since">${esc(t.vsBase ?? "")}</span></div>
</div>`;
}

function shot(p, kind) {
  return `<figure class="g-shot g-shot--${kind}">
  <div class="g-shot-img"><img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy"><span class="g-reach"><b>${esc(p.reach)}</b> reached</span></div>
  <figcaption><b>${esc(p.title)}</b><span>${esc(p.why)}</span></figcaption>
</figure>`;
}

function weekStrip(week, legend) {
  const top = Math.max(...week.map((p) => p.reach), 1);
  const cells = week.map((p, i) => `<div class="g-cell${p.group ? ` g-cell--${esc(p.group)}` : ""}${i && week[i - 1].day !== p.day ? " g-cell--newday" : ""}" title="${esc(p.title)}">
  <div class="g-cell-img"><img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy"></div>
  <div class="g-cell-bar"><i style="height:${Math.max(6, Math.round((p.reach / top) * 100))}%"></i></div>
  <div class="g-cell-n">${esc(p.reach)}</div>
  <div class="g-cell-t">${esc(p.day)} ${esc(p.time)}</div>
</div>`).join("\n");
  const key = (legend ?? []).map((l) => `<span><i class="g-key g-key--${esc(l.group)}"></i>${esc(l.label)}</span>`).join("");
  return `<div class="g-strip" style="--n:${week.length}">${cells}</div>${key ? `<div class="g-legend">${key}</div>` : ""}`;
}

function bars(rows) {
  const top = Math.max(...rows.map((r) => r.value));
  return `<div class="g-bars">${rows.map((r) => `<div class="g-bar"><span class="g-bar-l">${esc(r.label)}</span><span class="g-bar-t"><i class="g-tone--${esc(r.tone ?? "ink")}" style="width:${Math.round((r.value / top) * 100)}%"></i></span><span class="g-bar-v">${esc(r.value)}</span><span class="g-bar-n">${esc(r.note ?? "")}</span></div>`).join("")}</div>`;
}

const OWNER = { claude: "Claude is doing this", andy: "Only you can do this" };
const BUTTONS = {
  claude: [["go", "Go ahead"], ["no", "Don&rsquo;t"]],
  andy: [["done", "Done"], ["later", "Not this week"]],
};

function move(m, i) {
  return `<article class="g-move g-move--${m.owner}" data-move="${esc(m.key)}" data-owner="${m.owner}">
  <div class="g-move-n">${i + 1}</div>
  <div class="g-move-b">
    <div class="g-move-h"><h4>${esc(m.title)}</h4><span class="g-owner">${OWNER[m.owner]}</span></div>
    <p class="g-move-why">${esc(m.why)}</p>
    <p class="g-move-plan">${esc(m.plan)}</p>
    <div class="g-answer" hidden>
      <div class="g-said" hidden></div>
      <div class="g-btns">${BUTTONS[m.owner].map(([a, l]) => `<button type="button" data-answer="${a}">${l}</button>`).join("")}</div>
      <div class="g-note"><input type="text" maxlength="400" placeholder="Or tell me something about it" aria-label="A note about ${esc(m.title)}"><button type="button" data-send>Send</button></div>
      <div class="g-err" hidden>Couldn&rsquo;t save that. Try again.</div>
    </div>
    <p class="g-locked">Open this page from the link on your publishing desk to answer here.</p>
  </div>
</article>`;
}

/** The whole run, as the block that goes inside <div class="inner">. */
export function renderRun(d) {
  const bad = validate(d);
  if (bad.length) throw new Error(`can't draw ${d.date ?? "this run"}:\n  · ${bad.join("\n  · ")}`);
  const id = `run-${pad2(d.run)}`, r = `r${d.run}`;
  return `      <!-- ${id}:start -->
      <div class="runview g-run" id="${id}">

      <div class="g-head">
        <span class="kicker">${esc(d.kicker)}</span>
        <h2>${esc(d.headline)}</h2>
        <div class="g-verdicts">${d.verdicts.map((v) => `<span class="g-verdict g-verdict--${esc(v.tone)}"><b>${esc(v.label)}</b>${esc(v.text)}</span>`).join("")}</div>
      </div>

      <section id="${r}-glance" class="g-sec">
        <div class="g-tiles">
${d.tiles.map(tile).join("\n")}
        </div>
        <p class="g-foot">${esc(d.tilesNote ?? "")}</p>
      </section>

      <section id="${r}-pictures" class="g-sec">
        <h3 class="g-h">The week in pictures</h3>
${weekStrip(d.week, d.weekLegend)}
      </section>

      <section id="${r}-worked" class="g-sec">
        <div class="g-two">
          <div><h3 class="g-h g-h--ok">Worked</h3><div class="g-shots">${d.worked.map((p) => shot(p, "ok")).join("")}</div></div>
          <div><h3 class="g-h g-h--bad">Didn&rsquo;t</h3><div class="g-shots">${d.didnt.map((p) => shot(p, "bad")).join("")}</div></div>
        </div>
      </section>

      <section id="${r}-learned" class="g-sec">
        <div class="g-two g-two--wide">
          <div><h3 class="g-h">${esc(d.learned.title)}</h3>${bars(d.learned.rows)}<p class="g-foot">${esc(d.learned.note ?? "")}</p></div>
          <div><h3 class="g-h">Health</h3><div class="g-dials">${d.dials.map(dial).join("")}</div></div>
        </div>
${d.bestEver?.length ? `        <h3 class="g-h" style="margin-top:30px">Best ever</h3><div class="g-shots g-shots--row">${d.bestEver.map((p) => shot(p, "ink")).join("")}</div>` : ""}
      </section>

      <section id="${r}-moves" class="g-sec">
        <h3 class="g-h">${d.moves.length === 1 ? "One move" : `${["", "", "Two", "Three"][d.moves.length]} moves`}</h3>
        <div class="g-moves">
${d.moves.map(move).join("\n")}
        </div>
${d.done?.length ? `        <h3 class="g-h" style="margin-top:30px">Already done</h3><ul class="g-done">${d.done.map((s) => `<li><b>${esc(s.title)}</b>${esc(s.text)}</li>`).join("")}</ul>` : ""}
      </section>

${d.writeUpHtml ? `      <details class="g-more"><summary>The full write-up</summary>\n${d.writeUpHtml}\n      </details>` : ""}

      <footer style="margin-top:44px">
        <span>Note Fifteen Marketing &middot; Intelligence-enhanced marketing for your business.</span>
        <span>Next review ${esc(d.next)}</span>
      </footer>

      </div><!-- /${id} -->
      <!-- ${id}:end -->
`;
}

/** The rail entry and the jump list for a run. */
export function renderRail(d) {
  const id = `run-${pad2(d.run)}`, r = `r${d.run}`;
  const li = `      <li><a href="#${id}" class="run active" data-run="${id}">
        <span class="rdate"><span class="dot"></span> ${esc(d.date)}</span>
        <span class="rkind">${esc(d.railKind)}</span>
      </a></li>\n`;
  const nav = `    <nav class="rail-jump" data-jump="${id}">
      <div class="rail-lbl" style="padding:0;margin-bottom:8px">On this run</div>
      <a href="#${r}-glance">At a glance</a>
      <a href="#${r}-pictures">The week in pictures</a>
      <a href="#${r}-worked">Worked, and didn&rsquo;t</a>
      <a href="#${r}-learned">What it shows</a>
      <a href="#${r}-moves">The moves</a>
    </nav>\n\n`;
  return { li, nav };
}

export const CSS = `
  /* ============ the glance layout (scripts/ig-dashboard.mjs) ============ */
  .g-head{padding:34px 0 26px}
  .g-head h2{font-family:var(--display);font-weight:700;font-size:38px;line-height:1.06;letter-spacing:-.025em;margin-top:14px;max-width:22ch}
  .g-verdicts{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
  .g-verdict{display:inline-flex;align-items:center;gap:9px;font-size:14px;padding:8px 14px 8px 12px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink-soft)}
  .g-verdict b{font-family:var(--display);font-weight:600;color:var(--ink)}
  .g-verdict::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--gray-lite)}
  .g-verdict--ok::before{background:var(--ok)} .g-verdict--bad::before{background:var(--alert)} .g-verdict--warn::before{background:var(--yellow-deep)}
  .g-sec{margin-bottom:40px}
  .g-h{font-family:var(--display);font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--gray);margin-bottom:14px;display:flex;align-items:center;gap:9px}
  .g-h--ok{color:var(--ok)} .g-h--bad{color:var(--alert)}
  .g-foot{font-family:var(--mono);font-size:12px;color:var(--gray-lite);margin-top:10px}
  .g-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .g-tile{border:1px solid var(--line);border-radius:12px;padding:18px 18px 16px;background:var(--paper);min-width:0}
  .g-tile-k{font-family:var(--display);font-size:10.5px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--gray)}
  .g-tile-row{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:10px}
  .g-tile-v{font-family:var(--display);font-weight:700;font-size:40px;line-height:1;letter-spacing:-.03em}
  .g-spark{width:48%;max-width:132px;height:38px;overflow:visible}
  .g-spark polyline{fill:none;stroke:var(--gray-lite);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
  .g-spark circle{fill:var(--gray)}
  .g-spark--ok circle{fill:var(--ok)} .g-spark--bad circle{fill:var(--alert)}
  .g-tile-d{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;font-family:var(--mono);font-size:12px}
  .g-chip{padding:2px 7px;border-radius:4px;background:var(--haze);color:var(--gray)}
  .g-chip--ok{background:var(--ok-bg);color:var(--ok)} .g-chip--bad{background:var(--alert-bg);color:var(--alert)}
  .g-since{color:var(--gray-lite)}
  .g-strip{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:6px;align-items:end}
  .g-cell{min-width:0;text-align:center}
  .g-cell--newday{padding-left:10px;border-left:1px solid var(--line)}
  .g-cell-img{border-radius:6px;overflow:hidden;aspect-ratio:4/5;background:var(--haze);border-bottom:4px solid var(--gray-lite)}
  .g-cell-img img{width:100%;height:100%;object-fit:cover;display:block}
  .g-cell-bar{height:54px;display:flex;align-items:flex-end;justify-content:center;margin-top:6px}
  .g-cell-bar i{display:block;width:62%;border-radius:3px 3px 0 0;background:var(--gray-lite)}
  .g-cell-n{font-family:var(--display);font-weight:700;font-size:15px;margin-top:4px}
  .g-cell-t{font-family:var(--mono);font-size:9.5px;color:var(--gray-lite);margin-top:1px;white-space:nowrap;overflow:hidden}
  .g-cell--hot .g-cell-img{border-bottom-color:var(--alert)} .g-cell--hot .g-cell-bar i{background:var(--alert)}
  .g-cell--lead .g-cell-img{border-bottom-color:var(--yellow-deep)} .g-cell--lead .g-cell-bar i{background:var(--yellow-deep)}
  .g-legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-family:var(--mono);font-size:12px;color:var(--gray)}
  .g-key{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:var(--gray-lite)}
  .g-key--hot{background:var(--alert)} .g-key--lead{background:var(--yellow-deep)}
  .g-two{display:grid;grid-template-columns:1fr 1fr;gap:34px}
  .g-two--wide{grid-template-columns:1.15fr 1fr}
  .g-shots{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .g-shots--row{grid-template-columns:repeat(6,1fr)}
  .g-shot{min-width:0}
  .g-shot-img{position:relative;border-radius:9px;overflow:hidden;aspect-ratio:4/5;background:var(--haze)}
  .g-shot-img img{width:100%;height:100%;object-fit:cover;display:block}
  .g-reach{position:absolute;left:7px;top:7px;font-family:var(--mono);font-size:11px;padding:3px 8px;border-radius:999px;background:var(--ink);color:#fff}
  .g-reach b{font-family:var(--display);font-size:14px;font-weight:700;margin-right:3px}
  .g-shot--ok .g-reach{background:var(--ok)} .g-shot--bad .g-reach{background:var(--alert)}
  .g-shot figcaption{margin-top:8px;font-size:12.5px;line-height:1.4;color:var(--gray)}
  .g-shot figcaption b{display:block;font-family:var(--display);font-weight:600;font-size:13px;color:var(--ink);margin-bottom:2px}
  .g-bars{display:grid;gap:12px}
  .g-bar{display:grid;grid-template-columns:118px 1fr 40px;gap:10px;align-items:center;font-size:13.5px}
  .g-bar-l{font-weight:500}
  .g-bar-t{height:18px;background:var(--haze);border-radius:4px;overflow:hidden}
  .g-bar-t i{display:block;height:100%;border-radius:4px;background:var(--ink)}
  .g-bar-v{font-family:var(--display);font-weight:700;font-size:16px;text-align:right}
  .g-bar-n{grid-column:2 / 4;font-family:var(--mono);font-size:11px;color:var(--gray-lite);margin-top:-8px}
  i.g-tone--ok,path.g-tone--ok{background:var(--ok);stroke:var(--ok)} i.g-tone--bad,path.g-tone--bad{background:var(--alert);stroke:var(--alert)}
  i.g-tone--warn,path.g-tone--warn{background:var(--yellow-deep);stroke:var(--yellow-deep)} path.g-tone--ink{stroke:var(--ink)}
  .g-dials{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .g-dial{text-align:center;min-width:0}
  .g-dial svg{width:100%;max-width:170px;height:auto;display:block;margin:0 auto}
  .g-dial-track{fill:none;stroke:var(--haze);stroke-width:13;stroke-linecap:round}
  .g-dial-fill{fill:none;stroke-width:13;stroke-linecap:round}
  .g-dial-v{font-family:var(--display);font-weight:700;font-size:27px;fill:var(--ink);letter-spacing:-.02em}
  .g-dial-l{font-family:var(--display);font-weight:600;font-size:12.5px;margin-top:6px;line-height:1.3}
  .g-dial-n{font-family:var(--mono);font-size:11px;color:var(--gray-lite);margin-top:3px}
  .g-moves{display:grid;gap:12px}
  .g-move{display:grid;grid-template-columns:44px 1fr;gap:16px;border:1px solid var(--line);border-left:4px solid var(--ink);border-radius:12px;padding:20px 22px;background:var(--paper)}
  .g-move--andy{border-left-color:var(--alert)}
  .g-move-n{font-family:var(--display);font-weight:700;font-size:16px;background:var(--yellow);width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center}
  .g-move-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .g-move-h h4{font-family:var(--display);font-weight:700;font-size:19px;letter-spacing:-.015em}
  .g-owner{margin-left:auto;font-family:var(--display);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;border-radius:4px;background:var(--haze);color:var(--gray)}
  .g-move--andy .g-owner{background:var(--alert);color:#fff}
  .g-move-why{font-size:14.8px;color:var(--ink-soft);line-height:1.55;margin-top:8px;max-width:70ch}
  .g-move-plan{font-family:var(--mono);font-size:12.5px;color:var(--gray);margin-top:8px}
  .g-answer{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
  .g-btns{display:flex;gap:8px;flex-wrap:wrap}
  .g-answer button{font-family:var(--display);font-weight:600;font-size:13px;padding:9px 16px;border-radius:8px;border:1px solid var(--ink);background:var(--paper);color:var(--ink);cursor:pointer}
  .g-answer button:hover{background:var(--haze)}
  .g-answer button[aria-pressed="true"]{background:var(--ink);color:#fff}
  .g-answer button:disabled{opacity:.5;cursor:default}
  .g-note{display:flex;gap:8px;margin-top:10px}
  .g-note input{flex:1;min-width:0;font:inherit;font-size:14px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink)}
  .g-said{font-size:13.5px;color:var(--ink-soft);margin-bottom:10px}
  .g-said b{font-family:var(--display);font-weight:600;color:var(--ink)}
  .g-said .g-seen{font-family:var(--mono);font-size:11.5px;color:var(--ok);margin-left:8px}
  .g-err{font-family:var(--mono);font-size:12px;color:var(--alert);margin-top:8px}
  .g-locked{font-family:var(--mono);font-size:11.5px;color:var(--gray-lite);margin-top:12px}
  .g-done{list-style:none;display:grid;gap:8px}
  .g-done li{font-size:14.5px;color:var(--ink-soft);padding-left:26px;position:relative;line-height:1.5}
  .g-done li::before{content:"\\2713";position:absolute;left:0;top:0;color:var(--ok);font-weight:700}
  .g-done b{font-family:var(--display);font-weight:600;color:var(--ink);margin-right:6px}
  .g-more{border-top:1px solid var(--line);padding-top:18px;margin-top:10px}
  .g-more>summary{font-family:var(--display);font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--gray);cursor:pointer;padding:6px 0}
  .g-more[open]>summary{margin-bottom:26px}
  @media (max-width:1080px){.g-tiles{grid-template-columns:repeat(2,1fr)}.g-shots--row{grid-template-columns:repeat(3,1fr)}}
  @media (max-width:760px){
    .g-head h2{font-size:28px}
    .g-two,.g-two--wide{grid-template-columns:1fr}
    .g-strip{grid-template-columns:repeat(5,minmax(0,1fr));row-gap:14px}
    .g-move{grid-template-columns:1fr;gap:10px}
    .g-owner{margin-left:0}
    .g-bar{grid-template-columns:96px 1fr 36px}
  }
`;

/** The page's side of the feedback loop. Plain ES5-ish, no build step on that site. */
export const JS = `
(function () {
  var API = ${JSON.stringify(API)};
  var WORD = { go: "Go ahead", no: "Don\\u2019t", done: "Done", later: "Not this week" };
  var key = null;
  try {
    // The key arrives once in the fragment (from the desk's link), then lives here.
    var m = /(?:^|[#&])k=([^&]+)/.exec(window.location.hash);
    if (m) { localStorage.setItem("ear_k", decodeURIComponent(m[1])); history.replaceState(null, "", window.location.pathname); }
    key = localStorage.getItem("ear_k");
  } catch (e) {}
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-move]"));
  if (!key || !cards.length) return;

  function call(body) {
    body.token = key;
    return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { if (r.status === 404 && !body.key) { try { localStorage.removeItem("ear_k"); } catch (e) {} } if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function when(iso) { try { return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); } catch (e) { return ""; } }
  function text(el, s) { el.textContent = s; return el; }

  function draw(moves) {
    var byKey = {};
    moves.forEach(function (x) { byKey[x.key] = x; });
    cards.forEach(function (card) {
      var mv = byKey[card.getAttribute("data-move")];
      var box = card.querySelector(".g-answer"), locked = card.querySelector(".g-locked");
      if (!mv) { box.hidden = true; locked.hidden = false; text(locked, "This one is finished."); return; }
      box.hidden = false; locked.hidden = true;
      Array.prototype.forEach.call(box.querySelectorAll("[data-answer]"), function (b) {
        b.setAttribute("aria-pressed", String(mv.answer === b.getAttribute("data-answer")));
      });
      var said = box.querySelector(".g-said");
      said.hidden = !mv.answeredAt;
      if (mv.answeredAt) {
        said.textContent = "";
        said.appendChild(text(document.createElement("b"), "You said: "));
        said.appendChild(document.createTextNode((mv.answer ? WORD[mv.answer] : "") + (mv.answer && mv.note ? " \\u2014 " : "") + (mv.note ? "\\u201c" + mv.note + "\\u201d" : "") + " \\u00b7 " + when(mv.answeredAt)));
        var seen = text(document.createElement("span"), mv.handled ? "\\u2713 acted on" : "waiting for the next run");
        seen.className = "g-seen"; if (!mv.handled) seen.style.color = "var(--gray-lite)";
        said.appendChild(seen);
      }
    });
  }

  function send(card, body) {
    var box = card.querySelector(".g-answer"), err = box.querySelector(".g-err");
    var controls = box.querySelectorAll("button,input");
    err.hidden = true;
    Array.prototype.forEach.call(controls, function (c) { c.disabled = true; });
    body.key = card.getAttribute("data-move");
    call(body).then(function (r) { box.querySelector("input").value = ""; draw(r.moves); })
      .catch(function () { err.hidden = false; })
      .then(function () { Array.prototype.forEach.call(controls, function (c) { c.disabled = false; }); });
  }

  document.addEventListener("click", function (e) {
    var card = e.target.closest && e.target.closest("[data-move]");
    if (!card) return;
    var note = card.querySelector(".g-note input").value.trim();
    if (e.target.hasAttribute("data-answer")) send(card, { answer: e.target.getAttribute("data-answer"), note: note || undefined });
    else if (e.target.hasAttribute("data-send") && note) send(card, { note: note });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !e.target.closest || !e.target.closest(".g-note")) return;
    var card = e.target.closest("[data-move]"), note = e.target.value.trim();
    if (note) send(card, { note: note });
  });

  call({}).then(function (r) { draw(r.moves); }).catch(function () {});
})();
`;

/**
 * Put a run into the page. Idempotent: drawing the same run twice replaces it.
 * Every other run is hidden and loses its "active" mark; the rail gains the entry.
 */
export function intoPage(page, d) {
  const id = `run-${pad2(d.run)}`;
  let s = page;
  const block = renderRun(d);
  const { li, nav } = renderRail(d);

  // Styles and script: one tagged copy each, refreshed every run.
  s = s.replace(/\n?<style id="glance-css">[\s\S]*?<\/style>/, "").replace(/\n?<script id="glance-js">[\s\S]*?<\/script>/, "");
  s = s.replace("</head>", `<style id="glance-css">${CSS}</style></head>`);
  s = s.replace(/<\/body>/, `<script id="glance-js">${JS}</script>\n</body>`);

  // The run itself. A hand-built block with the same id (run 09 began that way) goes too.
  const marked = new RegExp(`\\s*<!-- ${id}:start -->[\\s\\S]*?<!-- ${id}:end -->\\n?`);
  const byHand = new RegExp(`\\s*(?:<!-- =+ -->\\s*<!-- =+ RUN ${pad2(d.run)} [^\\n]*-->\\s*<!-- =+ -->\\s*)?<div class="runview[^"]*" id="${id}"[\\s\\S]*?</div><!-- /${id} -->\\n?`);
  s = s.replace(marked, "\n").replace(byHand, "\n");
  s = s.replace(/<div class="runview([^"]*)" id="(run-\d+)">/g, '<div class="runview$1" id="$2" hidden>');
  const inner = s.indexOf('<div class="inner">');
  if (inner < 0) throw new Error('page has no <div class="inner">');
  const at = inner + '<div class="inner">'.length;
  s = `${s.slice(0, at)}\n\n${block}${s.slice(at)}`;

  // The rail.
  s = s.replace(new RegExp(`\\s*<li><a href="#${id}"[\\s\\S]*?</a></li>`), "");
  s = s.replace(new RegExp(`\\s*<nav class="rail-jump" data-jump="${id}"[\\s\\S]*?</nav>`), "");
  s = s.replace(/class="run active"/g, 'class="run"').replace(/<span class="rdate"><span class="dot"><\/span> /g, '<span class="rdate">');
  s = s.replace(/<nav class="rail-jump" data-jump="(run-\d+)">/g, '<nav class="rail-jump" data-jump="$1" hidden>');
  s = s.replace(/(<ul class="runs">\n)/, `$1${li}`);
  s = s.replace(/(\n\s*<nav class="rail-jump")/, `\n\n${nav.trimEnd()}\n$1`);
  // Blank lines pile up where blocks were lifted out and set down; settle them so
  // drawing the same run twice gives the same bytes.
  return s.replace(/\n(?:[ \t]*\n){2,}/g, "\n\n");
}

// ── command line ────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, flag, pagePath] = process.argv.slice(2);
  if (!file) { console.error("usage: node scripts/ig-dashboard.mjs <data.json> [--into page.html]"); process.exit(1); }
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  if (d.writeUp) d.writeUpHtml = fs.readFileSync(new URL(d.writeUp, `file://${fs.realpathSync(file)}`), "utf8");
  try {
    if (flag === "--into") {
      fs.writeFileSync(pagePath, intoPage(fs.readFileSync(pagePath, "utf8"), d));
      console.log(`✓ run ${pad2(d.run)} drawn into ${pagePath}`);
    } else process.stdout.write(renderRun(d));
  } catch (e) { console.error(e.message); process.exit(1); }
}
