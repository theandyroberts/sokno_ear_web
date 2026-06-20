import React from "react";

/**
 * AudioBriefing — the recurring neighborhood radio dispatch, built to match the
 * paper: a stamped header, a bold serif intro, a big round teal play button, a
 * hand-set waveform, a timeline with a draggable-looking progress dot, a short
 * description, and a rust "LISTEN NOW →" cue. Never a glossy podcast embed.
 */
export function AudioBriefing({
  title = "Weekend Audio Briefing",
  intro = "What's happening in SoKno. The 90-second roundup.",
  description = "Your quick listen for events, closures, tips, and the latest local buzz.",
  duration = "01:30",
  listenLabel = "Listen now",
  style = {},
  ...rest
}) {
  const [playing, setPlaying] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [progress, setProgress] = React.useState(0.34);

  const bars = React.useMemo(
    () => Array.from({ length: 52 }, (_, i) => 18 + Math.round(30 * Math.abs(Math.sin(i * 1.4) * Math.cos(i * 0.5)))),
    []
  );

  return (
    <section
      style={{
        background: "var(--paper-bright)",
        border: "var(--border-ink) solid var(--ink-black)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-5)",
        boxShadow: "var(--shadow-lift)",
        ...style,
      }}
      {...rest}
    >
      {/* stamped header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          fontFamily: "var(--font-label)",
          fontSize: "var(--label-md)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "var(--ink-black)",
          paddingBottom: "10px",
          marginBottom: "14px",
          borderBottom: "var(--border-hair) solid var(--paper-edge)",
        }}
      >
        <span aria-hidden="true" style={{ color: "var(--rust)" }}>★</span>
        {title}
        <span aria-hidden="true" style={{ color: "var(--rust)" }}>★</span>
      </div>

      {/* bold serif intro */}
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--text-deck)", lineHeight: 1.3, color: "var(--ink-black)", margin: "0 0 var(--space-4)" }}>
        {intro}
      </p>

      {/* play + waveform */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            flex: "none",
            width: "64px",
            height: "64px",
            borderRadius: "var(--radius-pill)",
            border: "var(--border-heavy) solid var(--ink-black)",
            background: hover ? "var(--green-bridge)" : "var(--teal)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 120ms ease",
            boxShadow: "var(--shadow-press)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "23px", lineHeight: 1, marginLeft: playing ? 0 : "3px", color: hover ? "var(--paper-cream)" : "var(--ink-black)" }}>
            {playing ? "❚❚" : "▶"}
          </span>
        </button>

        <div aria-hidden="true" style={{ flex: 1, display: "flex", alignItems: "center", gap: "2px", height: "54px" }}>
          {bars.map((h, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${h}px`,
                background: i / bars.length < progress ? "var(--rust)" : "var(--ink-black)",
                opacity: i / bars.length < progress ? 0.9 : 0.55,
                borderRadius: "1px",
              }}
            />
          ))}
        </div>
      </div>

      {/* timeline with progress dot */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0 14px" }}>
        <span style={timeStyle}>{fmt(progress, duration)}</span>
        <div style={{ flex: 1, height: "3px", background: "var(--paper-edge)", borderRadius: "999px", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: "var(--ink-black)", borderRadius: "999px" }} />
          <div style={{ position: "absolute", left: `${progress * 100}%`, top: "50%", width: "13px", height: "13px", marginLeft: "-6px", transform: "translateY(-50%)", background: "var(--rust)", border: "2px solid var(--ink-black)", borderRadius: "999px" }} />
        </div>
        <span style={timeStyle}>{duration}</span>
      </div>

      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5, color: "var(--ink-faded)", margin: "0 0 var(--space-4)" }}>
        {description}
      </p>

      <a
        href="#listen"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--label-md)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "var(--link)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5em",
        }}
      >
        {listenLabel} <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

const timeStyle = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "0.04em",
  color: "var(--ink-faded)",
  whiteSpace: "nowrap",
};

function fmt(progress, duration) {
  // turn the duration "mm:ss" + progress into an elapsed readout
  const parts = String(duration).split(":").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return "00:00";
  const total = parts[0] * 60 + parts[1];
  const el = Math.round(total * progress);
  const m = String(Math.floor(el / 60)).padStart(2, "0");
  const s = String(el % 60).padStart(2, "0");
  return `${m}:${s}`;
}
