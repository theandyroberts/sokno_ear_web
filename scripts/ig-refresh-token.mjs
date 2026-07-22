// Refresh the long-lived Instagram access token (Instagram Login flavor) in place.
// Long-lived tokens last 60 days and can be refreshed any time after they're 24h old;
// each refresh restarts the 60-day clock, so a weekly cron keeps it alive forever
// and Andy never has to visit the Meta dashboard again.
//
//   node scripts/ig-refresh-token.mjs      (run from /var/www/soknoear; rewrites .env)
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
const env = fs.readFileSync(envPath, "utf8");
const m = env.match(/^IG_ACCESS_TOKEN=(.+)$/m);
if (!m) {
  console.error("ig-refresh: no IG_ACCESS_TOKEN line in .env — nothing to refresh");
  process.exit(1);
}
const token = m[1].trim().replace(/^"|"$/g, "");

const res = await fetch(
  `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`
);
const body = await res.json().catch(() => ({}));

if (!res.ok || !body.access_token) {
  // A token <24h old refuses to refresh — that's fine, next week's run gets it.
  console.error(`ig-refresh: FAILED ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}

fs.writeFileSync(envPath, env.replace(/^IG_ACCESS_TOKEN=.+$/m, `IG_ACCESS_TOKEN=${body.access_token}`));
console.log(`ig-refresh: ok — new token valid for ${(body.expires_in / 86400).toFixed(0)} days`);
