"use client";
import * as React from "react";
import type { NightDay, NightItem } from "@/lib/nightlife";
import { NightIcon, type NightCat } from "@/components/DirtySouthIcons";

// The night side of the Ear: acid green, brush-black, a checklist that IS the
// plan for the night. Checked state lives in localStorage per device — browsers
// deliberately block styling :visited links with extra content, so we remember
// taps ourselves. Tapping the box checks it off without leaving; tapping the
// line follows the link and checks it too.

const GREEN = "#CDE24A";
const INK = "#131309";
const STORAGE_KEY = "dirtysouth-checked-v1";

const DAY_ORDER: NightDay[] = ["Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES: Record<NightDay, string> = { Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

function loadChecked(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveChecked(s: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch {
    /* private mode — checks just don't persist */
  }
}

export function DirtySouth({
  days,
  defaultDay,
  weekend,
  fontClass,
  mapSrc,
}: {
  days: Record<NightDay, NightItem[]>;
  defaultDay: NightDay;
  weekend: string;
  fontClass: string;
  /** Path to the territory map image; the map link renders only when set. */
  mapSrc?: string | null;
}) {
  const [day, setDay] = React.useState<NightDay>(defaultDay);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [mapOpen, setMapOpen] = React.useState(false);
  React.useEffect(() => setChecked(loadChecked()), []);
  React.useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMapOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapOpen]);

  function mark(id: string, on?: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      const turnOn = on ?? !next.has(id);
      if (turnOn) next.add(id);
      else next.delete(id);
      saveChecked(next);
      return next;
    });
  }

  const items = days[day] ?? [];

  return (
    <div style={{ background: GREEN, minHeight: "100vh", color: INK }}>
      {/* top escape hatch back to the planners' side */}
      <a
        href="/"
        style={{
          display: "block", background: INK, color: GREEN, textDecoration: "none",
          padding: "10px 16px", fontFamily: "var(--font-label)", fontSize: "0.72rem",
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}
      >
        ★ The South Knoxville Ear — read this week&apos;s episode →
      </a>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 40px" }}>
        <h1
          className={fontClass}
          style={{
            fontSize: "clamp(2.1rem, 8.6vw, 4.6rem)", lineHeight: 0.98, margin: 0,
            textTransform: "uppercase", letterSpacing: "0.01em",
          }}
        >
          <span style={{ display: "block", transform: "rotate(-1.2deg)" }}>Party in the</span>
          <span style={{ display: "block", transform: "rotate(0.9deg)" }}>Dirty South</span>
        </h1>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "0.78rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "14px 0 16px" }}>
          SoKno&apos;s plan for the night · {weekend}
        </p>

        {/* why this page exists */}
        <p style={{ fontFamily: "var(--font-label)", fontSize: "0.86rem", lineHeight: 1.65, letterSpacing: "0.03em", margin: "0 0 10px", borderLeft: `4px solid ${INK}`, paddingLeft: 12 }}>
          Every week, midweek, a fresh episode of soknoear.com drops — that&apos;s the
          plan-ahead side. This is the night side. The Dirty South is everything you
          reach by crossing the bridge: Old Sevier, the South Waterfront, Island Home,
          the Urban Wilderness, the old Kern&apos;s Bakery. Come on over — if you dare.
        </p>
        {mapSrc && (
          <button
            onClick={() => setMapOpen(true)}
            className={fontClass}
            style={{
              display: "inline-block", margin: "4px 0 10px", padding: "8px 14px",
              fontSize: "1rem", textTransform: "uppercase", cursor: "pointer",
              border: `3px solid ${INK}`, background: "transparent", color: INK,
              transform: "rotate(-0.8deg)",
            }}
          >
            ☛ Map of the territory
          </button>
        )}
        <div style={{ height: 12 }} />

        {/* day tabs */}
        <div role="tablist" aria-label="Pick your night" style={{ display: "flex", gap: 8, marginBottom: 26 }}>
          {DAY_ORDER.map((d) => {
            const active = d === day;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={active}
                onClick={() => setDay(d)}
                className={fontClass}
                style={{
                  flex: 1, padding: "12px 0", fontSize: "1.15rem", textTransform: "uppercase",
                  cursor: "pointer", border: `3px solid ${INK}`,
                  background: active ? INK : "transparent",
                  color: active ? GREEN : INK,
                  transform: active ? "rotate(-1deg)" : "none",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <h2 className={fontClass} style={{ fontSize: "1.4rem", textTransform: "uppercase", margin: "0 0 6px", transform: "rotate(-0.5deg)" }}>
          {DAY_NAMES[day]} night
        </h2>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 18px", opacity: 0.75 }}>
          Start times listed — assume it goes until whenever. Check &rsquo;em off as you go.
        </p>

        {/* the checklist */}
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item, idx) => {
            const done = checked.has(item.id);
            const external = item.href.startsWith("http");
            return (
              <li key={item.id} style={{ borderTop: `3px solid ${INK}`, padding: "14px 0" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <button
                    aria-label={done ? `Uncheck ${item.headline}` : `Check off ${item.headline}`}
                    aria-pressed={done}
                    onClick={() => mark(item.id)}
                    style={{
                      width: 34, height: 34, minWidth: 34, marginTop: 2, cursor: "pointer",
                      border: `3px solid ${INK}`, background: done ? INK : "transparent",
                      color: GREEN, fontSize: "1.3rem", lineHeight: 1, fontWeight: 700,
                    }}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <span style={{ marginTop: 3, opacity: done ? 0.55 : 1 }}>
                    <NightIcon cat={(item.cat ?? "star") as NightCat} size={30} rotate={idx % 2 ? 4 : -4} />
                  </span>
                  <a
                    href={item.href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    onClick={() => mark(item.id, true)}
                    style={{ textDecoration: "none", color: INK, flex: 1, opacity: done ? 0.55 : 1 }}
                  >
                    <div className={fontClass} style={{ fontSize: "1.35rem", lineHeight: 1.1, textTransform: "uppercase" }}>
                      <span style={{ fontSize: "0.78em", opacity: 0.85 }}>{item.time}</span>{" "}
                      — {item.headline}
                    </div>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: "0.74rem", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5 }}>
                      <strong style={{ fontWeight: 800 }}>{item.venue}</strong>
                      {item.sub ? <span style={{ opacity: 0.75 }}> · {item.sub}</span> : null}
                    </div>
                  </a>
                </div>
              </li>
            );
          })}
        </ol>

        <div style={{ borderTop: `3px solid ${INK}`, marginTop: 4, paddingTop: 22, textAlign: "center" }}>
          <a
            href="/"
            className={fontClass}
            style={{ color: INK, textDecoration: "none", fontSize: "1.15rem", textTransform: "uppercase" }}
          >
            This is the night side of The South Knoxville Ear ★ read this week&apos;s episode →
          </a>
        </div>
      </div>

      {/* flyer bottom bar */}
      <div className={fontClass} style={{ background: INK, color: GREEN, textAlign: "center", padding: "14px 0", fontSize: "1.5rem", letterSpacing: "0.08em" }}>
        SOKNOEAR.COM
      </div>

      {/* territory map lightbox */}
      {mapSrc && mapOpen && (
        <div
          role="dialog"
          aria-label="Map of the Dirty South"
          onClick={() => setMapOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 60, background: "rgba(19,19,9,0.92)",
            display: "grid", placeItems: "center", padding: 18, cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapSrc}
            alt="Map of the Dirty South — Old Sevier, South Waterfront, Island Home, Urban Wilderness, and Kern's"
            style={{ maxWidth: "94vw", maxHeight: "86vh", border: `4px solid ${GREEN}` }}
          />
          <button
            aria-label="Close map"
            onClick={() => setMapOpen(false)}
            className={fontClass}
            style={{
              position: "absolute", top: 14, right: 14, padding: "6px 14px", fontSize: "1.1rem",
              background: GREEN, color: INK, border: `3px solid ${GREEN}`, cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}
