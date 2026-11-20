"use client";
import * as React from "react";
import Link from "next/link";
import { TicketLink } from "@/components/TicketLink";
import type { NightDay, NightItem, Sponsor } from "@/lib/nightlife";
import { NightIcon, type NightCat } from "@/components/DirtySouthIcons";
import {
  CAT_LABEL, PLAN_CATS, PLAN_DAYS, buildFeatured, lineup, planQuery, resolvePick, shareText,
  type PlanCat, type PlanOption, type PlanState, type PlannerData, type Picks,
} from "@/lib/planner";
import { renderPlanImage } from "@/lib/planImage";

// The night side of the Ear: acid green, brush-black — and since 2026-11-20 a party
// planner. Visitors tick what their night includes (eat, drink, be merry), pick one
// of each for the night, and send the game plan as a picture plus a link that brings
// a friend back to the same picks. Picks live in the URL once touched, and in
// localStorage per weekend so a return visit finds them.

const GREEN = "#CDE24A";
const INK = "#131309";
// The off-white the Angry Dumplings sponsor engraving is drawn on. Every logo
// chip sits on this same paper so a dozen different brand palettes still read
// as one row of stamps against the acid green.
const CREAM = "#FDFAEB";
const STORAGE_KEY = "dirtysouth-plan-v1";

const DAY_NAMES: Record<NightDay, string> = { Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const CAT_ICON: Record<PlanCat, NightCat> = { eat: "food", drink: "drink", merry: "star" };

type StoredPlan = { weekend: string; picks: Partial<Record<NightDay, Picks>>; types: PlanCat[] };

// Picks are scoped to the weekend: row ids repeat week to week, so last week's
// picks would otherwise come back attached to this week's rows.
function loadPlan(weekend: string): StoredPlan | null {
  try {
    window.localStorage.removeItem("dirtysouth-checked-v1"); // the old checklist
    window.localStorage.removeItem("dirtysouth-checked-v2");
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    return stored && stored.weekend === weekend ? stored : null;
  } catch {
    return null;
  }
}

function savePlan(plan: StoredPlan) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    /* private mode — picks just don't persist */
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** The right-hand chip on a listing row: the venue's own logo on cream paper,
 *  ink-framed and nudged off-square like everything else on this flyer. When a
 *  venue has no logo in the registry yet, the same chip holds its name set in
 *  Anton — the row's shape never changes, so a missing file reads as a design
 *  choice instead of a hole. Marked aria-hidden: the venue name is already in
 *  the row's own text, so a screen reader would just hear it twice. */
function LogoTile({ logo, brand, fontClass, tilt, dimmed }: {
  logo?: string | null;
  brand: string;
  fontClass: string;
  tilt: number;
  dimmed: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="ds-logo"
      style={{
        flex: "0 0 auto", alignSelf: "center", display: "grid", placeItems: "center",
        background: CREAM, border: `3px solid ${INK}`, padding: 7, overflow: "hidden",
        transform: `rotate(${tilt}deg)`, opacity: dimmed ? 0.5 : 1,
      }}
    >
      {logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logo}
          alt=""
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
        />
      ) : (
        <span
          className={fontClass}
          style={{
            // Bigger and bolder than the row text, so a venue without a logo still
            // gets a mark, not a label (Andy, 2026-10-14: "larger and more interesting").
            fontSize: "clamp(1.4rem, 3.4vw, 2.2rem)", lineHeight: 0.95, textAlign: "center", padding: "0 6px",
            textTransform: "uppercase", letterSpacing: "0.03em", color: INK,
            transform: "rotate(-3deg)", textShadow: "2px 2px 0 rgba(23,21,18,0.18)",
          }}
        >
          {brand}
        </span>
      )}
    </span>
  );
}

