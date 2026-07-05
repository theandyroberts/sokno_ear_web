import { NextResponse } from "next/server";
import { db, getStoryDraftByToken, insertDraftComment } from "@/lib/db";
import { sendDraftCommentEmail } from "@/lib/mail";

const SITE = "https://soknoear.com";

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (b.company) return NextResponse.json({ ok: true }); // honeypot
  const token = String(b.token ?? "").trim();
  const name = String(b.name ?? "").trim().slice(0, 200);
  const comment = String(b.comment ?? "").trim().slice(0, 5000);
  if (!comment) return NextResponse.json({ error: "comment required" }, { status: 400 });

  const store = db();
  const draft = getStoryDraftByToken(store, token);
  if (!draft) return NextResponse.json({ error: "not found" }, { status: 404 });

  insertDraftComment(store, { draftId: draft.id, name, comment });
  await sendDraftCommentEmail({
    draftId: draft.id, title: draft.title, name, comment,
    draftUrl: `${SITE}/draft/${draft.token}`,
  });
  return NextResponse.json({ ok: true });
}
