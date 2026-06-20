"use client";
import * as React from "react";

type Props = { title?: string; intro: string; description: string; duration: string; src: string };

export function AudioBriefingPlayer({
  title = "Weekend Audio Briefing", intro, description, duration, src,
}: Props) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [elapsed, setElapsed] = React.useState("00:00");

  const bars = React.useMemo(
    () => Array.from({ length: 52 }, (_, i) => 18 + Math.round(30 * Math.abs(Math.sin(i * 1.4) * Math.cos(i * 0.5)))),
    []
  );

  const fmt = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${ss}`;
  };

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const onTime = () => {
    const a = audioRef.current; if (!a || !a.duration) return;
    setProgress(a.currentTime / a.duration);
    setElapsed(fmt(a.currentTime));
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const timeStyle: React.CSSProperties = {
    fontFamily: "var(--font-label)", fontSize: "var(--label-sm)",
    letterSpacing: "0.04em", color: "var(--ink-faded)", whiteSpace: "nowrap",
  };

  return (
    <section style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-md)", padding: "var(--space-5)", boxShadow: "var(--shadow-lift)" }}>
      <audio ref={audioRef} src={src} preload="metadata"
        onTimeUpdate={onTime} onEnded={() => setPlaying(false)} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase", color: "var(--ink-black)", paddingBottom: 10, marginBottom: 14,
        borderBottom: "var(--border-hair) solid var(--paper-edge)" }}>
        <span aria-hidden style={{ color: "var(--rust)" }}>★</span>{title}
        <span aria-hidden style={{ color: "var(--rust)" }}>★</span>
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "var(--text-deck)",
        lineHeight: 1.3, color: "var(--ink-black)", margin: "0 0 var(--space-4)" }}>{intro}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{ flex: "none", width: 64, height: 64, borderRadius: "var(--radius-pill)",
            border: "var(--border-heavy) solid var(--ink-black)",
            background: hover ? "var(--green-bridge)" : "var(--teal)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background-color 120ms ease", boxShadow: "var(--shadow-press)" }}>
          <span aria-hidden style={{ fontSize: 23, lineHeight: 1, marginLeft: playing ? 0 : 3,
            color: hover ? "var(--paper-cream)" : "var(--ink-black)" }}>{playing ? "❚❚" : "▶"}</span>
        </button>
        <div aria-hidden style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height: 54 }}>
          {bars.map((h, i) => (
            <span key={i} style={{ flex: 1, height: h,
              background: i / bars.length < progress ? "var(--rust)" : "var(--ink-black)",
              opacity: i / bars.length < progress ? 0.9 : 0.55, borderRadius: 1 }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 14px" }}>
        <span style={timeStyle}>{elapsed}</span>
        <div onClick={seek} style={{ flex: 1, height: 3, background: "var(--paper-edge)",
          borderRadius: 999, position: "relative", cursor: "pointer" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`,
            background: "var(--ink-black)", borderRadius: 999 }} />
          <div style={{ position: "absolute", left: `${progress * 100}%`, top: "50%", width: 13, height: 13,
            marginLeft: -6, transform: "translateY(-50%)", background: "var(--rust)",
            border: "2px solid var(--ink-black)", borderRadius: 999 }} />
        </div>
        <span style={timeStyle}>{duration}</span>
      </div>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", lineHeight: 1.5,
        color: "var(--ink-faded)", margin: 0 }}>{description}</p>
    </section>
  );
}
