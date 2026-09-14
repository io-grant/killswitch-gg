#!/usr/bin/env bash
# KILLSWITCH.GG site QA sweep
BASE="${1:-https://killswitch-gg.pages.dev}"
TMP=/tmp/claude-1000/-home-grant/f29570cb-c2b7-47cf-b8f0-a356579394e8/scratchpad/qa
mkdir -p "$TMP"; rm -rf "$TMP"/*; PASS=0; FAIL=0
ok(){ printf '  ok   %s\n' "$1"; PASS=$((PASS+1)); }
bad(){ printf '  FAIL %s\n' "$1"; FAIL=$((FAIL+1)); }

echo "=== 1. routes ==="
for p in "" status leaderboard status.html leaderboard.html 404.html robots.txt sitemap.xml favicon.ico; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' -m 20 "$BASE/$p")
  [ "$code" = 200 ] && ok "/$p ($code)" || bad "/$p ($code)"
done
code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$BASE/definitely-not-a-page")
[ "$code" = 404 ] && ok "unknown path returns 404" || bad "unknown path returns $code (want 404)"

echo "=== 2. assets ==="
for a in style.css app.js img/og.png img/favicon.svg img/apple-touch-icon.png \
         img/rust-banner-wide.png img/cs2-banner.png img/mc-banner.png img/rust-header.png img/mc-hero.svg; do
  read -r code type < <(curl -s -o /dev/null -w '%{http_code} %{content_type}' -m 20 "$BASE/$a")
  [ "$code" = 200 ] && ok "$a ($type)" || bad "$a ($code)"
done

# The second grep drops ANY url with a scheme, not just http/mailto. The site ships
# steam://connect/... launch links; curl-ing those as relative paths returns 404 and
# reads as a broken internal link when nothing is broken.
echo "=== 3. internal links resolve ==="
for page in "" status leaderboard; do
  curl -s -m 20 "$BASE/$page" -o "$TMP/p.html"
  grep -oE 'href="[^"#][^"]*"' "$TMP/p.html" | sed 's/href="//; s/"$//' \
    | grep -vE '^(https?:|mailto:|//)' \
    | grep -vE '^[a-z][a-z0-9+.-]*:' \
    | sort -u | while read -r l; do
      u="$BASE/${l#/}"
      code=$(curl -sL -o /dev/null -w '%{http_code}' -m 20 "$u")
      [ "$code" = 200 ] && echo "  ok   [/$page] $l" || echo "  FAIL [/$page] $l ($code)"
    done
done

echo "=== 4. external links ==="
curl -s -m 20 "$BASE/" -o "$TMP/home.html"
grep -oE 'https?://[^"]+' "$TMP/home.html" | grep -vE 'killswitch-gg|fonts\.(googleapis|gstatic)|schema.org' | sort -u | while read -r u; do
  code=$(curl -sLI -o /dev/null -w '%{http_code}' -m 25 "$u")
  case "$code" in 200|30*) echo "  ok   $u ($code)";; *) echo "  WARN $u ($code)";; esac
done

echo "=== 5. APIs ==="
for ep in api/status api/leaderboard api/cs2/leaderboard api/map health; do
  code=$(curl -s -o "$TMP/api.json" -w '%{http_code}' -m 25 "https://status.superfucked.xyz/$ep")
  cors=$(curl -sI -m 15 "https://status.superfucked.xyz/$ep" | grep -ci 'access-control-allow-origin' || true)
  if [ "$code" = 200 ]; then ok "$ep (200, CORS hdr: $cors)"; else bad "$ep ($code)"; fi
done
python3 - "$TMP" <<'PY'
import json, sys, urllib.request
base = "https://status.superfucked.xyz"
def get(p):
    with urllib.request.urlopen(base + p, timeout=20) as r: return json.load(r)
s = get("/api/status")
for k in ("rust", "cs2", "minecraft_blockhead"):
    d = s.get(k, {})
    missing = [f for f in ("online", "players", "max_players") if f not in d]
    print(f"  {'ok  ' if not missing else 'FAIL'} status.{k} {'' if not missing else 'missing ' + str(missing)}")
m = get("/api/map")
need = ("seed", "size", "imageUrl", "totalMonuments")
print(f"  {'ok  ' if all(x in m for x in need) else 'FAIL'} map fields {[x for x in need if x not in m]}")
print(f"  ok   map seed={m.get('seed')} size={m.get('size')} monuments={m.get('totalMonuments')}")
for p, keys in (("/api/leaderboard", ("players", "total_kills")), ("/api/cs2/leaderboard", ("players", "total_kills", "weapons"))):
    d = get(p); miss = [k for k in keys if k not in d]
    print(f"  {'ok  ' if not miss else 'FAIL'} {p} {miss if miss else ''}")
PY

echo "=== 6. rendered DOM (JS actually ran) ==="
render(){ timeout 90 chromium --headless=new --disable-gpu --user-data-dir="$TMP/cr-$2" --virtual-time-budget=12000 --dump-dom "$1" 2>/dev/null; }
render "$BASE/" home > "$TMP/r-home.html"
for pat in 'id="event-list"><div class="event-card"' 'FIG. 5.0' 'SEED [0-9]' 'ok (' 'class="status-badge online"' 'map-img'; do
  grep -q "$pat" "$TMP/r-home.html" && ok "home renders: $pat" || bad "home missing: $pat"
done
render "$BASE/status" st > "$TMP/r-status.html"
grep -qE 'players' "$TMP/r-status.html" && grep -q 'ONLINE' "$TMP/r-status.html" && ok "status page shows live players" || bad "status page not populated"
render "$BASE/leaderboard" lb > "$TMP/r-lb.html"
grep -q 'lb-tab' "$TMP/r-lb.html" && ok "leaderboard tabs render" || bad "leaderboard tabs missing"
grep -qE 'NOBODY|No arena|lb-table' "$TMP/r-lb.html" && ok "leaderboard shows data or empty state" || bad "leaderboard neither data nor empty state"

echo "=== 7. accessibility / meta basics ==="
for f in r-home r-status r-lb; do
  n=$(grep -o '<img ' "$TMP/$f.html" | wc -l); a=$(grep -o '<img [^>]*alt=' "$TMP/$f.html" | wc -l)
  [ "$n" -eq "$a" ] && ok "$f: all $n <img> have alt" || bad "$f: $a/$n <img> have alt"
  grep -q '<html lang=' "$TMP/$f.html" && ok "$f: html lang" || bad "$f: no html lang"
  grep -q 'name="viewport"' "$TMP/$f.html" && ok "$f: viewport" || bad "$f: no viewport"
  grep -q 'og:image' "$TMP/$f.html" && ok "$f: og:image" || bad "$f: no og:image"
done

echo "=== 8. security headers (pre-hardening baseline) ==="
curl -sI -m 20 "$BASE/" | grep -iE 'content-security-policy|x-frame-options|x-content-type|referrer-policy|permissions-policy|strict-transport' || echo "  (none set)"

echo; echo "=== summary: $PASS ok, $FAIL failed ==="
