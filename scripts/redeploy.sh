#!/usr/bin/env bash
# Publish on the VPS — atomic release flip, so a deploy can never take the site down.
#   content/asset-only change → assemble release + flip (~10s)
#   app code change           → build + assemble release + flip (~1-2 min, site up throughout)
#   package-lock change       → npm ci + build + assemble + flip
#
# How it stays non-destructive (Sep 8 incident: an in-place build deleted the very
# server.js PM2 was running, and the watchdog's mid-build reload turned that into a
# crash loop):
#   1. build runs in the repo; the live site serves from releases/<id>/, untouched
#   2. the new release is booted on a spare port and probed BEFORE anything flips
#   3. `current` symlink swaps via mv -T (atomic rename); pm2 reload picks it up
#   4. if post-flip verification fails, the symlink flips straight back
set -euo pipefail
cd /var/www/soknoear

PORT="${PORT:-3007}"
PREFLIGHT_PORT=3017
RELEASES=/var/www/soknoear/releases
CURRENT=/var/www/soknoear/current
# `--force-build`: rebuild even with no code change (e.g. a NEXT_PUBLIC_* env edit).
# This is the ONLY sanctioned way to rebuild — a by-hand `npm run build` never
# reaches the flip, so nothing it breaks can go live, but it also publishes nothing.
FORCE_BUILD=false
for _arg in "$@"; do [ "$_arg" = "--force-build" ] && FORCE_BUILD=true; done

# Stage 1: pull, then hand off to the freshly-pulled copy of this script.
# Bash reads a script lazily, so letting `git pull` rewrite this file mid-run means
# the rest of the run comes from the new bytes at the old offset — in practice it
# silently executed the PREVIOUS version. Pull first, then exec the new one.
if [ "${REDEPLOY_STAGE:-}" != "run" ]; then
  OLD=$(git rev-parse HEAD)
  git pull --ff-only
  REDEPLOY_STAGE=run REDEPLOY_OLD="$OLD" exec bash scripts/redeploy.sh "$@"
fi

OLD="${REDEPLOY_OLD:-$(git rev-parse HEAD)}"
NEW=$(git rev-parse HEAD)
CHANGED=$(git diff --name-only "$OLD" "$NEW" || true)

needs_deps=false
needs_build=false
[ -d node_modules ] || needs_deps=true
[ -d .next/standalone ] || needs_build=true
if [ "$OLD" != "$NEW" ]; then
  if echo "$CHANGED" | grep -qE "^(package-lock\.json|package\.json)$"; then needs_deps=true; fi
  # anything outside content/assets/docs/scripts means app code changed → rebuild
  if echo "$CHANGED" | grep -vE "^(content/|public/|docs/|scripts/|\.claude/)" | grep -vE "\.md$" | grep -q .; then
    needs_build=true
  fi
fi
if $needs_deps; then needs_build=true; fi
if $FORCE_BUILD; then needs_build=true; echo "→ --force-build requested"; fi

if $needs_deps; then
  echo "→ dependencies changed: npm ci"
  npm ci
fi

if $needs_build; then
  echo "→ app code changed: full build (live site keeps serving the old release)"
  npm run build
fi

# Staging dir: .next/standalone assembled by the build (postbuild hook) or by the
# rsyncs below for content-only publishes. It is never served — releases are.
mkdir -p .next/standalone/.next/static
rsync -a --delete .next/static/ .next/standalone/.next/static/
rsync -a --delete public/ .next/standalone/public/
rsync -a --delete content/ .next/standalone/content/

# Cut an immutable release from staging. cp -a of ~135M costs ~1s.
mkdir -p "$RELEASES"
RELEASE="$RELEASES/$(date +%Y%m%d-%H%M%S)-${NEW:0:8}"
cp -a .next/standalone "$RELEASE"

# Preflight: boot the release on a spare port and make sure both pages actually
# render before it can touch production. Same env the real process gets.
set -a; [ -f .env ] && . ./.env; set +a
echo "→ preflight: booting release on :$PREFLIGHT_PORT"
NODE_ENV=production PORT=$PREFLIGHT_PORT HOSTNAME=127.0.0.1 \
  SQLITE_PATH="${SQLITE_PATH:-/var/lib/soknoear/ear.db}" \
  node "$RELEASE/server.js" >/tmp/soknoear-preflight.log 2>&1 &
PREFLIGHT_PID=$!
preflight_ok=false
for _ in $(seq 1 20); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PREFLIGHT_PORT/" \
     && curl -sf -o /dev/null "http://127.0.0.1:$PREFLIGHT_PORT/dirtysouthparty"; then
    preflight_ok=true; break
  fi
  sleep 1
