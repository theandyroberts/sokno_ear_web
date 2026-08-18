import type { NextRequest } from "next/server";

// Sayable alias: "soknoear.com slash party" → the Dirty South page.
// Relative Location so the redirect survives the nginx proxy (the Node server's
// own origin is localhost, not soknoear.com).
export function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  return new Response(null, {
    status: 308,
    headers: { Location: `/dirtysouthparty${search}` },
  });
}
