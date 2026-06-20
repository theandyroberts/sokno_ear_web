import * as React from "react";

const Page = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>
);

export function Footer() {
  return (
    <footer style={{ background: "var(--ink-black)", color: "var(--paper-cream)", borderTop: "var(--border-heavy) solid var(--ink-black)" }}>
      <Page style={{ padding: "30px 24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <img className="ear-foot-img" src="/assets/spots/foot_dog.png" alt="" style={{ height: 84, width: "auto", filter: "invert(1) brightness(1.05) sepia(0.15)" }} />
          <div style={{ textAlign: "center", flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--rubric-lg)", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 6 }}>
              <span style={{ color: "var(--rust)" }}>★</span> South Knoxville Events &amp; Rumors <span style={{ color: "var(--rust)" }}>★</span>
            </div>
            <a href="https://soknoear.com" style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--teal)", textDecoration: "none" }}>soknoear.com</a>
            <div style={{ marginTop: 6 }}>
              <a href="https://www.instagram.com/soknoear" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--teal)", textDecoration: "none" }}>★ Follow @soknoear</a>
            </div>
          </div>
          <img className="ear-foot-img" src="/assets/spots/foot_bridge.png" alt="" style={{ height: 70, width: "auto", filter: "invert(1) brightness(1.05) sepia(0.15)" }} />
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--paper-shadow)", marginTop: 22, paddingTop: 18, borderTop: "var(--border-hair) solid #4A4740" }}>
          <a href="/about" style={{ color: "var(--paper-shadow)", textDecoration: "none" }}>About the Ear</a><span style={{ color: "var(--rust)" }}>·</span>
          <a href="/archive" style={{ color: "var(--paper-shadow)", textDecoration: "none" }}>Past Issues</a>
        </div>
        <div style={{ textAlign: "center", marginTop: 14, fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", color: "var(--paper-edge)" }}>
          Read by locals. Loved by locals. South Knoxville, all the way.
        </div>
      </Page>
    </footer>
  );
}
