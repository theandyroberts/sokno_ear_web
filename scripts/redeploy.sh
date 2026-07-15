#!/usr/bin/env bash
# Publish on the VPS — does only the work the change requires. Run from /var/www/soknoear.
#   content/asset-only change → sync + reload         (~5s)
#   app code change           → build + sync + reload (~1-2 min)
#   package-lock change       → npm ci + build + reload
set -euo pipefail
cd /var/www/soknoear

PORT="${PORT:-3007}"

OLD=$(git rev-parse HEAD)
git pull --ff-only
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

# Verify before declaring success: every image/audio file the editions and drafts
# reference must actually serve. A publish that ships a broken asset fails HERE,
# loudly, instead of in a reader's browser.
echo "→ verifying referenced assets…"
for i in $(seq 1 15); do
  curl -sfS -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 1
done
missing=0
checked=0
for asset in $(grep -ohE '"/(assets|audio)/[A-Za-z0-9/_.-]+"' content/editions/*.json content/drafts/*.json 2>/dev/null | tr -d '"' | sort -u); do
  checked=$((checked + 1))
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$asset" || echo 000)
  if [ "$code" != "200" ]; then
    echo "  !! $asset → $code"
    missing=$((missing + 1))
  fi
done
if [ "$missing" -gt 0 ]; then
  echo "DEPLOY FAILED VERIFICATION: $missing of $checked referenced asset(s) not served"
  exit 1
fi
echo "✓ $checked referenced assets all serve"

echo "deployed $NEW (deps=$needs_deps build=$needs_build)"
