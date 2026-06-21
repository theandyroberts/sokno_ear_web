#!/usr/bin/env bash
# optimize-image.sh — resize + compress an image for the web.
#
# Usage: scripts/optimize-image.sh <input> <output> [maxEdge] [jpegQuality]
#   <output>      target path; extension (.jpg/.jpeg/.png) decides format
#   maxEdge       longest-edge px (default 900 — fine for ~440px display @2x)
#   jpegQuality   1-100, JPEG only (default 88)
#
# JPEG is best for the engraving/portrait art (smooth tints compress well).
# PNG is best for flat/line diagrams (crisp edges); pngquant is used if present.
set -euo pipefail
in="${1:?input required}"; out="${2:?output required}"; maxedge="${3:-900}"; q="${4:-88}"
ext="${out##*.}"
tmp="$(mktemp -t optimg).${in##*.}"; cp "$in" "$tmp"
sips -Z "$maxedge" "$tmp" >/dev/null
case "$ext" in
  jpg|jpeg) sips -s format jpeg -s formatOptions "$q" "$tmp" --out "$out" >/dev/null ;;
  png)
    sips -s format png "$tmp" --out "$out" >/dev/null
    command -v pngquant >/dev/null 2>&1 && \
      pngquant --quality=60-90 --force --ext .png --skip-if-larger "$out" 2>/dev/null || true ;;
  *) echo "unknown output extension: .$ext (use .jpg or .png)" >&2; exit 1 ;;
esac
rm -f "$tmp"
echo "wrote $out ($(du -h "$out" | cut -f1 | tr -d ' '))"
