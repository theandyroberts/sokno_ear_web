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

// Submit button styled inline as rust variant to match DS Button look.
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
  background: "var(--rust)",
  color: "var(--on-rust)",
  boxShadow: "var(--shadow-press)",
};

export function EventSubmitForm() {
  const [headline, setHeadline] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [dates, setDates] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headline.trim() || !details.trim()) return;
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ headline, details, dates, url, contact, company }),
    });
    if (res.ok) setSent(true);
  }

  if (sent) {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ Got an event? Tell The Ear</div>
        <p style={copyStyle}>Thank you — we&apos;re all ears. We&apos;ll take it from here.</p>
      </section>
    );
  }

  return (
    <section style={boxStyle}>
      <div style={headingStyle}>★ Got an event? Tell The Ear</div>
      <p style={copyStyle}>
        Know about something happening around SoKno — an event, an opening, neighborhood news? Send it our way and we&apos;ll put it in the Ear.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <input
          type="text"
          placeholder="Event or news headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          required
          style={inputStyle}
        />
        <textarea
          rows={3}
          placeholder="What's happening? Day, time, place…"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="When? (date or range)"
          value={dates}
          onChange={(e) => setDates(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Link (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Your contact (optional, for follow-up)"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
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
          <button type="submit" style={submitBtnStyle}>
            Tell The Ear <span aria-hidden="true" style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>→</span>
          </button>
        </div>
      </form>
      <p style={{ ...copyStyle, margin: "var(--space-4) 0 0", fontSize: "var(--text-xs)", color: "var(--ink-faded)" }}>
        Send things in often? <a href="/submitter" style={{ color: "var(--rust)" }}>Become a verified submitter</a> to
        review drafts of your items before they run.
      </p>
    </section>
  );
}
