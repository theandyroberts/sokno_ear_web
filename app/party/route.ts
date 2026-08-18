import { NextResponse } from "next/server";

// Sayable alias: "soknoear.com slash party" → the Dirty South page.
export function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.redirect(new URL(`/dirtysouthparty${url.search}`, url.origin), 308);
}
