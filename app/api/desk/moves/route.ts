import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDeskToken, getMoves, setMoveAnswer } from "@/lib/desk";

// Andy's answers to the week's moves. The Instagram dashboard lives on note15.com and
// calls this from there, so this is the one desk route that answers cross-origin —
// to that origin only. The key travels in the body, never in the address.
const ORIGINS = new Set(["https://note15.com", "https://www.note15.com"]);

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const h: Record<string, string> = { Vary: "Origin" };
  if (ORIGINS.has(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

const ANSWERS = ["go", "no", "done", "later"] as const;

// POST { token }                       → the open moves
// POST { token, key, answer?, note? }  → record an answer, then the open moves
export async function POST(req: Request) {
  const headers = cors(req);
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400, headers }); }
  const store = db();
  // Same answer for a wrong key as for a page that doesn't exist.
  if (!isDeskToken(store, String(b.token ?? ""))) return NextResponse.json({ error: "not found" }, { status: 404, headers });

  if (b.key != null) {
    const answer = b.answer == null ? null : String(b.answer);
    if (answer !== null && !(ANSWERS as readonly string[]).includes(answer)) return NextResponse.json({ error: "no such answer" }, { status: 400, headers });
    const note = typeof b.note === "string" && b.note.trim() ? b.note : null;
    const r = setMoveAnswer(store, String(b.key).slice(0, 80), answer as (typeof ANSWERS)[number] | null, note);
    if (r === "unknown-move") return NextResponse.json({ error: "no such move" }, { status: 404, headers });
    if (r === "closed") return NextResponse.json({ error: "that move is finished" }, { status: 409, headers });
    if (r === "bad-answer") return NextResponse.json({ error: "that answer doesn't fit this move" }, { status: 400, headers });
  }
  return NextResponse.json({ ok: true, moves: getMoves(store) }, { headers });
}
