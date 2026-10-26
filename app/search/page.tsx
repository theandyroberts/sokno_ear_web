import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { getSearchIndex } from "@/lib/search-index";
import { search, articleMeta, timeCell, type SearchResults } from "@/lib/search";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Search — The South Knoxville Ear",
  description: "Find a story, a venue or a corner of SoKno in The South Knoxville Ear.",
  robots: { index: false, follow: true },
};

const kicker: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: "var(--rust)",
};

const tag: React.CSSProperties = {
  ...kicker,
  color: "var(--ink-faded)",
  letterSpacing: "var(--tracking-label-tight)",
  width: 68,
  flex: "0 0 68px",
  paddingTop: 4,
};

const meta: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "var(--tracking-label-tight)",
  textTransform: "uppercase",
  color: "var(--ink-faded)",
  marginTop: 2,
};

const name: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  fontSize: "var(--text-base)",
  lineHeight: 1.3,
  color: "var(--ink-black)",
  textDecoration: "none",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ ...kicker, margin: "0 0 6px", paddingBottom: 6, borderBottom: "var(--border-hair) solid var(--ink-black)" }}>{title}</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{children}</ul>
    </section>
  );
}

function Row({ type, href, label, sub, time }: { type: string; href: string; label: string; sub: string; time?: string }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--paper-edge)" }}>
      <span style={tag}>{type}</span>
      {time !== undefined && <span className="ear-event-time" style={{ paddingTop: 4 }}>{time}</span>}
      <div style={{ minWidth: 0 }}>
        <Link href={href} style={name} className="ear-clamp-2">{label}</Link>
        <div style={meta}>{sub}</div>
      </div>
    </li>
  );
}

function Results({ q, results }: { q: string; results: SearchResults }) {
  const total = results.venues.length + results.categories.length + results.articles.length;
  if (total === 0) {
    return (
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", marginTop: 28 }}>
        Nothing in the Ear for &ldquo;{q}&rdquo; yet. Try a venue, a place or a word from a headline.
      </p>
    );
  }
  return (
    <>
      {results.venues.length > 0 && (
        <Section title="Venues">
          {results.venues.map((v) => (
            <Row key={v.key} type="Venue" href={v.href} label={v.name} sub={`${v.count} ${v.count === 1 ? "story" : "stories"}`} />
          ))}
        </Section>
      )}
      {results.categories.length > 0 && (
        <Section title="Places">
          {results.categories.map((c) => (
            <Row key={c.key} type="Place" href={c.href} label={c.label} sub={`${c.count} ${c.count === 1 ? "story" : "stories"}`} />
          ))}
        </Section>
      )}
      {results.articles.length > 0 && (
        <Section title="Articles">
          {results.articles.map((a) => (
            <Row key={a.href} type="Article" href={a.href} label={a.title} sub={articleMeta(a)} time={timeCell(a)} />
          ))}
        </Section>
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q ?? "").trim();
  const results = q ? search(getSearchIndex(), q) : null;

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", margin: "0 0 18px" }}>Search the Ear</h1>
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
