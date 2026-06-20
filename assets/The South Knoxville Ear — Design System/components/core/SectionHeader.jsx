import React from "react";

/**
 * SectionHeader — a printed rubric like "TOP STORIES & EVENTS", centered or
 * left-aligned, flanked by ornamental rules. The backbone of the one-page
 * scroll: each section of the weekly page opens with one of these.
 */
export function SectionHeader({
  children,
  align = "center",
  ornament = "diamond",
  id,
  style = {},
  ...rest
}) {
  const marks = { diamond: "◆", star: "★", flourish: "❧" };
  const mark = marks[ornament] || marks.diamond;

  const rule = {
    flex: align === "center" ? 1 : "none",
    width: align === "center" ? "auto" : "56px",
    height: 0,
    borderTop: "2px solid var(--ink-black)",
  };
  const orn = (
    <span aria-hidden="true" style={{ color: "var(--rust)", fontSize: "13px", letterSpacing: "0.25em", lineHeight: 1 }}>{mark}</span>
  );

  return (
    <div
      id={id}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: "16px",
        margin: "0 0 var(--space-5)",
        ...style,
      }}
      {...rest}
    >
      {align === "center" && <span style={rule} />}
      {align === "center" && orn}
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--rubric-lg)",
          letterSpacing: "var(--tracking-rubric)",
          textTransform: "uppercase",
          color: "var(--ink-black)",
          margin: 0,
          lineHeight: 1.05,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </h2>
      {orn}
      <span style={rule} />
    </div>
  );
}
