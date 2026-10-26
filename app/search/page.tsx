import Link from "next/link";
import type { Metadata } from "next";
import { SearchForm } from "@/components/SearchForm";
import { EventRow } from "@/components/EventRow";
import { PastSection } from "@/components/PastSection";
import { VenueTile } from "@/components/VenueTile";
import { Tag } from "@/components/ds/Tag";
import { getSearchIndex } from "@/lib/search-index";
import { search, articleMeta, type SearchResults } from "@/lib/search";

// The search page. Venue and place hits sit short at the top (a logo tile, a pill);
// the events follow in two halves: what the reader can still make, soonest first,
// then after the filigree what has been, newest first and folded behind a fade.
export const dynamic = "force-dynamic";

type Query = Promise<{ q?: string | string[] }>;

function queryOf(params: { q?: string | string[] }): string {
  return (Array.isArray(params.q) ? params.q[0] : params.q ?? "").trim();
}

export async function generateMetadata({ searchParams }: { searchParams: Query }): Promise<Metadata> {
  const q = queryOf(await searchParams);
  return {
    title: `${q ? "Search the Ear — results" : "Search the Ear"} — The South Knoxville Ear`,
    description: "Find a story, a venue or a corner of SoKno in The South Knoxville Ear.",
    robots: { index: false, follow: true },
  };
}

const stories = (n: number) => `${n} ${n === 1 ? "story" : "stories"}`;

const shortRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, padding: "9px 0", borderBottom: "1px solid var(--paper-edge)" };
const shortName: React.CSSProperties = { fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--text-base)", lineHeight: 1.3, color: "var(--ink-black)", textDecoration: "none" };
const shortMeta: React.CSSProperties = { fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: "var(--ink-faded)", marginTop: 2 };

function Results({ q, results }: { q: string; results: SearchResults }) {
  const { venues, categories, upcoming, past } = results;
  const events = upcoming.length + past.length;
  if (venues.length + categories.length + events === 0) {
    return (
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", marginTop: 28 }}>
        Nothing in the Ear for &ldquo;{q}&rdquo; yet. Try a venue, a place or a word from a headline.
      </p>
    );
  }
  return (
    <>
      {venues.length > 0 && (
        <section aria-labelledby="venues" style={{ marginTop: 28 }}>
          <h2 id="venues" className="ear-results-h2">Venues</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {venues.map((v) => (
              <li key={v.key} style={shortRow}>
                <VenueTile logo={v.logo} name={v.name} />
                <div style={{ minWidth: 0 }}>
                  <Link href={v.href} style={shortName}>{v.name}</Link>
                  <div style={shortMeta}>{stories(v.count)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {categories.length > 0 && (
        <section aria-labelledby="places" style={{ marginTop: 28 }}>
          <h2 id="places" className="ear-results-h2">Places</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {categories.map((c) => (
              <li key={c.key} style={shortRow}>
                <Link href={c.href} style={{ textDecoration: "none" }}>
                  <Tag color={c.labelColor}>{c.label}</Tag>
                </Link>
                <div style={shortMeta}>{stories(c.count)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {events > 0 && (
        <>
          <section aria-labelledby="coming-up" style={{ marginTop: 28 }}>
            <h2 id="coming-up" className="ear-results-h2">Coming up</h2>
            {upcoming.length === 0 ? (
              <p className="ear-results-none">Nothing coming up for &ldquo;{q}&rdquo; &mdash; the past is below.</p>
            ) : (
              <ul className="ear-event-list">
                {upcoming.map((a) => <EventRow key={a.href} article={a} sub={articleMeta(a)} upcoming />)}
              </ul>
            )}
          </section>
          <PastSection count={past.length}>
            <ul className="ear-event-list">
              {past.map((a) => <EventRow key={a.href} article={a} sub={articleMeta(a)} upcoming={false} />)}
            </ul>
          </PastSection>
        </>
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Query }) {
  const q = queryOf(await searchParams);
  const results = q ? search(getSearchIndex(), q) : null;

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", margin: "0 0 18px" }}>
        Search the Ear{q && <> &mdash; results</>}
      </h1>
      <SearchForm q={q} className="ear-search-page" autoFocus={!q} />
      {results ? (
        <Results q={q} results={results} />
      ) : (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-faded)", marginTop: 14 }}>
          A venue, a corner of SoKno or a word from a headline.
        </p>
      )}
      <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
    </main>
  );
}
