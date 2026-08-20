import Link from "next/link";
import { getPast } from "@/lib/episodes";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The South Knoxville Ear — Past Episodes",
  description: "Every past weekend episode of The South Knoxville Ear — events and stories from around SoKno.",
  alternates: { canonical: "/archive" },
};

export default function Archive() {
  const past = getPast();
  if (past.length === 0) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "10vh 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 680 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.2, color: "var(--ink-black)", margin: 0 }}>
            &ldquo;There are far, far better things ahead than any we leave behind.&rdquo;
          </p>
          <p style={{ fontFamily: "var(--font-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", marginTop: 18 }}>&mdash; C.S. Lewis</p>
          <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
        </div>
      </main>
    );
  }
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Past Episodes</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", lineHeight: 1.6, color: "var(--ink-black)", maxWidth: 640 }}>
        Every weekend episode of The South Knoxville Ear, back to the first one — the
        events, openings, and neighborhood stories of SoKno, one weekend at a time.
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {past.map((e) => (
          <li key={e.slug} style={{ padding: "20px 0", borderBottom: "1px solid var(--paper-edge)" }}>
            <div style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)" }}>
              {e.dateLabel ?? e.date} · Vol. {e.volume} — No. {e.number}
            </div>
            <Link href={`/${e.slug}`} style={{ display: "inline-block", marginTop: 6, fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", lineHeight: 1.2, color: "var(--ink-black)", textDecoration: "none" }}>
              {e.feature.title}
            </Link>
            {e.feature.deck && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.55, color: "var(--ink-black)", margin: "6px 0 0", maxWidth: 640 }}>
                {e.feature.deck}
              </p>
            )}
            <p style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: "var(--ink-faded)", margin: "8px 0 0" }}>
              Also in this episode: {e.stories.map((s) => s.title).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
    </main>
  );
}
