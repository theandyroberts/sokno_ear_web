import * as React from "react";
import type { Block } from "@/lib/schema";

const pStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-base)",
  lineHeight: "var(--leading-body)", margin: "0 0 14px", color: "var(--ink-black)",
};
const subStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)", fontSize: "var(--label-md)",
  letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
  color: "var(--rust)", margin: "18px 0 8px",
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

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b, i) => {
    if (b.type === "subhead") return <h3 key={i} style={subStyle}>{b.text}</h3>;
    return <p key={i} style={pStyle}>{b.runs ? <Runs runs={b.runs} /> : b.text}</p>;
  })}</>;
}
