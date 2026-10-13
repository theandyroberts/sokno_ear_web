"use client";
import React from "react";

// Design system styles reused from DS Tipline component
const boxStyle: React.CSSProperties = {
  background: "var(--paper-bright)",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-5)",
  // Sits beside the map card in a stretched grid row: fill the cell so the two
  // borders land at the same height, content staying top-aligned (Andy, 2026-09-08).
  height: "100%",
  boxSizing: "border-box",
};

// The courier: the Ear's dog carrying the week's episode in an envelope, drawn in
// the house engraving. Replaced the line-art envelope on 2026-10-13 — the box was
// easy to overlook (Andy). Served at 2x; the frame keeps it from crowding the copy.
const COURIER = "/assets/subscribe_courier.jpg";

function Courier({ size }: { size: number }) {
  return (
    <img
      src={COURIER}
      alt=""
      width={size}
      height={size}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: "var(--radius-sm)",
        border: "var(--border-hair) solid var(--ink-black)",
        background: "var(--paper-cream)",
        flex: "0 0 auto",
      }}
    />
  );
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)",
  fontWeight: "var(--weight-label)",
  fontSize: "var(--label-md)",
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: "var(--rust)",
  marginBottom: "8px",
};

const copyStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  lineHeight: 1.5,
  color: "var(--ink-black)",
  margin: "0 0 var(--space-4)",
};

const leadStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  fontSize: "1.2rem",
  lineHeight: 1.25,
  color: "var(--ink-black)",
  margin: "0 0 10px",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  color: "var(--ink-black)",
  background: "var(--paper-cream)",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  outline: "none",
  width: "100%",
};

const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: 1,
  height: 1,
  overflow: "hidden",
};

// Submit button styled inline as primary (green) variant to match DS Button look.
// The DS Button renders <button type="button"> so it won't submit a form;
// instead we render our own <button type="submit"> with the same DS styles.
const submitBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5em",
  fontFamily: "var(--font-label)",
  fontWeight: "var(--weight-label)",
  fontSize: "var(--label-md)",
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  cursor: "pointer",
  userSelect: "none",
  textDecoration: "none",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "11px 22px",
  background: "var(--green-bridge)",
  color: "var(--on-green)",
  boxShadow: "var(--shadow-press)",
};

type SubscribeState = "idle" | "busy" | "error" | "welcomed" | "already";

/**
 * Two placements on the episode page (Andy, 2026-10-13):
 *  - "well"  — beside the party map under the feature. The courier sits above the copy.
 *  - "band"  — the bottom of the read, beside "Tell the Ear", where the phone-in card
 *              used to be. The courier sits beside the copy and the pitch is the
 *              second-chance one: you read this far, don't miss the next one.
 * Each placement gets its own input id so two forms on one page stay valid HTML.
 */
export function SubscribeForm({ variant = "well" }: { variant?: "well" | "band" }) {
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [state, setState] = React.useState<SubscribeState>("idle");
  const inputId = variant === "band" ? "subscribe-email-band" : "subscribe-email";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      if (!res.ok) { setState("error"); return; }
      const body = await res.json().catch(() => ({}));
      setState(body.welcomed === false ? "already" : "welcomed");
    } catch {
      setState("error");
    }
  }

  if (state === "welcomed") {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ You&apos;re on the list — welcome!</div>
        <p style={copyStyle}>
          Welcome to the Ear, neighbor. A hello note just left for your inbox — give it a
          minute, and a peek at spam if it hides.
        </p>
        <p style={{ ...copyStyle, margin: 0 }}>
          From here on out: one short email each week when a fresh episode drops, with the
          weekend&apos;s good stuff. That&apos;s it — no spam, ever. See you around SoKno!
        </p>
      </section>
    );
  }

  if (state === "already") {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ You&apos;re already on the list</div>
        <p style={{ ...copyStyle, margin: 0 }}>
          Good news — this email was signed up already, so you&apos;re all set. One short
          email lands each week when a fresh episode drops. See you around SoKno!
        </p>
      </section>
    );
  }

  const form = (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
      <input
        type="email"
        id={inputId} name="subscribe-email" autoComplete="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={inputStyle}
      />
      {/* Honeypot — visually hidden, must not be filled by real users */}
      <div style={honeypotStyle} aria-hidden="true">
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div>
        <button type="submit" disabled={state === "busy"} style={{ ...submitBtnStyle, opacity: state === "busy" ? 0.6 : 1 }}>
          {state === "busy" ? "Signing you up…" : variant === "band" ? "Subscribe, it's free" : "Subscribe"}
        </button>
      </div>
      {state === "error" && (
        <p style={{ ...copyStyle, margin: 0, color: "var(--rust)" }} role="alert">
          Hmm — that didn&apos;t go through. Mind giving it another try in a moment?
        </p>
      )}
    </form>
  );

  if (variant === "band") {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ Don&apos;t miss next weekend</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 6 }}>
          <Courier size={96} />
          <div>
            <p style={leadStyle}>You read to the bottom. You&apos;re one of us now.</p>
            <p style={{ ...copyStyle, margin: "0 0 10px" }}>
              Put your email here and the next episode comes to you on Wednesday: the weekend&apos;s
              plans, the audio briefing, every story. One email a week, free, no spam.
            </p>
          </div>
        </div>
        {form}
      </section>
    );
  }

  return (
    <section style={boxStyle}>
      <div style={headingStyle}>★ Get the Weekend Delivered</div>
      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0 14px" }}>
        <Courier size={132} />
      </div>
      <p style={leadStyle}>A fresh episode every Wednesday. This dog brings it to your inbox.</p>
      <p style={copyStyle}>
        One short email a week: the weekend&apos;s calendar, the audio briefing and every story
        from around SoKno, Thursday through Sunday. Free, and nobody gets your address but us.
      </p>
      {form}
    </section>
  );
}
