# killswitch-gg

Static site for the KILLSWITCH.GG game-server network (Rust · CS2 1v1 arena · modded Minecraft).
No framework, no build step: plain HTML, CSS and JS.

## Identity

"Error-Screen Blue" — two colours (`#0000AA` / `#FFFFFF`), two fonts
(Bricolage Grotesque 800 display, Space Mono everything else), numbered sections,
manual-page voice, hold-to-copy connect strings.

## Layout

| Path | What |
|---|---|
| `index.html` | Home. Sections 1–6. |
| `status.html` → `/status` | Full status board. |
| `leaderboard.html` → `/leaderboard` | Rust (per-wipe) + CS2 (all-time) ranking. |
| `app.js` | Shared: countdown, status polling, hold-to-copy, keyboard nav, terminal, map plate. |
| `status.js`, `leaderboard.js` | Page-specific logic (kept external so the CSP can forbid inline script). |
| `img/` | Shipped art. `src-art/` holds the SVG masters and is **not** deployed. |
| `_headers`, `_redirects` | Cloudflare Pages security headers, cache policy, clean URLs. |

## Live data

Everything dynamic comes from the status API on CT106, via the Cloudflare tunnel:

- `GET https://status.superfucked.xyz/api/status` — players, map, uptime per server
- `GET .../api/map` — current Rust map (rustmaps v4, seed read live from the server)
- `GET .../api/leaderboard` — Rust kills this wipe
- `GET .../api/cs2/leaderboard` — CS2 arena points, all-time

If the API is unreachable every page still renders; the live bits degrade to a message.

## Deploying

The Pages project is **not** connected to git, so pushing here does not deploy.
Deploy from CT111 (which holds the Cloudflare token):

```bash
cd ~/killswitch-gg && git pull
set -a; . ~/.env; set +a
export CLOUDFLARE_API_TOKEN="$CF_TOKEN"
export CLOUDFLARE_ACCOUNT_ID=<account id>
./deploy.sh
```

### When the real domain lands

1. Cloudflare dashboard → Pages → killswitch-gg → Custom domains → add `killswitch.gg`.
2. Redeploy with the domain stamped in:

```bash
SITE_DOMAIN=killswitch.gg ./deploy.sh
```

That rewrites canonicals, OG image URLs, the sitemap, robots and the manifest.
Nothing in the source needs editing.
