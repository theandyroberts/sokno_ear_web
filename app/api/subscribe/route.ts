import { NextResponse } from "next/server";
import { db, insertSubscriber } from "@/lib/db";
import { sendSubscriberEmail } from "@/lib/mail";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true });
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ error: "valid email required" }, { status: 400 });
  insertSubscriber(db(), email);
  await sendSubscriberEmail(email);
  return NextResponse.json({ ok: true });
}
