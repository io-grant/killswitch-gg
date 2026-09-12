const API = 'https://status.superfucked.xyz/api/status';
const SLOTS = { rust: 69, cs2: 16, mc: 20 };
const $ = id => document.getElementById(id);
function fmtUptime(sec) {
  if (sec == null) return '—';
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
function paint(key, s, fallbackMax) {
  const online = !!(s && s.online), max = (s && s.max_players) || fallbackMax, players = (s && s.players) || 0;
  $('card-' + key).classList.toggle('offline', !online);
  const b = $('b-' + key); b.textContent = online ? 'ONLINE' : 'OFFLINE'; b.className = 'status-badge ' + (online ? 'online' : 'offline');
  $('pl-' + key).innerHTML = online ? `${players}<small>/ ${max} players</small>` : `<small style="margin:0">OFFLINE</small>`;
  $('m-' + key).style.width = (online && max ? Math.min(100, 100 * players / max) : 0) + '%';
  const up = online && s.since ? Math.max(0, Math.floor(Date.now() / 1000 - s.since)) : null;
  $('up-' + key).textContent = fmtUptime(up);
  const mapEl = $('map-' + key); if (mapEl && s && s.map) mapEl.textContent = s.map;
}
async function load() {
  try {
    const r = await fetch(API, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    paint('rust', d.rust, SLOTS.rust); paint('cs2', d.cs2, SLOTS.cs2); paint('mc', d.minecraft_blockhead, SLOTS.mc);
    const online = ['rust', 'cs2', 'minecraft_blockhead'].filter(k => d[k] && d[k].online).length;
    $('updated').textContent = `> ${online}/3 online · updated ${new Date().toLocaleTimeString()}`;
  } catch (e) { $('updated').textContent = '> status API unreachable, retrying every 30 s'; }
}
load(); setInterval(load, 30000);
