import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventRow } from "@/components/EventRow";
import { PastSection } from "@/components/PastSection";
import { getSearchIndex } from "@/lib/search-index";
import { groupVenueEvents, PLACE_NOTES, type SearchIndex, type ArticleEntry } from "@/lib/search";

// One page per location pill (Old Sevier, Kern's, Ijams Nature Center …): the
// stories filed under it, what is still to come first and what has been after the
// filigree, newest first. The dim line under each row carries the episode and venue.
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

/** Under a row on a place page: the episode and the venue, when one is named. */
const sub = (a: ArticleEntry) => [`No. ${a.episodeNumber}`, a.venueName].filter(Boolean).join(" · ");

export default async function PlacePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const found = resolve(getSearchIndex(), key);
  if (!found) notFound();
  const { category, articles } = found;
  const { upcoming, past } = groupVenueEvents(articles);
  const episodes = new Set(articles.map((a) => a.slug)).size;
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
          {articles.length} {articles.length === 1 ? "story" : "stories"} across {episodes} {episodes === 1 ? "episode" : "episodes"}
        </p>
      </header>

      <section aria-labelledby="coming-up" style={{ marginTop: 28 }}>
        <h2 id="coming-up" className="ear-results-h2">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="ear-results-none">Nothing coming up in {category.label} &mdash; the past is below.</p>
        ) : (
          <ul className="ear-event-list">
            {upcoming.map((a) => <EventRow key={a.href} article={a} sub={sub(a)} upcoming />)}
          </ul>
        )}
      </section>

      <PastSection count={past.length}>
        <ul className="ear-event-list">
          {past.map((a) => <EventRow key={a.href} article={a} sub={sub(a)} upcoming={false} />)}
        </ul>
      </PastSection>

      <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
    </main>
  );
}
