"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type State = "done" | "todo" | "late" | "failed" | "skipped" | "missed" | "na";
const GLYPH: Record<State, string> = { done: "✓", todo: "", late: "", failed: "✕", skipped: "–", missed: "✕", na: "" };
const WORD: Record<State, string> = { done: "done", todo: "to do", late: "late", failed: "failed", skipped: "skipped", missed: "missed", na: "not needed this week" };

/**
 * One box. Evidence boxes (`locked`) are the pipeline's and only display; the rest
 * are real checkboxes that save on click and roll back if the save fails.
 */
export function DeskCheck({ token, week, task, state, locked, label }: {
  token: string; week: string; task: string; state: State; locked: boolean; label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { if (!pending) setOptimistic(null); }, [pending, state]);

  const done = optimistic ?? state === "done";
  const shown: State = optimistic === null ? state : optimistic ? "done" : "todo";

  if (locked || state === "na" || state === "skipped") {
    return (
      <span className={`desk-box desk-box--${shown} desk-box--fixed`} role="img" aria-label={`${label}: ${WORD[shown]}`} title={locked ? "Ticked by the pipeline" : WORD[shown]}>
        {GLYPH[shown]}
      </span>
    );
  }

  async function toggle() {
    const next = !done;
    setError(false);
    setOptimistic(next);
    try {
      const r = await fetch("/api/desk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, week, task, done: next }) });
      if (!r.ok) throw new Error(String(r.status));
      start(() => router.refresh());
    } catch {
      setOptimistic(null);
      setError(true);
    }
  }

  return (
    <button
      type="button" role="checkbox" aria-checked={done} aria-label={label} onClick={toggle} disabled={pending}
      className={`desk-box desk-box--${shown}${error ? " desk-box--error" : ""}`}
      title={error ? "Couldn't save — try again" : done ? "Click to un-tick" : "Click to tick"}
    >
      {done ? "✓" : GLYPH[shown]}
    </button>
  );
}

/** The pipeline writes while the page is open; pull fresh state every minute. */
export function DeskRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
