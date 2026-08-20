import { NextResponse } from "next/server";
import { db, subscribeToList, type SubscriberList } from "@/lib/db";
import { sendSubscriberEmail, sendWelcomeEmail, sendDsPartyWelcomeEmail } from "@/lib/mail";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Two lists share this endpoint: 'ear' (the weekly episode email — the default,
// used by the homepage sidebar form) and 'dsparty' (the /party page's
// notify-me form). The form names itself via `list`; `source` in the DB records
// which door they came through. One email can hold both memberships.
const LISTS: Record<string, { list: SubscriberList; source: string }> = {
  ear: { list: "ear", source: "ear-sidebar" },
  dsparty: { list: "dsparty", source: "dsparty-page" },
};

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true, welcomed: true });
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ error: "valid email required" }, { status: 400 });
  const target = LISTS[String(b.list ?? "ear")];
  if (!target) return NextResponse.json({ error: "unknown list" }, { status: 400 });

  const { newToList } = subscribeToList(db(), email, target.list, target.source);
  if (newToList) {
    // Each list has its own welcome: the Ear's newsprint note, or the party
    // list's acid-green one. The city desk hears about both.
    if (target.list === "ear") await sendWelcomeEmail(email);
    else await sendDsPartyWelcomeEmail(email);
    await sendSubscriberEmail(email, target.list);
  }
  return NextResponse.json({ ok: true, welcomed: newToList });
}
