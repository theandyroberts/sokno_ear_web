import Link from "next/link";
export default function NotFound() {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "10vh 24px", textAlign: "center" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase" }}>Page Not Found</h1>
        <p style={{ fontFamily: "var(--font-body)" }}>That one wandered off down the greenway.</p>
        <p style={{ marginTop: 24 }}><Link href="/">&#9733; Back to this week&rsquo;s Ear</Link></p>
      </div>
    </main>
  );
}
