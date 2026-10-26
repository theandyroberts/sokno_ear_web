import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { EventRow } from "@/components/EventRow";
import { PastSection } from "@/components/PastSection";
import { getSearchIndex } from "@/lib/search-index";
import { groupByWeekday, parseWeekday, formatMonthDay, WEEKDAY_FULL, type DayWeek } from "@/lib/search";

// One page per weekend day: this week's events on that day, earliest first, then
// after the filigree the past weeks folded behind a fade — last week's, and one more
// for every step of ?weeks= from the load-more link at the bottom of the list. Plain
// GET pagination, so it works with no JavaScript. /day/thursday normalises to /day/thu.
export const dynamic = "force-dynamic";

type Params = Promise<{ weekday: string }>;
type Query = Promise<{ weeks?: string | string[] }>;

function weeksParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 52) : 1;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { weekday } = await params;
  const wd = parseWeekday(weekday);
  if (!wd) return {};
  return {
    title: `${WEEKDAY_FULL[wd]} in SoKno — The South Knoxville Ear`,
    description: `What is on in South Knoxville this ${WEEKDAY_FULL[wd]}, and the ${WEEKDAY_FULL[wd]}s before it.`,
    alternates: { canonical: `/day/${wd}` },
  };
}

const kicker: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: "var(--rust)",
};

function Rows({ week, dayName, upcoming }: { week: DayWeek; dayName: string; upcoming?: boolean }) {
  if (week.articles.length === 0) {
    return <p className="ear-results-none">Nothing in the Ear for that {dayName}.</p>;
  }
  return (
    <ul className="ear-event-list">
      {week.articles.map((a) => <EventRow key={a.href} article={a} sub={a.venueName ?? a.label} upcoming={upcoming} />)}
    </ul>
  );
}

export default async function DayPage({ params, searchParams }: { params: Params; searchParams: Query }) {
  const { weekday } = await params;
  const wd = parseWeekday(weekday);
  if (!wd) notFound();
  if (weekday.toLowerCase() !== wd) redirect(`/day/${wd}`);

  const weeks = weeksParam((await searchParams).weeks);
  const dayName = WEEKDAY_FULL[wd];
  const all = groupByWeekday(getSearchIndex(), wd);
  if (all.length === 0) notFound();
  const [thisWeek, ...earlier] = all;
  const shown = earlier.slice(0, weeks);
  const more = earlier.length > weeks;
  const pastCount = shown.reduce((n, w) => n + w.articles.length, 0);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ paddingBottom: 14, borderBottom: "var(--border-ink) solid var(--ink-black)" }}>
        <div style={kicker}>{dayName} · {formatMonthDay(thisWeek.date)}</div>
        <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", fontSize: "var(--display-2)", lineHeight: 1.1, margin: "6px 0 0" }}>{dayName}</h1>
        <nav aria-label="Other days" style={{ ...kicker, color: "var(--ink-faded)", letterSpacing: "var(--tracking-label-tight)", marginTop: 8 }}>
          {(["thu", "fri", "sat", "sun"] as const).map((d, i) => (
            <span key={d}>
              {i > 0 && " · "}
              {d === wd ? <span aria-current="page" style={{ color: "var(--ink-black)" }}>{WEEKDAY_FULL[d]}</span> : <Link href={`/day/${d}`} style={{ color: "var(--rust)", textDecoration: "none" }}>{WEEKDAY_FULL[d]}</Link>}
            </span>
          ))}
        </nav>
      </header>

      {/* This week's day: the prominent set when it is still ahead; each row judges itself by today's date. */}
      <section aria-labelledby="this-week" style={{ marginTop: 24 }}>
        <h2 id="this-week" className="ear-results-h2">This {dayName}</h2>
        <Rows week={thisWeek} dayName={dayName} />
      </section>

      <PastSection count={pastCount} defaultOpen={weeks > 1}>
        {shown.map((week, i) => (
          <section key={week.slug} aria-label={`${dayName} · ${formatMonthDay(week.date)}`}>
            <div className="ear-event-break" role="separator">
              <span>{i === 0 ? `Last ${dayName}` : dayName} · {formatMonthDay(week.date)}</span>
            </div>
            <Rows week={week} dayName={dayName} upcoming={false} />
          </section>
        ))}
        {more && (
          <p style={{ marginTop: 28, textAlign: "center" }}>
            <Link
              href={`/day/${wd}?weeks=${weeks + 1}`}
              className="ear-day-chip"
              style={{ display: "inline-block", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", padding: "8px 18px", border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-sm)", color: "var(--ink-black)", textDecoration: "none", background: "var(--paper-bright)" }}
            >
              Load more {dayName}s
            </Link>
          </p>
        )}
      </PastSection>

      <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
    </main>
  );
}
