#!/usr/bin/env bash
# Deploy killswitch-gg to Cloudflare Pages.
#   ./deploy.sh                      → deploys as-is (killswitch-gg.pages.dev)
#   SITE_DOMAIN=killswitch.gg ./deploy.sh
#     → stamps every absolute URL with the real domain first, then deploys.
# Requires CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) in the environment.
set -euo pipefail
cd "$(dirname "$0")"
DEFAULT="killswitch-gg.pages.dev"
DOMAIN="${SITE_DOMAIN:-$DEFAULT}"
SRC="$PWD"

if [ "$DOMAIN" != "$DEFAULT" ]; then
  OUT="$(mktemp -d)"
  # copy the site, excluding VCS and sources we don't ship
  tar --exclude='./.git' --exclude='./deploy.sh' -cf - . | (cd "$OUT" && tar xf -)
  grep -rl "$DEFAULT" "$OUT" --include='*.html' --include='*.js' --include='*.xml' \
       --include='*.txt' --include='*.webmanifest' --include='_headers' 2>/dev/null \
    | xargs -r sed -i "s|$DEFAULT|$DOMAIN|g"
  echo "stamped $DEFAULT -> $DOMAIN"
  SRC="$OUT"
fi

npx --yes wrangler@3 pages deploy "$SRC" \
  --project-name killswitch-gg --branch main --commit-dirty=true
