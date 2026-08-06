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

export function ContactForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, message, company }),
    });
    if (res.ok) setSent(true);
  }

  if (sent) {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ Get in touch</div>
        <p style={copyStyle}>Thanks for reaching out — Andy&apos;ll get back to you.</p>
      </section>
    );
  }

  return (
    <section style={boxStyle}>
      <div style={headingStyle}>★ Get in touch</div>
      <p style={copyStyle}>Questions, story ideas, or just want to say hi? Drop Andy a line.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <input type="text" placeholder="Your name (optional)" id="contact-name" name="contact-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input type="email" placeholder="Your email" id="contact-email" name="contact-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <textarea rows={4} placeholder="Your message" id="contact-message" name="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} required style={inputStyle} />
        <div style={honeypotStyle} aria-hidden="true">
          <input type="text" name="company" value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>
        <div>
          <button type="submit" style={submitBtnStyle}>
            Send <span aria-hidden="true" style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
