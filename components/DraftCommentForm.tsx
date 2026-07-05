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

export function DraftCommentForm({ token }: { token: string }) {
  const [name, setName] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [company, setCompany] = React.useState(""); // honeypot
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await fetch("/api/draft-comment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, name, comment, company }),
    });
    if (res.ok) setSent(true);
  }

  if (sent) {
    return (
      <section style={boxStyle}>
        <div style={headingStyle}>★ Comment on this draft</div>
        <p style={copyStyle}>Got it — thank you. The city desk will read your note before this runs.</p>
      </section>
    );
  }

  return (
    <section style={boxStyle}>
      <div style={headingStyle}>★ Comment on this draft</div>
      <p style={copyStyle}>
        Spot something off, or can you answer one of the questions above? Tell the city desk —
        corrections, missing details, better wording, all welcome.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
        <input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <textarea rows={5} placeholder="Your corrections, answers, or notes…" value={comment} onChange={(e) => setComment(e.target.value)} required style={inputStyle} />
        <div style={honeypotStyle} aria-hidden="true">
          <input type="text" name="company" value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>
        <div>
          <button type="submit" style={submitBtnStyle}>
            Send to the city desk <span aria-hidden="true" style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
