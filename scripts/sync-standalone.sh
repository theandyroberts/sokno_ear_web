#!/usr/bin/env bash
# Copy Next's static bundle + public + content into the standalone dir.
# Wired as npm `postbuild`, so ANY build — by hand, by redeploy.sh, by anyone —
# leaves the standalone server consistent with what it just built. (Aug 21, 2026:
# a by-hand build skipped this and every CSS/JS/font chunk 404'd site-wide.)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d .next/standalone ] || exit 0
mkdir -p .next/standalone/.next/static
rsync -a --delete .next/static/ .next/standalone/.next/static/
rsync -a --delete public/ .next/standalone/public/
rsync -a --delete content/ .next/standalone/content/
echo "standalone synced"
