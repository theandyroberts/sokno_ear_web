#!/usr/bin/env bash
# Publish on the VPS — does only the work the change requires. Run from /var/www/soknoear.
#   content/public-only change  → sync files            (~5s, no restart needed: pages read fs per request)
#   app code change             → npm build + reload    (~1-2 min)
#   package-lock change         → npm ci + build + reload
set -euo pipefail
cd /var/www/soknoear

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
  rm -rf .next/standalone/public && cp -R public .next/standalone/public
  mkdir -p .next/standalone/.next
  rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static
  rm -rf .next/standalone/content && cp -R content .next/standalone/content
  set -a; [ -f .env ] && . ./.env; set +a
  pm2 startOrReload ecosystem.config.js --update-env
  pm2 save
else
  echo "→ content/assets only: fast sync (no build, no restart)"
  rm -rf .next/standalone/public && cp -R public .next/standalone/public
  rm -rf .next/standalone/content && cp -R content .next/standalone/content
fi

echo "deployed $NEW (deps=$needs_deps build=$needs_build)"
