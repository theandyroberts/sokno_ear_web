import { NextResponse } from "next/server";
import { db, insertSubscriber } from "@/lib/db";
import { sendSubscriberEmail, sendWelcomeEmail } from "@/lib/mail";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true });
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ error: "valid email required" }, { status: 400 });
  const isNew = insertSubscriber(db(), email);
  if (isNew) {
    await sendWelcomeEmail(email);     // greet the neighbor right away
    await sendSubscriberEmail(email);  // and tell the city desk
  }
  return NextResponse.json({ ok: true });
}