/** Mon–Wed sponsor card — the week's sponsor holds the page on the off-days. */
function SponsorCard({ sponsor, fontClass }: { sponsor: Sponsor; fontClass: string }) {
  return (
    <div style={{ border: `3px solid ${INK}`, marginBottom: 26, padding: 16, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
      <a href={sponsor.href ?? "#"} target="_blank" rel="noopener noreferrer" style={{ flex: "0 0 150px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sponsor.image}
          alt={sponsor.name}
          style={{
            width: 150, height: "auto", border: `3px solid ${INK}`, transform: "rotate(-1.2deg)", display: "block",
            // Cream chip behind the art: transparent logos (green lettering,
            // knocked-out edges) disappear straight onto the acid green.
            background: "#F3E8D2", padding: 10,
          }}
        />
      </a>
      <div style={{ flex: "1 1 260px", minWidth: 220 }}>
        <div className={fontClass} style={{ fontSize: "clamp(1.05rem, 4vw, 1.5rem)", lineHeight: 1.1, letterSpacing: "0.03em", textTransform: "uppercase", transform: "rotate(-0.4deg)" }}>
          {/* NBSPs weld the stars to the first and last words so a wrap never
              strands a star on its own line. */}
          {`★ ${sponsor.kicker} ★`}
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


/** The pick box on every row: ticking it makes this the night's choice for its category. */
function PickBox({ checked, label, onClick, size = 34 }: { checked: boolean; label: string; onClick: () => void; size?: number }) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      onClick={onClick}
      style={{
        width: size, height: size, minWidth: size, marginTop: 2, cursor: "pointer",
        border: `3px solid ${INK}`, background: checked ? INK : "transparent",
        color: GREEN, fontSize: size > 30 ? "1.3rem" : "1rem", lineHeight: 1, fontWeight: 700,
      }}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

/** A full-size row — the featured events, and whichever option is the category's pick.
 *  Same layout as the old checklist: time and headline, venue line, ticket, logo chip. */
function OptionRow({ option, checked, onPick, fontClass, idx }: {
  option: PlanOption;
  checked: boolean;
  onPick: () => void;
  fontClass: string;
  idx: number;
}) {
  const external = option.href?.startsWith("http");
  const headline = option.title;
  const byline = option.kind === "venue" ? option.address : option.venue ?? option.brand;
  const verb = checked ? "Unpick" : "Pick";
  return (
    <li style={{ borderTop: `3px solid ${INK}`, padding: "14px 0" }}>
      <div className="ds-row" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <PickBox checked={checked} label={`${verb} ${headline} for ${CAT_LABEL[option.cat].toLowerCase()}`} onClick={onPick} />
        <span className="ds-cat" style={{ marginTop: 3 }}>
          <NightIcon cat={(option.icon ?? "star") as NightCat} size={30} rotate={idx % 2 ? 4 : -4} />
        </span>
        <div className="ds-listing">
          <a
            href={option.href ?? "#"}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            style={{ display: "block", textDecoration: "none", color: INK }}
          >
            <div className={fontClass} style={{ fontSize: "1.35rem", lineHeight: 1.1, textTransform: "uppercase" }}>
              {option.time ? <><span style={{ fontSize: "0.78em", opacity: 0.85 }}>{option.time}</span>{" "}— </> : null}
              {headline}
            </div>
            {byline ? (
              <div style={{ fontFamily: "var(--font-label)", fontSize: "0.74rem", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5 }}>
                <strong style={{ fontWeight: 800 }}>{byline}</strong>
                {option.sub ? <span style={{ opacity: 0.75 }}> · {option.sub}</span> : null}
              </div>
            ) : null}
          </a>
          {option.ticket && <TicketLink {...option.ticket} showCaption={false} />}
        </div>
        <LogoTile logo={option.logo} brand={option.brand} fontClass={fontClass} tilt={idx % 2 ? 1.1 : -1.1} dimmed={false} />
      </div>
    </li>
  );
}

/** A one-line "show all" entry: pick box, tiny logo, name and where. */
function AllRow({ option, checked, onPick }: { option: PlanOption; checked: boolean; onPick: () => void }) {
  const external = option.href?.startsWith("http");
  const text = option.kind === "venue"
    ? <><strong style={{ fontWeight: 800 }}>{option.title}</strong>{option.address ? <> · {option.address}</> : null}</>
    : <>{option.time ? <>{option.time} — </> : null}<strong style={{ fontWeight: 800 }}>{option.title}</strong> · {option.brand}</>;
  return (
    <li className="ds-allrow">
      <PickBox
        checked={checked}
        size={26}
        label={`${checked ? "Unpick" : "Pick"} ${option.title} for ${CAT_LABEL[option.cat].toLowerCase()}`}
        onClick={onPick}
      />
      <span aria-hidden="true" className="ds-tinylogo">
        {option.logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={option.logo} alt="" />
          : <span>{option.brand.replace(/^the\s+/i, "").charAt(0)}</span>}
      </span>
      <a
        href={option.href ?? "#"}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        style={{ color: INK, textDecoration: "none", flex: 1, minWidth: 0 }}
      >
        {text}
      </a>
    </li>
  );
}

/** One of the three sections: featured rows, or — once something is picked — the pick
 *  in full with the other featured choices shrunk to one word each; then "show all". */
function CategorySection({ cat, dayName, featured, all, pickId, onPick, expanded, onToggleAll, fontClass }: {
  cat: PlanCat;
  dayName: string;
  featured: PlanOption[];
  all: PlanOption[];
  pickId?: string;
  onPick: (id: string) => void;
  expanded: boolean;
  onToggleAll: () => void;
  fontClass: string;
}) {
  const picked = pickId ? [...featured, ...all].find((o) => o.id === pickId) : undefined;
  const others = picked ? featured.filter((o) => o.id !== picked.id) : [];
  const brandCount = others.reduce<Record<string, number>>((m, o) => ({ ...m, [o.brand]: (m[o.brand] ?? 0) + 1 }), {});
  const headingId = `ds-${cat}`;
  return (
    <section aria-labelledby={headingId} className="ds-catsection">
      <h3 id={headingId} className={`ds-cathead ${fontClass}`}>
        <NightIcon cat={CAT_ICON[cat]} size={44} rotate={-6} /> {CAT_LABEL[cat]}
      </h3>
      {picked ? (
        <>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <OptionRow option={picked} checked onPick={() => onPick(picked.id)} fontClass={fontClass} idx={0} />
          </ol>
          {others.length > 0 && (
            <div className="ds-chips" aria-label={`Other ${CAT_LABEL[cat].toLowerCase()} choices`}>
              {others.map((o) => (
                <button
                  key={o.id}
                  className={`ds-chip ${fontClass}`}
                  aria-label={`Pick ${o.title} for ${CAT_LABEL[cat].toLowerCase()} instead`}
                  onClick={() => onPick(o.id)}
                >
                  {o.brand}{brandCount[o.brand] > 1 && o.time ? ` ${o.time}` : ""}
                </button>
              ))}
            </div>
          )}
        </>
      ) : featured.length ? (
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {featured.map((o, i) => (
            <OptionRow key={o.id} option={o} checked={false} onPick={() => onPick(o.id)} fontClass={fontClass} idx={i} />
          ))}
        </ol>
      ) : (
        <p className="ds-note">Nothing featured for {CAT_LABEL[cat].toLowerCase()} on {dayName}. Show all has every spot.</p>
      )}
      {all.length > 0 && (
        <button className="ds-showall" aria-expanded={expanded} onClick={onToggleAll}>
          {expanded ? "(show fewer)" : "(show all)"}
        </button>
      )}
      {expanded && (
        <ul className="ds-alllist" aria-label={`Every ${CAT_LABEL[cat].toLowerCase()} option`}>
          {all.map((o) => (
            <AllRow key={o.id} option={o} checked={o.id === pickId} onPick={() => onPick(o.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The numbered dot that marks each step on the page, matching the explainer's numerals. */
function StepLabel({ n, id, textId, fontClass, children }: {
  n: number;
  id: string;
  textId?: string;
  fontClass: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={`ds-steplabel ${fontClass}`}>
      <span aria-hidden="true" className="ds-stepbadge">{n}</span>
      <span id={textId}>{children}</span>
    </div>
  );
}

/** "Three steps to your night": the planner is a process now, not a page to read
 *  (Andy, 2026-11-20). Each card acts out its step on a shared nine-second loop —
 *  boxes tick, the day slides to Friday, the plan fills in and flies off — and links
 *  down to that step. Under prefers-reduced-motion the cards sit still in their
 *  finished state (see .ds-steps in globals.css). */
function HowItWorks({ fontClass }: { fontClass: string }) {
  const steps = [
    {
      n: 1,
      title: "Pick your mix",
      text: "Tick what goes in your night: eat, drink, be merry.",
      demo: (
        <span className="ds-demo-mix">
          {["Eat", "Drink", "Be merry"].map((label, i) => (
            <span key={label} className="ds-demo-pill" style={{ "--i": i } as React.CSSProperties}>
              <span className="ds-demo-box"><span className="ds-demo-tick">✓</span></span>
              {label}
            </span>
          ))}
        </span>
      ),
    },
    {
      n: 2,
      title: "Pick your night",
      text: "Thursday, Friday, Saturday or Sunday.",
      demo: (
        <span className="ds-demo-days">
          {["Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
          <span className="ds-demo-dayhl" />
        </span>
      ),
    },
    {
      n: 3,
      title: "Check & share",
      text: "Check one spot in each, then send the game plan to your crew.",
      demo: (
        <span className="ds-demo-share">
          <span className="ds-demo-card">
            {[0, 1, 2].map((i) => <span key={i} className="ds-demo-line" style={{ "--i": i } as React.CSSProperties} />)}
          </span>
          <span className="ds-demo-btn">Share</span>
          <span className="ds-demo-plane">➤</span>
        </span>
      ),
    },
  ];
  return (
    <section className="ds-steps" aria-labelledby="ds-steps-head">
      <h2 id="ds-steps-head" className={`ds-steps-head ${fontClass}`}>Three steps to your night</h2>
      <ol className="ds-steps-list">
        {steps.map((s) => (
          <li key={s.n} className={`ds-step ds-step--${s.n}`}>
            <a href={`#ds-step-${s.n}`} className="ds-step-link">
              <span aria-hidden="true" className={`ds-step-num ${fontClass}`}>{s.n}</span>
              <span aria-hidden="true" className="ds-step-demo">{s.demo}</span>
              <span className="ds-step-copy">
                <span className={`ds-step-title ${fontClass}`}>
                  <span className="ds-sr">Step {s.n}:</span>{" "}{s.title}
                </span>{" "}
                <span className="ds-step-text">{s.text}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Without server data (tests, a stripped-down render) the page still works off the night's rows. */
function plannerFromDays(days: Record<NightDay, NightItem[]>): PlannerData {
  const featured = buildFeatured(days);
  return {
    featured,
    directory: { eat: [], drink: [] },
    merryAll: Object.fromEntries(PLAN_DAYS.map((d) => [d, featured[d].merry])) as PlannerData["merryAll"],
    dates: {},
  };
}

export function DirtySouth({
  days,
  defaultDay,
  weekend,
  fontClass,
  mapSrc,
  sponsor,
  planner,
  initial,
}: {
  days: Record<NightDay, NightItem[]>;
  defaultDay: NightDay;
  weekend: string;
  fontClass: string;
  /** Path to the territory map image; the map link renders only when set. */
  mapSrc?: string | null;
  /** The week's sponsor — rendered above the listings on Mon–Wed only. */
  sponsor?: Sponsor | null;
  /** Option lists built on the server (directory, every be-merry event, dates). */
  planner?: PlannerData;
  /** A plan read from a shared link. */
  initial?: Partial<PlanState>;
}) {
  const data = React.useMemo(() => planner ?? plannerFromDays(days), [planner, days]);
  const firstDay = initial?.day ?? defaultDay;
  const [day, setDay] = React.useState<NightDay>(firstDay);
  const [types, setTypes] = React.useState<PlanCat[]>(initial?.types ?? PLAN_CATS);
  const [picks, setPicks] = React.useState<Partial<Record<NightDay, Picks>>>(initial?.picks ? { [firstDay]: initial.picks } : {});
  const [expanded, setExpanded] = React.useState<Set<PlanCat>>(new Set());
  const [mapOpen, setMapOpen] = React.useState(false);
  const [status, setStatus] = React.useState<null | "shared" | "copied" | "failed">(null);
  const [planInView, setPlanInView] = React.useState(false);
  const touched = React.useRef(false);
  const fileRef = React.useRef<File | null>(null);
  const fontProbe = React.useRef<HTMLSpanElement>(null);
  const planRef = React.useRef<HTMLElement>(null);
  const fromLink = Boolean(initial?.picks);

  // A shared link wins; otherwise pick up where this visitor left off this weekend.
  React.useEffect(() => {
    if (fromLink) return;
    const stored = loadPlan(weekend);
    if (stored) {
      setPicks(stored.picks ?? {});
      if (stored.types?.length) setTypes(stored.types);
    }
  }, [weekend, fromLink]);

  const state: PlanState = React.useMemo(() => ({ day, picks: picks[day] ?? {}, types }), [day, picks, types]);
  const plan = React.useMemo(() => lineup(data, state), [data, state]);
  const dayName = DAY_NAMES[day];
  const query = planQuery(state);

  // Once the visitor has touched the plan, keep it in the address bar (so a refresh or a
  // copied URL brings it back) and on this device. Untouched visits leave the URL alone,
  // so QR attribution (?src=…) survives the page view.
  React.useEffect(() => {
    if (!touched.current) return;
    savePlan({ weekend, picks, types });
    try {
      window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
    } catch {
      /* sandboxed frames */
    }
  }, [weekend, picks, types, query]);

  React.useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMapOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapOpen]);

  // The picture is drawn ahead of the tap: iOS refuses navigator.share once the tap's
  // moment has passed, and loading fonts and logos inside the click would spend it.
  React.useEffect(() => {
    fileRef.current = null;
    if (!plan.length) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const display = fontProbe.current ? getComputedStyle(fontProbe.current).fontFamily : "Impact, sans-serif";
        const label = getComputedStyle(document.documentElement).getPropertyValue("--font-label").trim() || "monospace";
        const file = await renderPlanImage({ dayName, dateLabel: data.dates[day], plan, display, label });
        if (!cancelled) fileRef.current = file;
      } catch {
        /* no canvas (old browser, tests): share the words and the link */
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [plan, dayName, day, data.dates]);

  // The sticky share bar steps aside while the game plan card itself is on screen.
  React.useEffect(() => {
    const el = planRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPlanInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function touch() {
    touched.current = true;
    setStatus(null);
  }

  function pick(cat: PlanCat, id: string) {
    touch();
    setPicks((prev) => {
      const forDay = { ...(prev[day] ?? {}) };
      if (forDay[cat] === id) delete forDay[cat];
      else forDay[cat] = id;
      return { ...prev, [day]: forDay };
    });
  }

  function toggleType(cat: PlanCat) {
    touch();
    setTypes((prev) => {
      if (prev.includes(cat)) return prev.length > 1 ? prev.filter((c) => c !== cat) : prev;
      return PLAN_CATS.filter((c) => c === cat || prev.includes(c));
    });
  }

  function toggleAll(cat: PlanCat) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function chooseDay(d: NightDay) {
    touch();
    setDay(d);
  }

  const shareUrl = () => `${window.location.origin}${window.location.pathname}?${query}`;

  async function share() {
    const url = shareUrl();
    const text = shareText(dayName, plan);
    const title = `My ${dayName} game plan — Dirty South Party Planner`;
    const file = fileRef.current;
    try {
      if (typeof navigator.share === "function") {
        if (file && navigator.canShare?.({ files: [file] })) {
          // With a file attached some share targets drop the url field, so the link rides in the text.
          await navigator.share({ title, text: `${text}\n\nPlan yours: ${url}`, files: [file] });
        } else {
          await navigator.share({ title, text, url });
        }
        setStatus("shared");
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return; // they closed the sheet
    }
    // No share sheet, or it errored: put the link to this exact plan on the clipboard.
    setStatus((await copyText(url)) ? "copied" : "failed");
  }

  return (
    <div style={{ background: GREEN, minHeight: "100vh", color: INK }}>
      {/* The homepage always serves the current week's episode. */}
      <Link className="ds-superheader" href="/">
        SOUTH KNOXVILLE EVENTS AND RUMORS{" "}
        <span style={{ whiteSpace: "nowrap" }}>-- GO TO THIS WEEK&apos;S EPISODE</span>
      </Link>

      {/* The main site's masthead treatment, carried over: cream band, ink rule
          underneath, and the whole hero links home (Andy, 2026-11-07). */}
      <div className="ds-hero">
        <Link className="ds-hero-link" href="/" aria-label="SoKnoEar.com — go to this week's episode">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/dirtysouth_hero.jpg"
            alt="SoKnoEar.com — Weekend Party Planner for the Dirty South"
            width={2000}
            height={666}
          />
        </Link>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 40px" }}>
        <h1
          className={fontClass}
          style={{
            fontSize: "clamp(2.1rem, 8.6vw, 4.6rem)", lineHeight: 0.98, margin: 0,
            textTransform: "uppercase", letterSpacing: "0.01em",
          }}
        >
          <span style={{ display: "block", transform: "rotate(-1.2deg)" }}>Dirty South</span>
          <span style={{ display: "block", transform: "rotate(0.9deg)" }}>Party Planner</span>
        </h1>
        {/* measures the display face so the share picture is drawn in it */}
        <span ref={fontProbe} className={fontClass} aria-hidden="true" style={{ position: "absolute", visibility: "hidden" }}>A</span>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "0.78rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "14px 0 16px" }}>
          Build your night · {weekend}
        </p>

        {/* why this page exists, with the map button beside it — four-fifths text,
            one-fifth button; stacks on phones (Andy, 2026-11-07: no map snapshot). */}
        <div className={mapSrc ? "ds-intro-row" : "ds-intro-row ds-intro-row--solo"}>
          <p style={{ fontFamily: "var(--font-label)", fontSize: "0.86rem", lineHeight: 1.65, letterSpacing: "0.03em", margin: 0, borderLeft: `4px solid ${INK}`, paddingLeft: 12 }}>
            Pick a place to eat, a place to drink and something fun to do, and the Ear
            turns it into a game plan you can send your crew. The Dirty South is everything
            you reach by crossing the bridge: Old Sevier, the South Waterfront, Island Home,
            the Urban Wilderness, the old Kern&apos;s Bakery. Come on over — if you dare.
          </p>
          {mapSrc && (
            <button
              onClick={() => setMapOpen(true)}
              className={`ds-map-btn ${fontClass}`}
              style={{
                padding: "8px 12px", fontSize: "1rem", lineHeight: 1.1,
                textTransform: "uppercase", cursor: "pointer",
                border: `3px solid ${INK}`, background: "transparent", color: INK,
                transform: "rotate(0.6deg)", textAlign: "left",
              }}
            >
              ☛ Map of the territory
              <span style={{ display: "block", fontFamily: "var(--font-label)", fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
                Tap for the full map
              </span>
            </button>
          )}
        </div>

        <HowItWorks fontClass={fontClass} />

        {sponsor && <SponsorCard sponsor={sponsor} fontClass={fontClass} />}

        {/* what the night includes */}
        <div role="group" aria-labelledby="ds-types-label" className="ds-types">
          <StepLabel n={1} id="ds-step-1" textId="ds-types-label" fontClass={fontClass}>
            What&apos;s in your night?
          </StepLabel>
          <div className="ds-types-row">
            {PLAN_CATS.map((cat) => {
              const on = types.includes(cat);
              return (
                <button
                  key={cat}
                  aria-pressed={on}
                  onClick={() => toggleType(cat)}
                  className={`ds-type ${fontClass}`}
                  data-on={on || undefined}
                >
                  <span aria-hidden="true" className="ds-type-box">{on ? "✓" : ""}</span>
                  {CAT_LABEL[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* day tabs */}
        <StepLabel n={2} id="ds-step-2" fontClass={fontClass}>Pick your night</StepLabel>
        <div role="tablist" aria-label="Pick your night" style={{ display: "flex", gap: 8, marginBottom: 26 }}>
          {PLAN_DAYS.map((d) => {
            const active = d === day;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={active}
                onClick={() => chooseDay(d)}
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
          {dayName} night
        </h2>
        <p style={{ fontFamily: "var(--font-label)", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 18px", opacity: 0.75 }}>
          {data.dates[day] ? `${data.dates[day]} · ` : ""}Check one in each, then share your game plan in step 3.
        </p>

        {PLAN_CATS.filter((c) => types.includes(c)).map((cat) => (
          <CategorySection
            key={cat}
            cat={cat}
            dayName={dayName}
            featured={data.featured[day][cat]}
            all={cat === "merry" ? data.merryAll[day] : data.directory[cat]}
            pickId={resolvePick(data, day, cat, state.picks[cat]) ? state.picks[cat] : undefined}
            onPick={(id) => pick(cat, id)}
            expanded={expanded.has(cat)}
            onToggleAll={() => toggleAll(cat)}
            fontClass={fontClass}
          />
        ))}

        {/* the game plan */}
        <StepLabel n={3} id="ds-step-3" fontClass={fontClass}>Share your game plan</StepLabel>
        <section ref={planRef} id="game-plan" aria-labelledby="ds-plan-head" className="ds-plan">
          <h2 id="ds-plan-head" className={fontClass}>Your {dayName} game plan</h2>
          {plan.length ? (
            <>
              <ol className="ds-plan-list">
                {plan.map(({ cat, option }) => (
                  <li key={cat}>
                    <span className={`ds-plan-cat ${fontClass}`}>{CAT_LABEL[cat]}</span>
                    <span className={fontClass} style={{ fontSize: "1.25rem", lineHeight: 1.1, textTransform: "uppercase" }}>
                      {option.time ? `${option.time} — ` : ""}{option.title}
                    </span>
                    {option.kind !== "venue" && (
                      <span style={{ fontFamily: "var(--font-label)", fontSize: "0.74rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {option.brand}
                      </span>
                    )}
                    {option.kind === "venue" && option.address && (
                      <span style={{ fontFamily: "var(--font-label)", fontSize: "0.74rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {option.address}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <button onClick={share} className={`ds-share-btn ${fontClass}`}>
                ★ Share my game plan
              </button>
            </>
          ) : (
            <p className="ds-note">
              Check one place to eat, one to drink and one thing to do, and your game plan shows up here, ready to send.
            </p>
          )}
          <p role="status" aria-live="polite" className="ds-share-status">
            {status === "shared" && "Sent. Have a big night."}
            {status === "copied" && "Link copied. Paste it to your crew and it opens on this exact plan."}
            {status === "failed" && "Copy this link to send your plan:"}
          </p>
          {status === "failed" && (
            <input readOnly value={shareUrl()} onFocus={(e) => e.currentTarget.select()} className="ds-share-url" aria-label="Link to this game plan" />
          )}
        </section>

        {/* one-line notify-me: joins the 'dsparty' list, separate from the Ear list */}
        <div style={{ borderTop: `3px solid ${INK}`, marginTop: 4, paddingTop: 20 }}>
          <NotifyForm fontClass={fontClass} />
        </div>

        <div style={{ borderTop: `3px solid ${INK}`, marginTop: 20, paddingTop: 22, textAlign: "center" }}>
          <Link
            href="/"
            className={fontClass}
            style={{ color: INK, textDecoration: "none", fontSize: "1.15rem", textTransform: "uppercase" }}
          >
            This is the night side of The South Knoxville Ear ★ read this week&apos;s episode →
          </Link>
        </div>
      </div>

      {/* flyer bottom bar */}
      <div className={fontClass} style={{ background: INK, color: GREEN, textAlign: "center", padding: "14px 0", fontSize: "1.5rem", letterSpacing: "0.08em" }}>
        SOKNOEAR.COM
      </div>

      {/* the share button follows the visitor once there's something to share */}
      {plan.length > 0 && !planInView && (
        <div className="ds-sharebar">
          <button onClick={share} className={fontClass}>
            ★ Share my {dayName} game plan · {plan.length}
          </button>
        </div>
      )}

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
