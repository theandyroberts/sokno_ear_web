"use client";
import * as React from "react";

// Sidebar card + lightbox for Andy's "Party in the Dirty South" festive map.
// The /dirtysouthparty page frames the same map in acid green; here on the main
// site it hangs like a framed print — cream mat inside an ink frame.

const MAP_SRC = "/assets/dirty_south_festive_map.jpg";
const MAP_ALT =
  "Party in the Dirty South — festive map of the Old Sevier waterfront: Kern's Food Hall, Honeybee Coffee, Hi-Wire, Fly by Night, Southside Garage, Alliance Brewing, Earl's, South Coast Pizza, Angry Dumplings, The Pink Cactus, Trailhead Beer Market, Suttree Landing Park, and the crawl route along Sevier Ave";

const bandStyle: React.CSSProperties = {
  background: "var(--teal)", color: "var(--on-teal)",
  borderBottom: "var(--border-ink) solid var(--ink-black)", padding: "10px 16px",
  fontFamily: "var(--font-label)", fontSize: "var(--label-md)",
  letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
  display: "flex", alignItems: "center", gap: 8,
};

export function PartyMapCard() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <section style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-lift)" }}>
      <div style={bandStyle}>
        <span aria-hidden style={{ color: "var(--rust)" }}>★</span>Party in the Dirty South
      </div>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open the Dirty South map full size"
        style={{ display: "block", width: "100%", padding: 0, margin: 0, border: "none", background: "none", cursor: "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAP_SRC} alt={MAP_ALT} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderBottom: "var(--border-hair) solid var(--paper-edge)" }} />
      </button>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5, color: "var(--ink-black)", margin: 0, padding: "10px 16px 12px" }}>
        The night side of SoKno, mapped — every bar, kitchen, and stage across the bridge.
        Tap the map to zoom, or see <a href="/party" style={{ color: "var(--rust)", fontWeight: 700 }}>the night-by-night plan</a>.
      </p>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Party in the Dirty South — map"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 60, background: "rgba(23,21,18,0.9)",
            display: "grid", placeItems: "center", padding: 18, cursor: "zoom-out",
          }}
        >
          <figure style={{ margin: 0, maxWidth: "min(96vw, 1400px)" }}>
            {/* framed print: ink frame around a cream mat */}
            <div style={{ border: "5px solid var(--ink-black)", background: "var(--paper-cream)", padding: "clamp(8px, 1.6vw, 18px)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MAP_SRC} alt={MAP_ALT} style={{ display: "block", maxWidth: "100%", maxHeight: "76vh", border: "1px solid var(--paper-edge)" }} />
            </div>
            <figcaption
              onClick={(e) => e.stopPropagation()}
              style={{
                textAlign: "center", marginTop: 12, fontFamily: "var(--font-label)",
                fontSize: "var(--label-sm)", letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase", color: "var(--paper-cream)", cursor: "auto",
              }}
            >
              Festive guide · not to scale · plan the night at{" "}
              <a href="/party" style={{ color: "var(--gold)", fontWeight: 700 }}>soknoear.com/party</a>
            </figcaption>
          </figure>
          <button
            aria-label="Close map"
            onClick={() => setOpen(false)}
            style={{
              position: "absolute", top: 14, right: 14, padding: "8px 16px",
              fontFamily: "var(--font-label)", fontWeight: "var(--weight-label)",
              fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase", background: "var(--rust)", color: "var(--on-rust)",
              border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-sm)", cursor: "pointer",
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </section>
  );
}
