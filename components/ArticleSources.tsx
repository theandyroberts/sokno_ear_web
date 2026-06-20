import * as React from "react";
import type { Source } from "@/lib/schema";

// Attribution line at the foot of an article. Sources with a url render as links;
// sources without one render as plain credit text (e.g. "Info from A. Roberts").
export function ArticleSources({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div
      style={{
        marginTop: "var(--space-4)",
        paddingTop: "10px",
        borderTop: "var(--border-hair) solid var(--paper-edge)",
        fontFamily: "var(--font-label)",
        fontSize: "var(--label-sm)",
        letterSpacing: "var(--tracking-label-tight)",
        textTransform: "uppercase",
        color: "var(--ink-faded)",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 10px",
        alignItems: "baseline",
      }}
    >
      <span style={{ color: "var(--rust)" }}>{sources.length > 1 ? "Sources" : "Source"}:</span>
      {sources.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden style={{ color: "var(--paper-edge)" }}>·</span>}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>
              {s.label}
            </a>
          ) : (
            <span>{s.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
