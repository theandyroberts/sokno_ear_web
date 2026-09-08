// Read the Ear's Umami analytics through a read-only share link.
//
//   node scripts/umami.mjs                    → last 30 days
//   node scripts/umami.mjs 2026-09-02 2026-09-08
//
// The instance is self-hosted, so there is no API key to issue — Andy created a
// share link instead (everything enabled except realtime). Getting at it needs one
// non-obvious thing, which is the whole reason this file exists:
//
//   GET /api/share/<shareId>  →  { websiteId, token, shareType, parameters }
//   then call the ordinary /api/websites/<websiteId>/… endpoints with BOTH
//     x-umami-share-token:   <token>
//     x-umami-share-context: <shareType>      ← omit this and every call 401s
//
// The context header is undocumented and does not appear in the share response's
// own field names; it was read off the dashboard's client bundle
// (SHARE_CONTEXT_HEADER) and confirmed by intercepting a live request.
//
// Config lives in /var/www/soknoear/.env as UMAMI_BASE_URL / UMAMI_SHARE_URL, or
// pass them in the environment. Metric types on this build: referrer, path,
// browser, os, device, country, city, region, channel. (Not url, not utm_*.)

const DEFAULT_BASE = "https://stats.note15.com";
const TZ = "America/New_York";

/** Auth headers for a share-scoped request. The context header is the load-bearing one. */
export function shareHeaders({ token, shareType = 1 }) {
  return {
    Accept: "application/json",
    "x-umami-share-token": token,
    "x-umami-share-context": String(shareType ?? 1),
  };
}

/** Accept a full share URL or a bare id. */
export function shareIdFrom(urlOrId) {
  if (!urlOrId) throw new Error("no share URL or id given");
  if (!urlOrId.includes("/")) return urlOrId;
  const m = urlOrId.match(/\/share\/([^/?#]+)/);
  if (!m) throw new Error(`not a Umami share link: ${urlOrId}`);
  return m[1];
}

/** Inclusive local-day range → the millisecond bounds the API expects. */
export function dayWindow(from, to) {
  return {
    startAt: new Date(`${from}T00:00:00-04:00`).getTime(),
    endAt: new Date(`${to}T23:59:59-04:00`).getTime(),
  };
}

export async function connect({ base = process.env.UMAMI_BASE_URL || DEFAULT_BASE, share = process.env.UMAMI_SHARE_URL } = {}) {
  const id = shareIdFrom(share);
  const res = await fetch(`${base}/api/share/${id}`);
  if (!res.ok) throw new Error(`share lookup failed: ${res.status}`);
  const s = await res.json();
  const headers = shareHeaders(s);
  const get = async (path, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${base}/api/websites/${s.websiteId}/${path}?${qs}`, { headers });
    if (!r.ok) throw new Error(`${path} → ${r.status}`);
    return r.json();
  };
  return {
    websiteId: s.websiteId,
    stats: (w) => get("stats", w),
    metrics: (w, type, limit = 20) => get("metrics", { ...w, type, limit }),
    pageviews: (w, unit = "day") => get("pageviews", { ...w, unit, timezone: TZ }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [from, to] = process.argv.slice(2);
  const end = to ?? new Date().toISOString().slice(0, 10);
  const start = from ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const w = dayWindow(start, end);
  const u = await connect();
  const s = await u.stats(w);
  console.log(`\n★ soknoear.com — ${start} → ${end}`);
  console.log(`  ${s.visitors} visitors · ${s.visits} visits · ${s.pageviews} pageviews\n`);
  for (const type of ["referrer", "channel", "path", "device"]) {
    const rows = await u.metrics(w, type, 10);
    console.log(`  ${type}`);
    for (const r of rows) console.log(`    ${String(r.x ?? "(none)").padEnd(44)} ${r.y}`);
    console.log("");
  }
}
