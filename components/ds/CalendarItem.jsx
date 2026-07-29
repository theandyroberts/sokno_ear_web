"use client";
import React from "react";

/**
 * CalendarItem — one row of the "What's Happening Soon" calendar: a stamped
 * date block, the event title and meta, and a star. Stack several inside a
 * bordered well.
 *
 * With `href`, the WHOLE row is a link (usually "#story-id" — jump to the story
 * that covers the event). Rendered as <a> so right-click/new-tab work; without
 * href it stays a plain div.
 */
export function CalendarItem({
  month,
  day,
  title,
  meta,
  starred = false,
  divider = true,
  href,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const Root = href ? "a" : "div";
  return (
    <Root
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "12px 4px",
        borderBottom: divider ? "var(--border-hair) solid var(--paper-edge)" : "none",
        background: hover ? "var(--paper-shadow)" : "transparent",
        transition: "background-color 120ms ease",
        textDecoration: "none",
        color: "inherit",
        cursor: href ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          flex: "none",
          width: "52px",
          textAlign: "center",
          border: "var(--border-ink) solid var(--ink-black)",
          borderRadius: "var(--radius-sm)",
          background: "var(--paper-cream)",
          padding: "4px 0 5px",
          lineHeight: 1,
        }}
      >
        <div style={{ fontFamily: "var(--font-label)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--rust)" }}>{month}</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--ink-black)", marginTop: "2px" }}>{day}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-label)", fontWeight: 600, fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: hover && href ? "var(--rust)" : "var(--ink-black)", lineHeight: 1.2, transition: "color 120ms ease" }}>{title}</div>
        {meta && <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-faded)", marginTop: "2px" }}>{meta}</div>}
      </div>

      {starred && <span aria-hidden="true" style={{ flex: "none", color: "var(--rust)", fontSize: "15px" }}>★</span>}
      {href && <span aria-hidden="true" style={{ flex: "none", color: hover ? "var(--rust)" : "var(--ink-faded)", fontFamily: "var(--font-body)", fontWeight: 700, transition: "color 120ms ease" }}>→</span>}
    </Root>
  );
}
