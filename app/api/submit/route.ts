import { NextResponse } from "next/server";
import { db, insertSubmission } from "@/lib/db";
import { sendSubmissionEmail } from "@/lib/mail";

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true });            // honeypot: pretend success
  const headline = String(b.headline ?? "").trim();
  const details = String(b.details ?? "").trim();
  if (!headline || !details) return NextResponse.json({ error: "headline and details required" }, { status: 400 });
  const s = { headline: headline.slice(0, 300), details: details.slice(0, 5000),
    url: String(b.url ?? "").slice(0, 500), dates: String(b.dates ?? "").slice(0, 200),
    contact: String(b.contact ?? "").slice(0, 300) };
  insertSubmission(db(), s);
  await sendSubmissionEmail(s);
  return NextResponse.json({ ok: true });
}
