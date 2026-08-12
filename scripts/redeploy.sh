#!/usr/bin/env bash
# Publish on the VPS — does only the work the change requires. Run from /var/www/soknoear.
#   content/asset-only change → sync + reload         (~5s)
#   app code change           → build + sync + reload (~1-2 min)
#   package-lock change       → npm ci + build + reload
set -euo pipefail
cd /var/www/soknoear

PORT="${PORT:-3007}"

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

if $needs_deps; then
  echo "→ dependencies changed: npm ci"
  npm ci
fi

if $needs_build; then
  echo "→ app code changed: full build"
  npm run build
  mkdir -p .next/standalone/.next/static
  rsync -a --delete .next/static/ .next/standalone/.next/static/
fi

# Sync assets + content into the standalone bundle.
# rsync updates in place. The old `rm -rf public && cp -R` briefly deleted every
# image while the site was live — load a page mid-deploy and you'd see broken art.
rsync -a --delete public/ .next/standalone/public/
rsync -a --delete content/ .next/standalone/content/

# ALWAYS reload, even for a content-only publish.
# Next's standalone server indexes public/ ONCE at boot and caches the list, so a
# newly synced image 404s until the process restarts. Skipping this reload is what
# shipped broken images. Costs ~2s — do not "optimize" it away again.
set -a; [ -f .env ] && . ./.env; set +a
pm2 startOrReload ecosystem.config.js --update-env
pm2 save >/dev/null

# Verify before declaring success: every image/audio file the episodes reference
# must actually serve. A publish that ships a broken asset fails HERE, loudly,
# instead of in a reader's browser.
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
  exit 1
fi
if [ "$pending" -gt 0 ]; then
  echo "✓ $checked published assets all serve · $pending draft asset(s) pending ($pending_list)"
else
  echo "✓ $checked published assets all serve"
fi

echo "deployed $NEW (deps=$needs_deps build=$needs_build)"
