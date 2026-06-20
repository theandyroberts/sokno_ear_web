import React from "react";

/**
 * Tag — a small stamped print label. Use for section rubrics ("RUMOR MILL"),
 * "HOT" flags, and category chips. Solid (filled) or outline.
 */
export function Tag({
  children,
  color = "rust",
  variant = "solid",
  size = "md",
  star = false,
  style = {},
  ...rest
}) {
  const colors = {
    rust: { bg: "var(--rust)", fg: "var(--on-rust)", line: "var(--rust)" },
    teal: { bg: "var(--teal)", fg: "var(--on-teal)", line: "var(--green-bridge)" },
    green: { bg: "var(--green-bridge)", fg: "var(--on-green)", line: "var(--green-bridge)" },
    ink: { bg: "var(--ink-black)", fg: "var(--paper-cream)", line: "var(--ink-black)" },
    gold: { bg: "var(--gold)", fg: "var(--on-gold)", line: "var(--gold)" },
  };
  const c = colors[color] || colors.rust;
  const sizes = {
    sm: { padding: "2px 8px", font: "11px" },
    md: { padding: "4px 11px", font: "var(--label-sm)" },
  };
  const s = sizes[size] || sizes.md;

  const solid = variant === "solid";
  const skin = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4em",
    fontFamily: "var(--font-label)",
    fontWeight: "var(--weight-label)",
    fontSize: s.font,
    letterSpacing: "var(--tracking-label)",
    textTransform: "uppercase",
    padding: s.padding,
    borderRadius: "var(--radius-sm)",
    border: `var(--border-hair) solid ${solid ? "var(--ink-black)" : c.line}`,
    background: solid ? c.bg : "transparent",
    color: solid ? c.fg : c.line,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    ...style,
  };
  return (
    <span style={skin} {...rest}>
      {star && <span aria-hidden="true" style={{ fontSize: "0.85em" }}>★</span>}
      {children}
    </span>
  );
}
