import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventRow } from "@/components/EventRow";
import { PastSection } from "@/components/PastSection";
import { getSearchIndex } from "@/lib/search-index";
import { groupVenueEvents, type SearchIndex } from "@/lib/search";

// One page per venue: every event the Ear has covered there, the ones still to come
// first and the ones that have been after the filigree, folded behind a fade.
// Rendered at request time so the split between the two moves on its own each day.
export const dynamic = "force-dynamic";

function resolve(index: SearchIndex, key: string) {
  const venue = index.venues.find((v) => v.key === key);
  if (!venue) return null;
  return { venue, articles: index.articles.filter((a) => a.venueKey === key) };
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const found = resolve(getSearchIndex(), key);
  if (!found) return {};
  const { venue, articles } = found;
  return {
    title: `${venue.name} — The South Knoxville Ear`,
    description: `Every event The South Knoxville Ear has covered at ${venue.name}: ${articles.length} ${articles.length === 1 ? "story" : "stories"}, coming up and past.`,
    alternates: { canonical: `/venue/${key}` },
  };
}

const kicker: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: "var(--rust)",
};

/** Under a row on its own venue's page the venue is a given, so: the episode and the place pill. */
const sub = (a: { episodeNumber: number; label: string }) => `No. ${a.episodeNumber} · ${a.label}`;

export default async function VenuePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const found = resolve(getSearchIndex(), key);
  if (!found) notFound();
  const { venue, articles } = found;
  const { upcoming, past } = groupVenueEvents(articles);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ paddingBottom: 18, borderBottom: "var(--border-ink) solid var(--ink-black)" }}>
        <div style={kicker}>Venue</div>
        {venue.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={venue.logo} alt="" style={{ display: "block", maxHeight: 96, maxWidth: 280, width: "auto", height: "auto", margin: "12px 0 6px" }} />
        )}
        <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", fontSize: "var(--display-2)", lineHeight: 1.1, margin: "8px 0 0" }}>{venue.name}</h1>
        <p style={{ ...kicker, color: "var(--ink-faded)", letterSpacing: "var(--tracking-label-tight)", margin: "8px 0 0" }}>
          {articles.length} {articles.length === 1 ? "story" : "stories"} in the Ear
          {venue.site && (
            <>
              {" · "}
              <a href={venue.site} target="_blank" rel="noopener noreferrer" style={{ color: "var(--rust)" }}>
                {venue.site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            </>
          )}
        </p>
      </header>

      <section aria-labelledby="coming-up" style={{ marginTop: 24 }}>
        <h2 id="coming-up" className="ear-results-h2">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="ear-results-none">Nothing coming up at {venue.name} &mdash; the past is below.</p>
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
