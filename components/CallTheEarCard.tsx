import * as React from "react";

// Synth-wave "call the future in" CTA — deliberately off-palette (neon on ink)
// but framed like the paper's other wells so it sits in the layout.
const PHONE_DISPLAY = "865-252-6500";
const PHONE_TEL = "tel:+18652526500";
const PHONE_SMS = "sms:+18652526500";

const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5em",
  fontFamily: "var(--font-label)",
  fontWeight: 600,
  fontSize: "var(--label-md)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textDecoration: "none",
  borderRadius: 10,
  padding: "13px 18px",
};

export function CallTheEarCard() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        border: "var(--border-ink) solid var(--ink-black)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lift)",
        background: "linear-gradient(165deg, #1b1033 0%, #241040 55%, #2f1149 100%)",
        color: "#efe6ff",
        padding: "22px 20px 18px",
      }}
    >
      {/* synth grid horizon */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          opacity: 0.35,
          background:
            "repeating-linear-gradient(90deg, transparent 0 34px, #b23df2 34px 35px), repeating-linear-gradient(0deg, transparent 0 17px, #b23df2 17px 18px)",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
          transform: "perspective(160px) rotateX(38deg)",
          transformOrigin: "bottom center",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: "var(--font-label)",
            fontSize: "var(--label-sm)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#53f2e6",
            border: "1px solid #53f2e6",
            borderRadius: 999,
            padding: "3px 12px",
            marginBottom: 12,
            boxShadow: "0 0 12px rgba(83,242,230,0.35)",
          }}
        >
          The Ear sees the future
        </div>

        <h3
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: "1.35rem",
            lineHeight: 1.2,
            margin: "0 0 8px",
            color: "#ffffff",
          }}
        >
          Know something before it happens?
        </h3>
        <div
          style={{
            background: "rgba(255, 209, 102, 0.09)",
            border: "1px solid rgba(255, 209, 102, 0.55)",
            borderRadius: 10,
            padding: "10px 14px",
            margin: "0 0 14px",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "#ffd166", display: "block", marginBottom: 2 }}>SoKnoEar.com has a phone number!</strong>
          <span style={{ color: "#ffffff" }}>
            Call <a href={PHONE_TEL} style={{ color: "#ffd166", fontWeight: 700, textDecoration: "none" }}>865-252-6500</a> with
            your event, news, or food/drink special.
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.55, color: "#cfc2ef", margin: "0 0 16px" }}>
          Know about a show, a pop-up, a grand opening, a drink special? Call or text it in. A realtime AI
          assistant answers <strong style={{ color: "#ffd166" }}>24/7</strong>, takes the details in
          one quick conversation, and the city desk takes it from there. No forms, no waiting.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          <a
            href={PHONE_TEL}
            style={{
              ...btnBase,
              background: "linear-gradient(90deg, #ff8a3d, #ff3d77)",
              color: "#1b1033",
              boxShadow: "0 0 18px rgba(255,90,120,0.45)",
            }}
          >
            <span aria-hidden>📞</span> Call the SoKno Ear
          </a>
          <a
            href={PHONE_SMS}
            style={{
              ...btnBase,
              background: "transparent",
              color: "#53f2e6",
              border: "1.5px solid #53f2e6",
              boxShadow: "0 0 14px rgba(83,242,230,0.3) inset, 0 0 12px rgba(83,242,230,0.25)",
            }}
          >
            <span aria-hidden>💬</span> Text the SoKno Ear
          </a>
        </div>

        <p
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "var(--label-sm)",
            letterSpacing: "0.1em",
            textAlign: "center",
            color: "#9d8fc4",
            margin: 0,
          }}
        >
          {PHONE_DISPLAY} · always listening
        </p>
      </div>
    </section>
  );
}
