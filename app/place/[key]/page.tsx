import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventRow } from "@/components/EventRow";
import { getSearchIndex } from "@/lib/search-index";
import { groupByEpisode, PLACE_NOTES, type SearchIndex } from "@/lib/search";

// One page per location pill (Old Sevier, Kern's, Ijams Nature Center …): the
// stories filed under it, episode by episode, newest first. A different shape from
// the venue page on purpose — a place is a run of weeks, a venue is a calendar.
export const dynamic = "force-dynamic";

const PILL_COLOR: Record<string, string> = {
  rust: "var(--rust)",
  teal: "var(--green-bridge)", // the teal itself is too pale for type on cream; the pill's outline colour
  green: "var(--green-bridge)",
  ink: "var(--ink-black)",
  gold: "var(--gold)",
};

function resolve(index: SearchIndex, key: string) {
  const category = index.categories.find((c) => c.key === key);
  if (!category) return null;
  return { category, articles: index.articles.filter((a) => a.categoryKey === key) };
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const found = resolve(getSearchIndex(), key);
  if (!found) return {};
  const { category, articles } = found;
  return {
    title: `${category.label} — The South Knoxville Ear`,
    description: PLACE_NOTES[key] ?? `${articles.length} stories from ${category.label} in The South Knoxville Ear.`,
    alternates: { canonical: `/place/${key}` },
  };
}

const kicker: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: "var(--ink-faded)",
};

export default async function PlacePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const found = resolve(getSearchIndex(), key);
  if (!found) notFound();
  const { category, articles } = found;
  const groups = groupByEpisode(articles);
  const color = PILL_COLOR[category.labelColor] ?? "var(--rust)";

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <header>
        <div style={kicker}>Place</div>
        <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", fontSize: "var(--display-2)", lineHeight: 1.1, color, margin: "6px 0 0" }}>
          {category.label}
        </h1>
        {PLACE_NOTES[key] && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", lineHeight: 1.5, color: "var(--ink-black)", maxWidth: 640, margin: "10px 0 0" }}>
            {PLACE_NOTES[key]}
          </p>
        )}
        <p style={{ ...kicker, letterSpacing: "var(--tracking-label-tight)", margin: "8px 0 0" }}>
          {articles.length} {articles.length === 1 ? "story" : "stories"} across {groups.length} {groups.length === 1 ? "episode" : "episodes"}
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.slug} aria-labelledby={`ep-${g.slug}`} style={{ marginTop: 28 }}>
          <h2 id={`ep-${g.slug}`} style={{ margin: 0, paddingBottom: 6, borderBottom: "var(--border-hair) solid var(--ink-black)", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--ink-black)" }}>
            <Link href={`/${g.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
              No. {g.number} · {g.shortDate ?? g.date}
            </Link>
          </h2>
          <ul className="ear-event-list ear-event-list--compact">
            {g.articles.map((a) => <EventRow key={a.href} article={a} sub={a.venueName ?? a.label} />)}
          </ul>
        </section>
      ))}

      <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
    </main>
  );
}
