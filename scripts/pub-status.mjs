#!/usr/bin/env node
// The publishing desk from the command line. The page is soknoear.com/desk/<token>.
//
//   node scripts/pub-status.mjs show                    this week's checklist, in the terminal
//   node scripts/pub-status.mjs sync                    re-read the files, refresh this week + next
//   node scripts/pub-status.mjs done <task> [--note "…"] [--by claude|andy|pipeline]
//   node scripts/pub-status.mjs note <task> "…"         leave a note without ticking the box
//   node scripts/pub-status.mjs undo <task>             remove a mark (evidence can't be undone)
//   node scripts/pub-status.mjs url                     print the desk's address
//   node scripts/pub-status.mjs url --insta             the Instagram dashboard, with the key for its buttons
//   node scripts/pub-status.mjs moves                   open moves and what Andy answered (READ THIS FIRST)
//   node scripts/pub-status.mjs move <key> --title "…" --owner claude|andy [--plan "…"] [--due YYYY-MM-DD]
//   node scripts/pub-status.mjs handled <key> "what you did about his answer"
//   node scripts/pub-status.mjs close <key> "why it's finished"
//   --week YYYY-MM-DD   any date in the week you mean (an episode slug works). Default: today.
//
// The store is the site's DB on the VPS. Run this anywhere: off the VPS it forwards
// itself over ssh, so a scheduled task on the Mac mini uses the same command.
//
// Task ids: ig-review · research · draft · audio · party-plan · review · site-live ·
// party-live · newsletter · party-notice · ig-art · ig-queue · venue-auto ·
// venue-drafts · venue-sent:<venue-key> · publish-check · ig-post:<story-id>
// (docs/PUBLISHING-DESK.md says which are evidence and which need a mark.)
import { execFileSync } from "node:child_process";
import { hasStore, openStore, sync, mark, unmark, deskUrl, dashboardUrl } from "./pub-status-store.mjs";
import { mergeMarks, weekOf, todayET, CHANNELS, listMoves, pendingAnswers, putMove, handleMove, closeMove } from "./pub-status-lib.mjs";

const argv = process.argv.slice(2);
const VPS = process.env.EAR_VPS || "andy@143.244.188.235";
const REMOTE = "/var/www/soknoear";

if (!hasStore()) {
  // Single-quote every argument for the remote shell.
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  try {
    execFileSync("ssh", ["-o", "ConnectTimeout=20", VPS, `cd ${REMOTE} && node scripts/pub-status.mjs ${argv.map(q).join(" ")}`], { stdio: "inherit" });
  } catch (e) { process.exit(e.status ?? 1); }
  process.exit(0);
}

const flag = (f) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : null; };
const FLAGS = ["--week", "--slug", "--note", "--by", "--title", "--owner", "--plan", "--due"];
const positional = argv.filter((a, i) => !a.startsWith("--") && !FLAGS.includes(argv[i - 1]));
const [cmd = "show", task, text] = positional;
const date = flag("--week") ?? flag("--slug") ?? todayET();
const week = weekOf(date);

const GLYPH = { done: "✓", todo: "·", late: "!", failed: "✗", skipped: "–", missed: "✗", na: " " };

async function show() {
  const db = await openStore();
  await sync({ weeks: [week], db });
  const row = db.prepare("SELECT snapshot FROM pub_weeks WHERE week = ?").get(week);
  const marks = db.prepare("SELECT task, done, note, by, at FROM pub_marks WHERE week = ?").all(week);
  db.close();
  const w = mergeMarks(JSON.parse(row.snapshot), marks);
  console.log(`\n★ Publishing desk — week of ${w.days[0].label}${w.number ? ` · No. ${w.number}` : ""}${w.shortDate ? ` · ${w.shortDate}` : ""} · ${w.stage}`);
  console.log(`  ${w.done} of ${w.total} done · ${w.channels.map((c) => `${c.name} ${c.done}/${c.total}`).join(" · ")}\n`);
  for (const d of w.days) {
    if (!d.items.length) continue;
    console.log(`${d.isToday ? "▶" : " "} ${d.label}`);
    for (const i of d.items) console.log(`    [${GLYPH[i.state]}] ${(i.time ?? "").padEnd(8)} ${i.title}  ${`(${CHANNELS[i.channel]} · ${i.who})`}${i.detail ? ` — ${i.detail}` : ""}   ${i.id}`);
  }
  if (w.asks.length) {
    console.log("\n  AI needs to ask for permission:");
    for (const i of w.asks) console.log(`    · ${i.ask}${i.due ? ` (by ${i.due})` : ""}   ${i.id}`);
  }
  console.log("");
}

