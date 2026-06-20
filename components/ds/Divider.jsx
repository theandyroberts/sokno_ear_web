import React from "react";

/**
 * Divider — a decorative newspaper rule. Keeps the old-print rhythm between
 * sections. Choose an ornament: star, diamond, or a plain double rule.
 */
export function Divider({
  ornament = "star",
  color = "ink",
  thickness = 2,
  style = {},
  ...rest
}) {
  const colors = {
    ink: "var(--ink-black)",
    rust: "var(--rust)",
    teal: "var(--green-bridge)",
  };
  const line = colors[color] || colors.ink;

  const rule = {
    flex: 1,
    height: 0,
    borderTop: `${thickness}px solid ${line}`,
    borderBottom: ornament === "double" ? `${thickness}px solid ${line}` : "none",
    minHeight: ornament === "double" ? `${thickness + 3}px` : 0,
  };

  const marks = {
    star: "★",
    diamond: "◆",
    flourish: "❧",
    triple: "✦ ✦ ✦",
  };

  return (
    <div
      role="separator"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        margin: "var(--space-5) 0",
        ...style,
      }}
      {...rest}
    >
      <span style={rule} />
      {ornament !== "double" && (
        <span
          aria-hidden="true"
          style={{
            color: color === "ink" ? "var(--rust)" : line,
            fontSize: "14px",
            lineHeight: 1,
            letterSpacing: "0.3em",
          }}
        >
          {marks[ornament] || marks.star}
        </span>
      )}
      <span style={rule} />
    </div>
  );
}
