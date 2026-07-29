import * as React from "react";
import type { Block } from "@/lib/schema";

const pStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)",
  lineHeight: "var(--leading-body)", margin: "0 0 14px", color: "var(--ink-black)",
};
// Crosshead — the classic print device for "new scene, same story." Used inside
// compendium pieces (venue roundups) so topic shifts don't run together.
const subStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)", fontSize: "var(--label-md)", fontWeight: 600,
  letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
  color: "var(--rust)", margin: "26px 0 10px",
  display: "flex", alignItems: "center", gap: "0.55em",
};

function Runs({ runs }: { runs: NonNullable<Extract<Block, { type: "paragraph" }>["runs"]> }) {
  return <>{runs!.map((r, i) => {
    let node: React.ReactNode = r.text;
    if (r.bold) node = <strong>{node}</strong>;
    if (r.italic) node = <em>{node}</em>;
    if (r.href) node = <a href={r.href} target="_blank" rel="noopener noreferrer">{node}</a>;
    return <React.Fragment key={i}>{node}</React.Fragment>;
  })}</>;
}

function AgendaTable({ title, rows }: { title?: string; rows: { time: string; what: string }[] }) {
  return (
    <div style={{ margin: "0 0 var(--space-5)", border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--paper-bright)", boxShadow: "var(--shadow-lift)" }}>
      {title && (
        <div style={{ background: "var(--teal)", color: "var(--on-teal)", borderBottom: "var(--border-ink) solid var(--ink-black)",
          padding: "8px 14px", fontFamily: "var(--font-label)", fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden style={{ color: "var(--rust)" }}>★</span>{title}
        </div>
      )}
      <div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: "14px", padding: "9px 14px", alignItems: "baseline",
            borderBottom: i < rows.length - 1 ? "var(--border-hair) solid var(--paper-edge)" : "none" }}>
            <span style={{ flex: "none", width: "92px", fontFamily: "var(--font-label)", fontWeight: 600, fontSize: "var(--label-sm)",
              letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: "var(--rust)" }}>{r.time}</span>
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.4, color: "var(--ink-black)" }}>{r.what}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b, i) => {
    if (b.type === "subhead") return (
      <h3 key={i} style={subStyle}>
        <span aria-hidden>★</span>{b.text}
        <span aria-hidden style={{ flex: 1, borderTop: "var(--border-hair) solid var(--paper-edge)", marginLeft: "0.3em" }} />
      </h3>
    );
    if (b.type === "agenda") return <AgendaTable key={i} title={b.title} rows={b.rows} />;
    return <p key={i} style={pStyle}>{b.runs ? <Runs runs={b.runs} /> : b.text}</p>;
  })}</>;
}
