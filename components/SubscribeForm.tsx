"use client";
import React from "react";

// Design system styles reused from DS Tipline component
const boxStyle: React.CSSProperties = {
  background: "var(--paper-bright)",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-5)",
};

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

export function SubscribeForm() {
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [state, setState] = React.useState<SubscribeState>("idle");

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

  return (
    <section style={boxStyle}>
      <div style={headingStyle}>★ Get the Ear Delivered</div>
      <p style={copyStyle}>Sign up for the weekly dispatch — events and stories from around SoKno.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <input
          type="email"
          id="subscribe-email" name="subscribe-email" autoComplete="email"
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
            {state === "busy" ? "Signing you up…" : "Subscribe"}
          </button>
        </div>
        {state === "error" && (
          <p style={{ ...copyStyle, margin: 0, color: "var(--rust)" }} role="alert">
            Hmm — that didn&apos;t go through. Mind giving it another try in a moment?
          </p>
        )}
      </form>
    </section>
  );
}
