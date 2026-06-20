import React from "react";

/**
 * Ribbon — a teal handbill banner with notched ends and flanking stars,
 * like the "South Knoxville Events & Rumors" strip under the masthead.
 */
export function Ribbon({ children, color = "teal", style = {}, ...rest }) {
  const colors = {
    teal: { bg: "var(--teal)", fg: "var(--on-teal)" },
    rust: { bg: "var(--rust)", fg: "var(--on-rust)" },
    green: { bg: "var(--green-bridge)", fg: "var(--on-green)" },
  };
  const c = colors[color] || colors.teal;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.7em",
        background: c.bg,
        color: c.fg,
        border: "var(--border-ink) solid var(--ink-black)",
        padding: "8px 30px",
        fontFamily: "var(--font-display)",
        fontSize: "var(--rubric-md)",
        letterSpacing: "0.01em",
        lineHeight: 1.1,
        position: "relative",
        // notched handbill ends
        clipPath:
          "polygon(0 0, 100% 0, calc(100% - 16px) 50%, 100% 100%, 0 100%, 16px 50%)",
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{ color: "var(--rust)", fontSize: "0.7em" }}>★</span>
      {children}
      <span aria-hidden="true" style={{ color: "var(--rust)", fontSize: "0.7em" }}>★</span>
    </div>
  );
}
