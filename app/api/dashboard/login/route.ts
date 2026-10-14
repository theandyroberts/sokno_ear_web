import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DASH_COOKIE, deskToken, isDashboardPass, isDeskToken } from "@/lib/desk";

// Signs a device in to /dashboard. Takes the passphrase from the sign-in form, or the
// old desk token (sent quietly when someone opens /desk/<token>). The cookie holds the token.
export async function POST(req: Request) {
  const store = db();
  const form = (req.headers.get("content-type") ?? "").includes("json") ? null : await req.formData().catch(() => null);
  const body = form ? null : await req.json().catch(() => ({}));
  const pass = String(form?.get("pass") ?? body?.pass ?? "");
  const tok = String(body?.token ?? "");
  const ok = isDashboardPass(store, pass) || isDeskToken(store, tok);
  const token = deskToken(store);
  // A relative Location: behind the proxy req.url is the app's own localhost address.
  const back = (q = "") => new NextResponse(null, { status: 303, headers: { Location: `/dashboard${q}` } });

  if (!ok || !token) {
    await new Promise((r) => setTimeout(r, 1500)); // slow down guessing
    if (form) return back("?wrong=1");
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const res = form ? back() : NextResponse.json({ ok: true });
  res.cookies.set(DASH_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 3600 });
  return res;
}
