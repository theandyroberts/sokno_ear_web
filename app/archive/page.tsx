import Link from "next/link";
import { getPast } from "@/lib/editions";

export const dynamic = "force-dynamic";
export const metadata = { title: "The South Knoxville Ear — Past Issues" };

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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Past Issues</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {past.map((e) => (
          <li key={e.slug} style={{ padding: "12px 0", borderBottom: "1px solid var(--paper-edge)" }}>
            <Link href={`/${e.slug}`}>{e.dateLabel ?? e.date} &mdash; Vol. {e.volume} No. {e.number}</Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 36 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
    </main>
  );
}
