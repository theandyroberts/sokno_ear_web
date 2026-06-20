"use client";
import React from "react";
import { Button } from "./Button.jsx";

/**
 * Tipline — the "Get the Ear Delivered" / "Have a Tip?" module. A bordered
 * paper box with a rubric heading, a line of copy, and either an email signup
 * (mode="subscribe") or a tip prompt (mode="tip").
 */
export function Tipline({
  mode = "subscribe",
  title,
  blurb,
  placeholder,
  cta,
  onSubmit,
  style = {},
  ...rest
}) {
  const isTip = mode === "tip";
  const heading = title || (isTip ? "Have a Tip? We're All Ears." : "Get the Ear Delivered");
  const copy =
    blurb ||
    (isTip
      ? "Send a rumor, a tip, or a neighborhood heads-up. We hear things."
      : "Sign up for our weekly dispatch of events, rumors, and all things SoKno.");
  const ph = placeholder || (isTip ? "What did you hear?" : "Your email address");
  const label = cta || (isTip ? "Submit a Tip" : "Subscribe");

  return (
    <section
      style={{
        background: "var(--paper-bright)",
        border: "var(--border-ink) solid var(--ink-black)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-5)",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontWeight: "var(--weight-label)",
          fontSize: "var(--label-md)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "var(--rust)",
          marginBottom: "8px",
        }}
      >
        ★ {heading}
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5, color: "var(--ink-black)", margin: "0 0 var(--space-4)" }}>
        {copy}
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(e); }}
        style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
      >
        {isTip ? (
          <textarea
            rows={2}
            placeholder={ph}
            style={{ ...inputStyle, flex: "1 1 100%", resize: "vertical", minHeight: "48px" }}
          />
        ) : (
          <input type="email" placeholder={ph} style={{ ...inputStyle, flex: "1 1 160px" }} />
        )}
        <Button variant={isTip ? "rust" : "primary"} arrow={isTip} size="md" style={{ flex: isTip ? "1 1 100%" : "none", justifyContent: "center" }}>
          {label}
        </Button>
      </form>
    </section>
  );
}

const inputStyle = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  color: "var(--ink-black)",
  background: "var(--paper-cream)",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  outline: "none",
};
