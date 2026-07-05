import { NextResponse } from "next/server";
import { db, findPendingDraftsForProfile, markDraftLinkSent, upsertSubmitterProfile } from "@/lib/db";
import { sendDraftLinkEmail, sendSubmitterRegistrationEmail } from "@/lib/mail";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SITE = "https://soknoear.com";

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true }); // honeypot
  const name = String(b.name ?? "").trim().slice(0, 200);
  const phone = String(b.phone ?? "").trim().slice(0, 50);
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!name || !EMAIL.test(email)) {
    return NextResponse.json({ error: "name and a valid email required" }, { status: 400 });
  }

  const store = db();
  upsertSubmitterProfile(store, { name, phone, email });

  // Retroactive match: drafts already on file from this person's phone/email get
  // their review links now. The city desk still decides what publishes.
  const pending = findPendingDraftsForProfile(store, { phone, email });
  for (const d of pending) {
    await sendDraftLinkEmail(email, { name, title: d.title, draftUrl: `${SITE}/draft/${d.token}` });
    markDraftLinkSent(store, d.id, email);
  }
  await sendSubmitterRegistrationEmail({ name, phone, email, linkedDrafts: pending.length });

  return NextResponse.json({ ok: true, linkedDrafts: pending.length });
}
