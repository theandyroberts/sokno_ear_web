#!/usr/bin/env bash
# Publish a new build/edition on the VPS. Run from /var/www/soknoear.
set -euo pipefail
cd /var/www/soknoear

git pull --ff-only
npm ci
npm run build

# standalone build does not include public/ or .next/static — copy them in
rm -rf .next/standalone/public && cp -R public .next/standalone/public
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static

# load secrets into the env so PM2 picks them up
set -a
[ -f .env ] && . ./.env
set +a

pm2 startOrReload ecosystem.config.js --update-env
pm2 save
echo "deployed $(git rev-parse --short HEAD)"
