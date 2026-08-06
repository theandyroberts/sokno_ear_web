"use client";
import React from "react";

const boxStyle: React.CSSProperties = {
  background: "var(--paper-bright)",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-5)",
};
const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-label)", fontWeight: "var(--weight-label)", fontSize: "var(--label-md)",
  letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--rust)", marginBottom: "8px",
};
const copyStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5,
  color: "var(--ink-black)", margin: "0 0 var(--space-4)",
};
const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-black)",
  background: "var(--paper-cream)", border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)", padding: "10px 12px", outline: "none", width: "100%",
};
const honeypotStyle: React.CSSProperties = { position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" };
const submitBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.5em", fontFamily: "var(--font-label)",
  fontWeight: "var(--weight-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase", cursor: "pointer", userSelect: "none", textDecoration: "none",
  border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-sm)",
  padding: "11px 22px", background: "var(--rust)", color: "var(--on-rust)", boxShadow: "var(--shadow-press)",
};

export function SubmitterForm() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [sent, setSent] = React.useState(false);
  const [linked, setLinked] = React.useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const res = await fetch("/api/submitter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, phone, email, company }),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      setLinked(Number(body.linkedDrafts ?? 0));
      setSent(true);
    }
  }

  if (sent) {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ Verified submitter</div>
        <p style={copyStyle}>
          You&apos;re on the list — thanks{name ? `, ${name.split(" ")[0]}` : ""}.
          {linked > 0
            ? ` We found ${linked} draft${linked === 1 ? "" : "s"} from you already — check your email for the review link${linked === 1 ? "" : "s"}.`
            : " Next time you call or write in, we'll email you a link to review the draft before it runs."}
        </p>
      </section>
    );
  }

  return (
    <section style={boxStyle}>
      <div style={headingStyle}>★ Become a verified submitter</div>
      <p style={copyStyle}>
        Call or write in often? Leave your name, phone, and email, and whenever a submission of
        yours becomes a draft we&apos;ll email you a link to read it and comment before it runs.
        The city desk still decides what gets published.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <input type="text" placeholder="Your name" id="submitter-name" name="submitter-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        <input type="tel" placeholder="Your phone (the one you call from)" id="submitter-phone" name="submitter-phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        <input type="email" placeholder="Your email (where review links go)" id="submitter-email" name="submitter-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <div style={honeypotStyle} aria-hidden="true">
          <input type="text" name="company" value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>
        <div>
          <button type="submit" style={submitBtnStyle}>
            Sign me up <span aria-hidden="true" style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
