/**
 * The venue's mark on a cream tile — the same 64×44 ink-framed tile the sidebar
 * calendar draws (components/ds/CalendarItem.jsx), for a venue hit on the search
 * page. The registry's logo when it has one, else the name set small as a wordmark.
 * The row's text names the venue, so the tile is decorative to a screen reader.
 */
export function VenueTile({ logo, name }: { logo: string | null; name: string }) {
  return (
    <span
      aria-hidden="true"
      className={`ear-cal-logo ear-venue-tile${logo ? "" : " ear-cal-logo--wordmark"}`}
      style={{
        flex: "none",
        width: 64,
        height: 44,
        display: "grid",
        placeItems: "center",
        border: "var(--border-ink) solid var(--ink-black)",
        borderRadius: "var(--radius-sm)",
        background: "var(--paper-cream)",
        padding: logo ? 3 : "2px 3px",
        overflow: "hidden",
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
      ) : (
        <span
          style={{
            fontFamily: "var(--font-label)",
            fontWeight: 600,
            fontSize: 9,
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
          {name}
        </span>
      )}
    </span>
  );
}
