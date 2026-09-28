import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDeskWeek, isDeskToken } from "@/lib/desk";
import { DeskCheck, DeskRefresh } from "@/components/DeskCheck";
import type { SettledItem, ChannelKey } from "@/scripts/pub-status-lib.mjs";

// The publishing desk: one week, every channel, every box. Private by address —
// the token comes from `node scripts/pub-status.mjs url`. Reads the DB per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publishing desk · The South Knoxville Ear",
  robots: { index: false, follow: false },
};

const CHANNEL_COLOR: Record<ChannelKey, string> = {
  site: "var(--ink-black)", party: "var(--rust-dark)", instagram: "var(--green-bridge)", venues: "#2F5F8A",
};
const STAGE = { published: "Published", draft: "Draft at /next", "not-started": "Not started" } as const;

function ago(iso: string | null) {
  if (!iso) return "never";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 2) return "just now";
  if (min < 90) return `${min} min ago`;
  if (min < 36 * 60) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 1440)} days ago`;
}

function Task({ i, token, week }: { i: SettledItem; token: string; week: string }) {
  return (
    <li className={`desk-task desk-task--${i.state}`}>
      <DeskCheck token={token} week={week} task={i.id} state={i.state} locked={i.locked} label={i.title} />
      <div className="desk-task-body">
        <div className="desk-task-line">
          <span className="desk-task-title">{i.title}</span>
          {i.dueToday && <span className="desk-flag desk-flag--due">due today</span>}
          {i.state === "late" && <span className="desk-flag">late</span>}
          {i.state === "failed" && <span className="desk-flag">failed</span>}
          {i.state === "missed" && <span className="desk-flag desk-flag--quiet">missed</span>}
          {i.state === "skipped" && <span className="desk-flag desk-flag--quiet">skipped</span>}
          {i.state === "na" && <span className="desk-flag desk-flag--quiet">not needed</span>}
        </div>
        <div className="desk-task-meta">
          <span className="desk-chan" style={{ color: CHANNEL_COLOR[i.channel] }}>
            <i style={{ background: CHANNEL_COLOR[i.channel] }} />{CHANNEL_NAME[i.channel]}
          </span>
          <span>{i.who}</span>
          {i.time && <span>{i.time}</span>}
          {i.detail && <span className="desk-detail">{i.detail}</span>}
        </div>
      </div>
    </li>
  );
}

const CHANNEL_NAME: Record<ChannelKey, string> = { site: "SoKnoEar.com", party: "Dirty South party", instagram: "Instagram", venues: "Venue notes" };

export default async function DeskPage({ params, searchParams }: {
  params: Promise<{ token: string }>; searchParams: Promise<{ w?: string }>;
}) {
  const { token } = await params;
  const { w: asked } = await searchParams;
  const store = db();
  if (!isDeskToken(store, token)) notFound();
  const w = getDeskWeek(store, asked);
  const base = `/desk/${token}`;
  const pct = w.total ? Math.round((w.done / w.total) * 100) : 0;

  return (
    <main className="desk">
      <style>{CSS}</style>
      <DeskRefresh />

      <header className="desk-head">
        <p className="desk-kicker">★ The South Knoxville Ear · Publishing desk</p>
        <h1>Week of {w.days[0].label} – {w.days[6].label}</h1>
        <p className="desk-sub">
          {w.number ? <b>No. {w.number}</b> : <b>Next episode</b>}
          {w.shortDate && <> · covers {w.shortDate}</>}
          {" · "}<span className={`desk-stage desk-stage--${w.stage}`}>{STAGE[w.stage]}</span>
        </p>
        {w.feature && <p className="desk-feature">“{w.feature}”</p>}
        <nav className="desk-nav" aria-label="Weeks">
          <Link href={`${base}?w=${w.prev}`}>← Earlier</Link>
          {!w.isThisWeek && <Link href={base}>This week</Link>}
          <Link href={`${base}?w=${w.next}`}>Later →</Link>
          {/* The key rides in the fragment so the dashboard's answer buttons work; it never reaches a server log. */}
          <a href={`https://note15.com/insta/soknoear#k=${token}`} rel="noreferrer">Instagram dashboard ↗</a>
        </nav>
      </header>

      <section className="desk-summary" aria-label="Progress">
        <div className="desk-total">
          <div className="desk-total-n">{w.done}<span> of {w.total}</span></div>
          <div className="desk-bar" role="img" aria-label={`${pct}% done`}><i style={{ width: `${pct}%` }} /></div>
        </div>
        {w.channels.map((c) => (
          <div key={c.key} className="desk-chancard" style={{ borderTopColor: CHANNEL_COLOR[c.key] }}>
            <div className="desk-chancard-name">{c.name}</div>
            <div className="desk-chancard-n">{c.done}<span> / {c.total}</span></div>
            {c.trouble > 0 && <div className="desk-chancard-trouble">{c.trouble} need{c.trouble === 1 ? "s" : ""} a look</div>}
          </div>
        ))}
      </section>

      <section className="desk-waiting" aria-label="Waiting on Andy">
        <h2>Waiting on Andy</h2>
        {w.waiting.length === 0
          ? <p className="desk-clear">Nothing. Every box with your name on it is ticked.</p>
          : <ul>{w.waiting.map((i) => <Task key={i.id} i={i} token={token} week={w.week} />)}</ul>}
      </section>

      <section aria-label="The week">
        {w.days.map((d) => (
          <div key={d.date} className={`desk-day${d.isToday ? " desk-day--today" : ""}${d.items.length ? "" : " desk-day--empty"}`}>
            <div className="desk-day-head">
              <span className="desk-dow">{d.dow}</span>
              <span className="desk-date">{d.label.slice(4)}</span>
              {d.isToday && <span className="desk-todaytag">today</span>}
            </div>
            {d.items.length
              ? <ul>{d.items.map((i) => <Task key={i.id} i={i} token={token} week={w.week} />)}</ul>
              : <p className="desk-nothing">Nothing scheduled.</p>}
          </div>
        ))}
      </section>

      <footer className="desk-foot">
        <p>
          <span className="desk-box desk-box--done desk-box--fixed desk-box--key">✓</span> with a grey edge is ticked by the pipeline from its own files and can’t be changed here.
          A thin empty box is the pipeline’s too, and fills itself in. A heavy empty box is yours, or Claude’s, to tick.
        </p>
        <p>Last synced {ago(w.syncedAt)}. The Instagram poster re-syncs every 15 minutes; this page refreshes itself every minute.</p>
      </footer>
    </main>
  );
}

