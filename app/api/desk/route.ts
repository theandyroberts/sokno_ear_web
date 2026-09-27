import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDeskToken, isWeek, setDeskMark } from "@/lib/desk";

// Andy's own ticks on the publishing desk. Everything else on that page is written
// by the pipeline (scripts/pub-status.mjs), not through here.
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const store = db();
  // Same answer for a wrong token as for a page that doesn't exist.
  if (!isDeskToken(store, String(b.token ?? ""))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const task = String(b.task ?? "").slice(0, 120);
  if (!isWeek(b.week) || !task) return NextResponse.json({ error: "week and task required" }, { status: 400 });

  const r = setDeskMark(store, b.week, task, Boolean(b.done));
  if (r === "unknown-task") return NextResponse.json({ error: "no such task this week" }, { status: 404 });
  if (r === "locked") return NextResponse.json({ error: "that box is ticked by the pipeline" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
