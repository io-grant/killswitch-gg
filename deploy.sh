#!/usr/bin/env bash
# Deploy killswitch-gg to Cloudflare Pages.
#
#   ./deploy.sh                               → deploys to killswitch-gg.pages.dev
#   SITE_DOMAIN=killswitch.gg ./deploy.sh     → stamps the real domain into every
#                                               absolute URL, then deploys
#
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
# Never ships: .git, deploy.sh, src-art/ (SVG masters), README.
set -euo pipefail
cd "$(dirname "$0")"

DEFAULT="killswitch-gg.pages.dev"
DOMAIN="${SITE_DOMAIN:-$DEFAULT}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

tar --exclude='./.git' --exclude='./.gitignore' --exclude='./deploy.sh' \
    --exclude='./src-art' --exclude='./README.md' --exclude='./qa.sh' \
    -cf - . | (cd "$OUT" && tar xf -)

if [ "$DOMAIN" != "$DEFAULT" ]; then
  grep -rl "$DEFAULT" "$OUT" 2>/dev/null | xargs -r sed -i "s|$DEFAULT|$DOMAIN|g"
  echo "stamped $DEFAULT -> $DOMAIN"
fi

echo "shipping $(find "$OUT" -type f | wc -l) files"
npx --yes wrangler@3 pages deploy "$OUT" \
  --project-name killswitch-gg --branch main --commit-dirty=true