const CSS = `
.desk{max-width:860px;margin:0 auto;padding:36px 20px 64px;font-family:var(--font-body);color:var(--ink-black)}
.desk ul{list-style:none;margin:0;padding:0}
.desk-kicker{font-family:var(--font-label);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--rust);margin:0 0 8px}
.desk-head h1{font-family:var(--font-body);font-weight:700;font-size:clamp(26px,5vw,38px);line-height:1.1;margin:0 0 8px}
.desk-sub{font-size:16px;margin:0;color:var(--ink-faded)}
.desk-sub b{color:var(--ink-black)}
.desk-feature{font-style:italic;color:var(--ink-faded);margin:6px 0 0;font-size:15px}
.desk-stage{font-family:var(--font-label);font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border:1px solid var(--ink-black);border-radius:3px;white-space:nowrap}
.desk-stage--published{background:var(--green-bridge);border-color:var(--green-bridge);color:var(--paper-cream)}
.desk-stage--draft{background:var(--gold);border-color:var(--gold)}
.desk-nav{display:flex;gap:18px;margin:16px 0 0;font-family:var(--font-label);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.desk-nav a{color:var(--rust);text-decoration:none;padding:6px 0}
.desk-nav a:hover{color:var(--rust-dark);text-decoration:underline}

.desk-summary{display:grid;grid-template-columns:1.3fr repeat(4,1fr);gap:10px;margin:26px 0 22px}
.desk-total,.desk-chancard{background:var(--paper-bright);border:1px solid var(--ink-black);border-radius:6px;padding:12px 14px}
.desk-chancard{border-top-width:4px}
.desk-total-n,.desk-chancard-n{font-weight:700;font-size:30px;line-height:1;font-variant-numeric:tabular-nums}
.desk-total-n span,.desk-chancard-n span{font-size:15px;font-weight:400;color:var(--ink-faded)}
.desk-chancard-n{font-size:24px;margin-top:6px}
.desk-chancard-name{font-family:var(--font-label);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faded)}
.desk-chancard-trouble{font-family:var(--font-label);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--rust);margin-top:6px}
.desk-bar{height:8px;background:var(--paper-shadow);border-radius:4px;margin-top:12px;overflow:hidden}
.desk-bar i{display:block;height:100%;background:var(--green-bridge)}

.desk-waiting{border:2px solid var(--rust);border-radius:6px;padding:16px 18px 8px;margin-bottom:28px;background:var(--paper-bright)}
.desk-waiting h2{font-family:var(--font-label);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--rust);margin:0 0 6px;font-weight:400}
.desk-clear{margin:4px 0 10px;color:var(--ink-faded)}

.desk-day{display:grid;grid-template-columns:92px 1fr;gap:0 18px;border-top:1px solid var(--ink-black);padding:14px 0 6px}
.desk-day--empty{padding-bottom:12px}
.desk-day--today{background:linear-gradient(90deg,rgba(216,167,37,.22),rgba(216,167,37,0) 70%);margin:0 -12px;padding-left:12px;padding-right:12px;border-top-width:2px}
.desk-day-head{display:flex;flex-direction:column;gap:2px;padding-top:2px}
.desk-dow{font-weight:700;font-size:22px;line-height:1}
.desk-date{font-family:var(--font-label);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faded)}
.desk-todaytag{font-family:var(--font-label);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--rust);margin-top:4px}
.desk-nothing{margin:4px 0 0;color:var(--ink-faded);font-size:14.5px}

.desk-task{display:grid;grid-template-columns:26px 1fr;gap:0 12px;padding:7px 0 9px;align-items:start}
.desk-task+.desk-task{border-top:1px dashed var(--paper-edge)}
.desk-task-line{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.desk-task-title{font-size:16.5px;line-height:1.3;overflow-wrap:anywhere}
.desk-task--done .desk-task-title{color:var(--ink-faded)}
.desk-task--skipped .desk-task-title,.desk-task--na .desk-task-title,.desk-task--missed .desk-task-title{color:var(--ink-faded);text-decoration:line-through;text-decoration-color:var(--paper-edge)}
.desk-task-meta{display:flex;gap:4px 12px;flex-wrap:wrap;font-family:var(--font-label);font-size:11px;letter-spacing:.04em;color:var(--ink-faded);margin-top:3px}
.desk-chan{display:inline-flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:.08em}
.desk-chan i{width:8px;height:8px;border-radius:2px;display:inline-block}
.desk-detail{font-family:var(--font-body);font-size:13.5px;letter-spacing:0;overflow-wrap:anywhere}
.desk-flag{font-family:var(--font-label);font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:var(--rust);color:var(--paper-cream);padding:2px 6px;border-radius:3px}
.desk-flag--due{background:var(--gold);color:var(--ink-black)}
.desk-flag--quiet{background:transparent;color:var(--ink-faded);border:1px solid var(--paper-edge)}

.desk-box{width:24px;height:24px;border:2px solid var(--ink-black);border-radius:4px;background:var(--paper-bright);display:inline-flex;align-items:center;justify-content:center;font:700 15px/1 var(--font-body);color:var(--paper-cream);padding:0;margin-top:1px;cursor:pointer;flex:none}
button.desk-box:hover{box-shadow:0 0 0 3px rgba(49,93,84,.25)}
button.desk-box:focus-visible{outline:3px solid var(--rust);outline-offset:2px}
button.desk-box:disabled{opacity:.6;cursor:progress}
.desk-box--fixed{cursor:default}
.desk-box--done{background:var(--green-bridge);border-color:var(--green-bridge)}
.desk-box--done.desk-box--fixed{border-color:var(--ink-faded);box-shadow:inset 0 0 0 1px var(--paper-cream)}
.desk-box--late{border-color:var(--rust)}
.desk-box--fixed.desk-box--todo,.desk-box--fixed.desk-box--late{background:transparent;border-width:1px;border-color:var(--ink-faded)}
.desk-box--failed{background:var(--rust);border-color:var(--rust)}
.desk-box--missed{background:transparent;border-color:var(--paper-edge);color:var(--ink-faded)}
.desk-box--skipped,.desk-box--na{background:transparent;border:2px dashed var(--paper-edge);color:var(--ink-faded)}
.desk-box--error{border-color:var(--rust);box-shadow:0 0 0 3px rgba(169,74,52,.3)}
.desk-box--key{width:16px;height:16px;font-size:10px;vertical-align:-3px;margin:0 2px 0 0}

.desk-foot{margin-top:26px;border-top:1px solid var(--ink-black);padding-top:14px;font-size:13.5px;color:var(--ink-faded)}
.desk-foot p{margin:0 0 6px}

@media (max-width:720px){
  .desk-summary{grid-template-columns:1fr 1fr}
  .desk-total{grid-column:1 / -1}
  .desk-day{grid-template-columns:1fr;gap:6px}
  .desk-day-head{flex-direction:row;align-items:baseline;gap:8px}
  .desk-todaytag{margin-top:0}
}
`;
