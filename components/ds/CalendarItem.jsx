"use client";
import React from "react";

/**
 * CalendarItem — one row of the "What's Happening Soon" calendar: a small tile
 * with the venue's own logo (or its name set as a wordmark when the registry has
 * no logo yet), the event title and meta, and a cue line under the meta with the
 * ★ (don't miss it) and the → (jump to the story). Stack several inside a
 * bordered well; the black day bar above each date carries the day and date.
 *
 * The date used to sit on the row as a stamped month/day block. Once the list ran
 * past a dozen rows the repeated dates were noise and the venue was buried in the
 * meta, so the date moved up into the day bar and the venue's mark took the slot
 * (Andy, 2026-10-26). `month`/`day` are still accepted so older callers keep
 * working; they are not drawn.
 *
 * With `href`, the WHOLE row is a link (usually "#story-id" — jump to the story
 * that covers the event). Rendered as <a> so right-click/new-tab work; without
 * href it stays a plain div.
 */
export function CalendarItem({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for callers that still pass the stamp
  month,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  day,
  title,
  meta,
  starred = false,
  divider = true,
  href,
  logo = null,
  logoTreatment = null,
  venueName,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const Root = href ? "a" : "div";
  const showCues = starred || !!href;
  return (
    <Root
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
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
      {/* Venue tile: the registry's logo on cream paper, ink-framed like the Dirty
          South chip, or the venue's name set small when there is no logo. The row's
          text already names the place, so the tile is decorative to a screen reader. */}
      <span
        aria-hidden="true"
        className={`ear-cal-logo${logo ? "" : " ear-cal-logo--wordmark"}`}
        data-treatment={logoTreatment ?? undefined}
        style={{
          flex: "none",
          width: "64px",
          height: "44px",
          display: "grid",
          placeItems: "center",
          border: "var(--border-ink) solid var(--ink-black)",
          borderRadius: "var(--radius-sm)",
          background: "var(--paper-cream)",
          padding: logo ? "3px" : "2px 3px",
          overflow: "hidden",
          marginTop: "1px",
        }}
      >
        {logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logo} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontWeight: 600,
              fontSize: "9px",
              lineHeight: 1.1,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textAlign: "center",
              color: "var(--ink-black)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {venueName}
          </span>
        )}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-label)", fontWeight: 600, fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label-tight)", textTransform: "uppercase", color: hover && href ? "var(--rust)" : "var(--ink-black)", lineHeight: 1.2, transition: "color 120ms ease" }}>{title}</div>
        {meta && <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-faded)", marginTop: "2px" }}>{meta}</div>}
        {showCues && (
          <div className="ear-cal-cues" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "4px", lineHeight: 1 }}>
            {starred && <span aria-hidden="true" style={{ color: "var(--rust)", fontSize: "12px" }}>★</span>}
            {href && <span aria-hidden="true" style={{ color: hover ? "var(--rust)" : "var(--ink-faded)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "13px", transition: "color 120ms ease" }}>→</span>}
          </div>
        )}
      </div>
    </Root>
  );
}
