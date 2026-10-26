import React from "react";

/**
 * Flourish — an old-timey filigree rule: a hairline either side of a centred
 * engraved ornament (two mirrored scrolls around a diamond), drawn inline in the
 * site's ink so it prints and scales like type. The big vertical break between
 * what is coming up and what has been on the venue, place, day and search pages;
 * reusable anywhere a plain Divider is too plain.
 */
export function Flourish({ color = "var(--ink-black)", width = 180, style = {}, ...rest }) {
  const h = Math.round((width * 28) / 180);
  const scroll = (
    <>
      {/* stem into the ornament */}
      <path d="M86 14 H 62" />
      {/* upper curl ending in a spiral */}
      <path d="M62 14 C 52 14 46 8 41 4.5 C 37 1.5 30.5 2.5 30.5 7.5 C 30.5 11.5 35.5 12.5 37.5 9.5" />
      {/* lower curl, the mirror of it */}
      <path d="M62 14 C 52 14 46 20 41 23.5 C 37 26.5 30.5 25.5 30.5 20.5 C 30.5 16.5 35.5 15.5 37.5 18.5" />
      {/* a leaf on the stem */}
      <path d="M74 14 C 71 10 66 9.5 63 13.5 C 66 17.5 71 18 74 14 Z" fill="currentColor" stroke="none" />
      {/* the trailing dots */}
      <circle cx="22" cy="14" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  );
  return (
    <div
      role="separator"
      aria-hidden="true"
      className="ear-flourish"
      style={{ display: "flex", alignItems: "center", gap: 16, color, ...style }}
      {...rest}
    >
      <span style={{ flex: 1, height: 0, borderTop: "1px solid currentColor" }} />
      <svg
        viewBox="0 0 180 28"
        width={width}
        height={h}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "block", flex: "none" }}
      >
        <g>{scroll}</g>
        <g transform="translate(180 0) scale(-1 1)">{scroll}</g>
        <path d="M90 7.5 L96.5 14 L90 20.5 L83.5 14 Z" fill="currentColor" stroke="none" />
      </svg>
      <span style={{ flex: 1, height: 0, borderTop: "1px solid currentColor" }} />
    </div>
  );
}