done
kill "$PREFLIGHT_PID" >/dev/null 2>&1 || true
wait "$PREFLIGHT_PID" 2>/dev/null || true
if ! $preflight_ok; then
  rm -rf "$RELEASE"
  echo "DEPLOY ABORTED: release failed preflight — production untouched. /tmp/soknoear-preflight.log:"
  tail -20 /tmp/soknoear-preflight.log
  exit 1
fi
echo "✓ preflight passed"

# Atomic flip. mv -T is a rename(2) — readers see the old release or the new one,
# never a half-state. Remember the old target so verification failure can roll back.
PREV=$(readlink "$CURRENT" 2>/dev/null || true)
ln -s "$RELEASE" "$CURRENT.new.$$"
mv -T "$CURRENT.new.$$" "$CURRENT"

# Reload onto the new release. The server chdirs to its own realpath, so until this
# reload the old process keeps serving the old release's files — no gap but the
# ~1s process restart itself.
pm2 startOrReload ecosystem.config.js --update-env
pm2 save >/dev/null

rollback() {
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    echo "!! rolling back to $PREV"
    ln -s "$PREV" "$CURRENT.new.$$" && mv -T "$CURRENT.new.$$" "$CURRENT"
    pm2 reload soknoear --update-env >/dev/null 2>&1 || true
  fi
}

# Verify before declaring success: every image/audio file the episodes reference
# must actually serve. A publish that ships a broken asset fails HERE, loudly,
# instead of in a reader's browser — and now also rolls the flip back.
#
# Drafts are checked too, but only WARN. A draft always references audio that
# won't exist until Andy records it Wednesday, so hard-failing on drafts made
# every research-day deploy exit 1 — and a check that cries wolf weekly is a
# check nobody reads. Published assets still hard-fail. Keep it that way.
echo "→ verifying referenced assets…"
for _ in $(seq 1 15); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null && break
  sleep 1
done

# `|| true` because grep exits 1 on no matches, and pipefail would abort the run.
asset_refs() {
  grep -ohE '"/(assets|audio)/[A-Za-z0-9/_.-]+"' "$@" 2>/dev/null | tr -d '"' | sort -u || true
}
published=$(asset_refs content/episodes/*.json)
draft_refs=$(asset_refs content/drafts/*.json)
# An asset referenced by BOTH is published — a live episode depends on it, so it
# must hard-fail. -Fx keeps an empty `published` from matching every draft line.
draft_only=$(printf '%s\n' "$draft_refs" | grep -v '^$' \
  | grep -Fxv -f <(printf '%s\n' "$published") || true)

serve_code() { curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$1" || echo 000; }

missing=0
checked=0
while IFS= read -r asset; do
  [ -n "$asset" ] || continue
  checked=$((checked + 1))
  code=$(serve_code "$asset")
  if [ "$code" != "200" ]; then
    echo "  !! $asset → $code"
    missing=$((missing + 1))
  fi
done <<< "$published"

pending=0
pending_list=""
while IFS= read -r asset; do
  [ -n "$asset" ] || continue
  code=$(serve_code "$asset")
  if [ "$code" != "200" ]; then
    echo "  ~~ draft asset not ready: $asset → $code (warning only)"
    pending=$((pending + 1))
    pending_list="${pending_list:+$pending_list, }$asset"
  fi
done <<< "$draft_only"

if [ "$missing" -gt 0 ]; then
  echo "DEPLOY FAILED VERIFICATION: $missing of $checked published asset(s) not served"
  rollback
  exit 1
fi
if [ "$pending" -gt 0 ]; then
  echo "✓ $checked published assets all serve · $pending draft asset(s) pending ($pending_list)"
else
  echo "✓ $checked published assets all serve"
fi

# Next's own bundle must serve too. Sample the homepage + party page and curl every
# /_next/static chunk they reference — catches a release out of sync with its build
# before a reader's console fills with 404s (Aug 21 incident).
echo "→ verifying Next static bundle…"
bundle_missing=0; bundle_checked=0
for page in / /dirtysouthparty; do
  for ref in $(curl -s "http://127.0.0.1:$PORT$page" | grep -oE '/_next/static/[A-Za-z0-9/_.-]+\.(js|css|woff2)' | sort -u); do
    bundle_checked=$((bundle_checked + 1))
    code=$(serve_code "$ref")
    if [ "$code" != "200" ]; then echo "  !! $ref → $code"; bundle_missing=$((bundle_missing + 1)); fi
  done
done
if [ "$bundle_missing" -gt 0 ]; then
  echo "DEPLOY FAILED VERIFICATION: $bundle_missing of $bundle_checked Next static file(s) not served — release out of sync"
  rollback
  exit 1
fi
echo "✓ $bundle_checked Next static files serve"

# Keep the 5 newest releases (~135M each) so any of the last few deploys can be
# flipped back to by hand: ln -sfn <release> current && pm2 reload soknoear
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf

echo "deployed $NEW → $RELEASE (deps=$needs_deps build=$needs_build)"