switch (cmd) {
  case "show": await show(); break;
  case "sync": {
    const out = await sync(flag("--week") || flag("--slug") ? { weeks: [week] } : {});
    for (const s of out) console.log(`synced week of ${s.week} · ${s.stage}${s.number ? ` · No. ${s.number}` : ""} · ${s.days.reduce((n, d) => n + d.items.length, 0)} tasks`);
    break;
  }
  case "done": case "note": {
    if (!task) { console.error(`usage: pub-status.mjs ${cmd} <task> ${cmd === "note" ? '"text"' : '[--note "…"]'}`); process.exit(1); }
    const w = await mark({ date, task, done: cmd === "done", note: flag("--note") ?? text ?? null, by: flag("--by") ?? "claude" });
    await sync({ weeks: [w] });
    console.log(`${cmd === "done" ? "✓" : "✎"} ${task} · week of ${w}`);
    break;
  }
  case "undo": {
    if (!task) { console.error("usage: pub-status.mjs undo <task>"); process.exit(1); }
    console.log(`removed mark ${task} · week of ${await unmark({ date, task })}`);
    break;
  }
  case "url": console.log(argv.includes("--insta") ? await dashboardUrl() : await deskUrl()); break;
  case "moves": {
    const db = await openStore();
    const moves = listMoves(db);
    const waiting = new Set(pendingAnswers(db).map((m) => m.key));
    db.close();
    if (!moves.length) { console.log("no open moves"); break; }
    console.log("");
    for (const m of moves) {
      console.log(`${waiting.has(m.key) ? "▶" : " "} ${m.title}   [${m.key}]`);
      console.log(`    ${m.owner === "claude" ? "Claude's" : "Andy's"} · opened ${m.opened}${m.due ? ` · due ${m.due}` : ""}${m.plan ? ` · ${m.plan}` : ""}`);
      if (m.answeredAt) console.log(`    Andy ${m.answeredAt.slice(0, 16).replace("T", " ")}Z: ${m.answer ?? "(note only)"}${m.note ? ` — “${m.note}”` : ""}`);
      else console.log("    no answer yet");
      if (m.handledAt) console.log(`    handled ${m.handledAt.slice(0, 10)}${m.handledNote ? ` — ${m.handledNote}` : ""}`);
    }
    console.log(waiting.size ? `\n  ${waiting.size} answer(s) not acted on yet (▶). Act, then: pub-status.mjs handled <key> "…"\n` : "\n  Every answer has been acted on.\n");
    break;
  }
  case "move": {
    const db = await openStore();
    putMove(db, { key: task, title: flag("--title"), owner: flag("--owner"), plan: flag("--plan"), due: flag("--due") });
    db.close();
    console.log(`✎ move ${task}`);
    break;
  }
  case "handled": case "close": {
    if (!task) { console.error(`usage: pub-status.mjs ${cmd} <key> "note"`); process.exit(1); }
    const db = await openStore();
    const ok = (cmd === "handled" ? handleMove : closeMove)(db, task, flag("--note") ?? text ?? null);
    db.close();
    if (!ok) { console.error(`no move called ${task}`); process.exit(1); }
    console.log(`${cmd === "handled" ? "✓ handled" : "✓ closed"} ${task}`);
    break;
  }
  default:
    console.error("usage: node scripts/pub-status.mjs [show|sync|done|note|undo|url|moves|move|handled|close] …"); process.exit(1);
}
