import * as React from "react";

// Sidebar doorway from the planners' page to the doers' page — flyer colors,
// deliberately loud against the newsprint around it.
const GREEN = "#CDE24A";
const INK = "#131309";

export function DirtySouthCard() {
  return (
    <a
      href="/dirtysouthparty"
      style={{
        display: "block", background: GREEN, color: INK, textDecoration: "none",
        border: `var(--border-ink) solid var(--ink-black)`, borderRadius: "var(--radius-sm)",
        padding: "14px 16px", boxShadow: "var(--shadow-press)",
      }}
    >
      <div style={{ fontFamily: "var(--font-label)", fontWeight: 700, fontSize: "1.05rem", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.25 }}>
        Wanna party in the <span style={{ background: INK, color: GREEN, padding: "0 6px", display: "inline-block", transform: "rotate(-1.5deg)" }}>Dirty South</span>?
      </div>
      <div style={{ fontFamily: "var(--font-label)", fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 6 }}>
        ★ Tonight&apos;s plan: happy hours → music → karaoke →
      </div>
    </a>
  );
}
