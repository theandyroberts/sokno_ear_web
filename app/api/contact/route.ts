import { NextResponse } from "next/server";
import { db, insertContact } from "@/lib/db";
import { sendContactEmail } from "@/lib/mail";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true }); // honeypot
  const email = String(b.email ?? "").trim().toLowerCase();
  const message = String(b.message ?? "").trim();
  if (!EMAIL.test(email) || !message) {
    return NextResponse.json({ error: "email and message required" }, { status: 400 });
  }
  const c = { name: String(b.name ?? "").slice(0, 200), email: email.slice(0, 300), message: message.slice(0, 5000) };
  insertContact(db(), c);
  await sendContactEmail(c);
  return NextResponse.json({ ok: true });
}
