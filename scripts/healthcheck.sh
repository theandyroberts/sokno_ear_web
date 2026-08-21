#!/usr/bin/env bash
# Reader's-eye watchdog for soknoear.com — cron runs it every 5 minutes.
# Checks that the homepage and party page render AND that the Next chunks (CSS/JS/
# fonts) and a content asset they reference actually serve — the failure mode a plain
# uptime ping can't see (HTML 200, every asset 404). On failure: one self-heal
# (re-sync standalone bundle + pm2 reload), re-check, then email Andy only if still
# broken. One alert per incident + one on recovery, tracked by a state file.
set -uo pipefail
cd /var/www/soknoear
PORT="${PORT:-3007}"
STATE=/home/andy/.soknoear-health-state
LOG=/home/andy/logs/healthcheck.log
mkdir -p /home/andy/logs
set -a; [ -f .env ] && . ./.env; set +a
ts() { date "+%Y-%m-%d %H:%M:%S"; }
alert() { node scripts/alert.mjs "$1" "$2" >/dev/null 2>&1 || echo "$(ts) (alert email failed)" >> "$LOG"; }

check() {
  local bad=0 html code ref page
  for page in / /dirtysouthparty; do
    html=$(curl -s --max-time 10 "http://127.0.0.1:$PORT$page") || { echo "$page unreachable"; return 1; }
    [ -n "$html" ] || { echo "$page returned empty body"; return 1; }
    for ref in $(echo "$html" | grep -oE '/_next/static/[A-Za-z0-9/_.-]+\.(js|css|woff2)' | sort -u | head -40); do
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT$ref")
      [ "$code" = "200" ] || { echo "$ref → $code"; bad=$((bad + 1)); }
    done
  done
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT/assets/masthead.jpg")
  [ "$code" = "200" ] || { echo "/assets/masthead.jpg → $code"; bad=$((bad + 1)); }
  [ "$bad" -eq 0 ]
}

if out=$(check 2>&1); then
  if [ -f "$STATE" ]; then
    echo "$(ts) RECOVERED" >> "$LOG"; rm -f "$STATE"
    alert "soknoear.com recovered" "Health check passing again at $(ts)."
  fi
  exit 0
fi

echo "$(ts) FAIL: $out" >> "$LOG"
bash scripts/sync-standalone.sh >/dev/null 2>&1 || true
pm2 reload soknoear --update-env >/dev/null 2>&1 || true
sleep 4
if out2=$(check 2>&1); then
  echo "$(ts) SELF-HEALED (was: $out)" >> "$LOG"
  alert "soknoear.com self-healed" "Health check failed:\n$out\n\nRe-synced the standalone bundle and reloaded — passing again at $(ts). No action needed, but worth knowing something rebuilt outside redeploy.sh."
  exit 0
fi

echo "$(ts) STILL FAILING: $out2" >> "$LOG"
if [ ! -f "$STATE" ]; then
  date > "$STATE"
  alert "ALERT: soknoear.com is broken" "Health check failing and self-heal did not fix it:\n$out2\n\nCheck: pm2 logs soknoear · /home/andy/logs/healthcheck.log · bash scripts/redeploy.sh --force-build"
fi
exit 1
