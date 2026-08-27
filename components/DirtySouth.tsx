"use client";
import * as React from "react";
import type { NightDay, NightItem, Sponsor } from "@/lib/nightlife";
import { NightIcon, type NightCat } from "@/components/DirtySouthIcons";

// The night side of the Ear: acid green, brush-black, a checklist that IS the
// plan for the night. Checked state lives in localStorage per device — browsers
// deliberately block styling :visited links with extra content, so we remember
// taps ourselves. Tapping the box checks it off without leaving; tapping the
// line follows the link and checks it too.

const GREEN = "#CDE24A";
const INK = "#131309";
const STORAGE_KEY = "dirtysouth-checked-v2";

const DAY_ORDER: NightDay[] = ["Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES: Record<NightDay, string> = { Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

// Checked state is scoped to the current weekend: item ids repeat week to week
// (same venues, same slots), so without the scope last week's checks would show
// up already ticked on a fresh week. A weekend mismatch starts the list clean.
function loadChecked(weekend: string): Set<string> {
  try {
    window.localStorage.removeItem("dirtysouth-checked-v1"); // pre-scope format
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (stored && stored.weekend === weekend && Array.isArray(stored.ids)) return new Set(stored.ids);
    return new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(weekend: string, s: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ weekend, ids: [...s] }));
  } catch {
    /* private mode — checks just don't persist */
  }
}

/** Mon–Wed sponsor card — the week's sponsor holds the page on the off-days. */
function SponsorCard({ sponsor, fontClass }: { sponsor: Sponsor; fontClass: string }) {
  return (
    <div style={{ border: `3px solid ${INK}`, marginBottom: 26, padding: 16, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
      <a href={sponsor.href ?? "#"} target="_blank" rel="noopener noreferrer" style={{ flex: "0 0 150px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sponsor.image}
          alt={`${sponsor.name} — from the Dirty South map`}
          style={{ width: 150, height: "auto", border: `3px solid ${INK}`, transform: "rotate(-1.2deg)", display: "block" }}
        />
      </a>
      <div style={{ flex: "1 1 260px", minWidth: 220 }}>
        <div className={fontClass} style={{ fontSize: "clamp(1.05rem, 4vw, 1.5rem)", lineHeight: 1.1, letterSpacing: "0.03em", textTransform: "uppercase", transform: "rotate(-0.4deg)" }}>
          ★ {sponsor.kicker} ★
        </div>
        <a href={sponsor.href ?? "#"} target="_blank" rel="noopener noreferrer" style={{ color: INK, textDecoration: "none" }}>
          <div className={fontClass} style={{ fontSize: "clamp(1.8rem, 7vw, 2.8rem)", lineHeight: 0.95, textTransform: "uppercase", margin: "6px 0 8px", transform: "rotate(-0.6deg)" }}>
            {sponsor.name}
          </div>
        </a>
        <div style={{ fontFamily: "var(--font-label)", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.7 }}>
          {sponsor.blurb ? <>{sponsor.blurb}<br /></> : null}
          <strong style={{ fontWeight: 800 }}>{sponsor.address}</strong> · {sponsor.hours}
          <br />
          <a href={`tel:${sponsor.phone.replace(/[^0-9+]/g, "")}`} className={fontClass} style={{ color: INK, textDecoration: "none", fontSize: "1.25rem", letterSpacing: "0.04em", display: "inline-block", marginTop: 4 }}>
            ☎ {sponsor.phone}
          </a>
        </div>
      </div>
    </div>
  );
}

/** One-line signup for the 'dsparty' list — separate membership from the Ear's
 *  weekly email; the API records which form was used. */
function NotifyForm({ fontClass }: { fontClass: string }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "already" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, list: "dsparty", company: "" }),
      });
      if (!res.ok) { setState("error"); return; }
      const body = await res.json().catch(() => ({}));
      setState(body.welcomed === false ? "already" : "done");
    } catch {
      setState("error");
    }
  }

  if (state === "done" || state === "already") {
    return (
      <div
        className={fontClass}
        style={{
          display: "inline-block", background: INK, color: GREEN,
          padding: "16px 22px", transform: "rotate(-1.2deg)",
          fontSize: "clamp(1.5rem, 6vw, 2.2rem)", lineHeight: 1.05,
          textTransform: "uppercase", letterSpacing: "0.01em",
        }}
      >
        ✓ You&apos;re on
        <br />
        the party list.
        <span style={{ display: "block", fontSize: "0.5em", marginTop: 8, letterSpacing: "0.06em" }}>
          {state === "done" ? "Green hello headed to your inbox — see you next week." : "You were already in. See you out there."}
        </span>
      </div>
    );
  }
  return (
    <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
      <label htmlFor="ds-notify" className={fontClass} style={{ fontSize: "1.05rem", textTransform: "uppercase" }}>
        Want next week&apos;s party page?
      </label>
      <input
        id="ds-notify" name="ds-notify" type="email" required autoComplete="email"
        placeholder="your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          flex: "1 1 180px", minWidth: 160, padding: "10px 12px", fontSize: "0.95rem",
          fontFamily: "var(--font-label)", background: "transparent",
          border: `3px solid ${INK}`, color: INK, outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className={fontClass}
        style={{
          padding: "10px 16px", fontSize: "1.05rem", textTransform: "uppercase", cursor: "pointer",
          background: INK, color: GREEN, border: `3px solid ${INK}`,
          opacity: state === "busy" ? 0.6 : 1, transform: "rotate(-0.8deg)",
        }}
      >
        {state === "busy" ? "Signing…" : "Notify me"}
      </button>
      {state === "error" && (
        <span role="alert" style={{ fontFamily: "var(--font-label)", fontSize: "0.75rem", textTransform: "uppercase" }}>
          Didn&apos;t go through — try again?
        </span>
      )}
    </form>
  );
}

export function DirtySouth({
  days,
  defaultDay,
  weekend,
  fontClass,
  mapSrc,
  sponsor,
}: {
  days: Record<NightDay, NightItem[]>;
  defaultDay: NightDay;
  weekend: string;
  fontClass: string;
  /** Path to the territory map image; the map link renders only when set. */
  mapSrc?: string | null;
  /** The week's sponsor — rendered above the listings on Mon–Wed only. */
  sponsor?: Sponsor | null;
}) {
  const [day, setDay] = React.useState<NightDay>(defaultDay);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [mapOpen, setMapOpen] = React.useState(false);
  React.useEffect(() => setChecked(loadChecked(weekend)), [weekend]);
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
      saveChecked(weekend, next);
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

        {sponsor && <SponsorCard sponsor={sponsor} fontClass={fontClass} />}

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

        {/* one-line notify-me: joins the 'dsparty' list, separate from the Ear list */}
        <div style={{ borderTop: `3px solid ${INK}`, marginTop: 4, paddingTop: 20 }}>
          <NotifyForm fontClass={fontClass} />
        </div>

        <div style={{ borderTop: `3px solid ${INK}`, marginTop: 20, paddingTop: 22, textAlign: "center" }}>
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
