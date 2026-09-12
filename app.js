// KILLSWITCH.GG — site script (Error-Screen Blue identity)
const STATUS_API = 'https://status.superfucked.xyz/api/status';
const SLOTS = { rust: 69, cs2: 16, mc: 20 };

// ── Wipe countdown: Thursday 16:00 America/Chicago ────────────────────────
function chicagoOffsetMinutes(date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}
function nextWipe(from = new Date()) {
  for (let i = 0; i < 8; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const off = chicagoOffsetMinutes(probe);
    const local = new Date(probe.getTime() + off * 60000);
    if (local.getUTCDay() !== 4) continue;
    const wipeUTC = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 16, 0, 0) - off * 60000;
    if (wipeUTC > from.getTime()) return new Date(wipeUTC);
  }
  return null;
}
function updateCountdown() {
  const target = nextWipe();
  const diff = target ? target.getTime() - Date.now() : 0;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v).padStart(2, '0'); };
  if (diff <= 0) { ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => set(id, 0)); return; }
  set('cd-days', Math.floor(diff / 86400000));
  set('cd-hours', Math.floor((diff % 86400000) / 3600000));
  set('cd-mins', Math.floor((diff % 3600000) / 60000));
  set('cd-secs', Math.floor((diff % 60000) / 1000));
}
if (document.getElementById('cd-days')) { updateCountdown(); setInterval(updateCountdown, 1000); }

// ── Wipe event cards ───────────────────────────────────────────────────────
function generateEventCards() {
  const container = document.getElementById('event-list');
  if (!container) return;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const cards = [];
  let from = new Date();
  for (let i = 0; i < 5; i++) {
    const w = nextWipe(from);
    if (!w) break;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric' }).formatToParts(w).map(x => [x.type, x.value]));
    cards.push(`<div class="event-card">
        <div class="event-date"><div class="event-day">${String(p.day).padStart(2, '0')}</div><div class="event-month">${months[+p.month - 1]}</div></div>
        <div><div class="event-title">5.${i + 1} Rust wipe</div><div class="event-detail">16:00 CT · new seed · blueprints kept</div></div>
        <span class="event-badge">${i === 0 ? 'NEXT WIPE' : 'WEEKLY'}</span>
      </div>`);
    from = new Date(w.getTime() + 60000);
  }
  const convoy = `<div class="event-card">
        <div class="event-date"><div class="event-day">∞</div><div class="event-month">AUTO</div></div>
        <div><div class="event-title">5.0 Rust convoy</div><div class="event-detail">Every 60–90 min · guarded · elite crate</div></div>
        <span class="event-badge">RECURRING</span>
      </div>`;
  container.innerHTML = cards[0] + convoy + cards.slice(1).join('');
}
generateEventCards();

// ── Live status ────────────────────────────────────────────────────────────
function badge(id, online) { const el = document.getElementById(id); if (!el) return; el.textContent = online ? 'ONLINE' : 'OFFLINE'; el.className = 'status-badge ' + (online ? 'online' : 'offline'); }
function dot(id, online) { const el = document.getElementById(id); if (el) el.className = 's-dot ' + (online ? 'online' : 'offline'); }
function text(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function applyStatus(data) {
  const rust = data.rust || {}, cs2 = data.cs2 || {}, mc = data.minecraft_blockhead || {};
  const rustMax = rust.max_players || SLOTS.rust, cs2Max = cs2.max_players || SLOTS.cs2, mcMax = mc.max_players || SLOTS.mc;
  text('hw-rust', `${rust.players ?? 0} / ${rustMax}`); dot('hw-rust-dot', !!rust.online);
  text('hw-cs2', `${cs2.players ?? 0} / ${cs2Max}`); dot('hw-cs2-dot', !!cs2.online);
  text('hw-mc', `${mc.players ?? 0} / ${mcMax}`); dot('hw-mc-dot', !!mc.online);
  badge('rust-badge', !!rust.online); text('rust-players', `${rust.players ?? 0} / ${rustMax} players`);
  badge('cs2-badge', !!cs2.online); text('cs2-players', `${cs2.players ?? 0} / ${cs2Max} players`);
  badge('mc-badge', !!mc.online); text('mc-players', `${mc.players ?? 0} / ${mcMax} players`);
  badge('st-rust-badge', !!rust.online); text('st-rust-players', `${rust.players ?? 0} / ${rustMax}`);
  badge('st-cs2-badge', !!cs2.online); text('st-cs2-players', `${cs2.players ?? 0} / ${cs2Max}`);
  badge('st-mc-badge', !!mc.online); text('st-mc-players', `${mc.players ?? 0} / ${mcMax}`);
  if (rust.map) text('st-rust-event', `${rust.map} · wipes Thu 16:00 CT`);
  if (cs2.map) text('st-cs2-event', `now playing ${cs2.map}`);
  text('last-updated', `last updated ${new Date().toLocaleTimeString()}`);
  // live boot lines + tab title
  const b = (id, name, s, max) => { const el = document.getElementById(id); if (!el) return; const dots = '.'.repeat(Math.max(2, 14 - name.length)); el.innerHTML = `&gt; ${name} ${dots} ${s.online ? `ok (${s.players ?? 0}/${max})` : 'down'}`; };
  b('boot-rust', 'rust', rust, rustMax); b('boot-cs2', 'cs2', cs2, cs2Max); b('boot-mc', 'minecraft', mc, mcMax);
  window.__status = { rust: { ...rust, max: rustMax }, cs2: { ...cs2, max: cs2Max }, mc: { ...mc, max: mcMax } };
  document.title = `KILLSWITCH.GG · ${rust.players ?? 0}/${rustMax} · ${cs2.players ?? 0}/${cs2Max} · ${mc.players ?? 0}/${mcMax}`;
}
async function fetchStatus() {
  try { const r = await fetch(STATUS_API, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); applyStatus(await r.json()); }
  catch (e) { text('last-updated', 'status API unreachable, retrying'); }
}
fetchStatus(); setInterval(fetchStatus, 30000);

// ── Hold to copy ───────────────────────────────────────────────────────────
// Press and hold for 600 ms; the fill completes and the value is copied. Releasing early cancels.
function showToast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
function copyText(value) { return navigator.clipboard.writeText(value); }
document.querySelectorAll('.hold').forEach(btn => {
  let timer = null;
  const label = btn.querySelector('span'); const original = label ? label.textContent : '';
  const start = e => {
    if (btn.classList.contains('done')) return;
    if (e.type === 'touchstart') e.preventDefault();
    btn.classList.add('holding');
    timer = setTimeout(async () => {
      try { await copyText(btn.dataset.copy); btn.classList.remove('holding'); btn.classList.add('done'); if (label) label.textContent = 'COPIED'; showToast('> copied: ' + btn.dataset.copy); }
      catch (err) { showToast('> copy failed: ' + btn.dataset.copy); btn.classList.remove('holding'); }
      setTimeout(() => { btn.classList.remove('done'); if (label) label.textContent = original; }, 2200);
    }, 600);
  };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } btn.classList.remove('holding'); };
  btn.addEventListener('mousedown', start); btn.addEventListener('touchstart', start, { passive: false });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => btn.addEventListener(ev, cancel));
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyText(btn.dataset.copy).then(() => showToast('> copied: ' + btn.dataset.copy)); } });
});

// ── Mobile nav ─────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
if (hamburger) hamburger.addEventListener('click', () => document.getElementById('nav-links').classList.toggle('open'));
function closeMenu() { const n = document.getElementById('nav-links'); if (n) n.classList.remove('open'); }

// ── Keyboard: number keys jump to sections, any key scrolls past the hero ──
const KEYMAP = { '1': '#servers', '2': '#minecraft', '3': '/leaderboard', '4': '#events', '5': '/status', '6': '#community', 'Enter': '#community' };
function isTyping() { const t = document.activeElement; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
document.addEventListener('keydown', e => {
  if (isTyping() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/' || e.key === '~' || e.key === '`') { e.preventDefault(); openTerm(); return; }
  const target = KEYMAP[e.key];
  if (target) { e.preventDefault(); if (target.startsWith('#')) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' }); else location.href = target; return; }
  if (e.key.length === 1 && window.scrollY < 80 && document.getElementById('servers')) { document.getElementById('servers').scrollIntoView({ behavior: 'smooth' }); }
});

// ── Wipe alert: shows inside the last 30 minutes before a Rust wipe ────────
function checkWipeAlert() {
  const el = document.getElementById('wipe-alert'); if (!el) return;
  const t = nextWipe(); const ms = t ? t.getTime() - Date.now() : Infinity;
  if (ms > 0 && ms < 30 * 60000) { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); el.textContent = `RUST WIPE IN ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} — save nothing, it all goes.`; el.hidden = false; }
  else el.hidden = true;
}
checkWipeAlert(); setInterval(checkWipeAlert, 1000);

// ── Terminal ───────────────────────────────────────────────────────────────
const term = document.getElementById('term'), termOut = document.getElementById('term-out'), termIn = document.getElementById('term-in'), termForm = document.getElementById('term-form');
function openTerm() { if (!term) return; term.hidden = false; termIn.focus(); }
function closeTerm() { if (term) term.hidden = true; }
function tprint(html) { const d = document.createElement('div'); d.innerHTML = html; termOut.appendChild(d); termOut.scrollTop = termOut.scrollHeight; }
const CONNECT = { rust: 'client.connect rust.superfucked.xyz:28015', cs2: 'connect cs2.superfucked.xyz', minecraft: 'superfucked.xyz', mc: 'superfucked.xyz' };
const COMMANDS = {
  help: () => tprint('commands: <b>status</b> · <b>connect rust|cs2|mc</b> · <b>wipe</b> · <b>rank</b> · <b>pack</b> · <b>invite</b> · <b>clear</b> · <b>exit</b>'),
  status: () => { const s = window.__status; if (!s) return tprint('status not loaded yet'); ['rust', 'cs2', 'mc'].forEach(k => tprint(`${k.padEnd(9, '.')} ${s[k].online ? 'ONLINE ' : 'OFFLINE'} ${s[k].players ?? 0}/${s[k].max}${s[k].map ? ' · ' + s[k].map : ''}`)); },
  connect: (arg) => { const v = CONNECT[(arg || '').toLowerCase()]; if (!v) return tprint('usage: connect rust | cs2 | mc'); copyText(v).then(() => tprint(`copied: <b>${v}</b>`)).catch(() => tprint(`connect string: <b>${v}</b>`)); },
  wipe: () => { const t = nextWipe(); if (!t) return; const ms = t.getTime() - Date.now(); tprint(`next rust wipe in <b>${Math.floor(ms / 86400000)}d ${Math.floor(ms % 86400000 / 3600000)}h ${Math.floor(ms % 3600000 / 60000)}m</b> (${t.toLocaleString()})`); },
  rank: () => { location.href = '/leaderboard'; },
  pack: () => { closeTerm(); document.getElementById('minecraft')?.scrollIntoView({ behavior: 'smooth' }); },
  invite: () => { closeTerm(); document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' }); },
  clear: () => { termOut.innerHTML = ''; },
  exit: () => closeTerm(),
  sudo: () => tprint('permission denied. no mercy.'),
  ls: () => tprint('1.1 rust  1.2 cs2  1.3 minecraft'),
  whoami: () => tprint('guest. get an invite.'),
};
if (termForm) {
  termForm.addEventListener('submit', e => {
    e.preventDefault();
    const line = termIn.value.trim(); termIn.value = ''; if (!line) return;
    tprint(`<span class="cmd">&gt; ${line.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`);
    const [cmd, ...rest] = line.toLowerCase().split(/\s+/);
    (COMMANDS[cmd] || (() => tprint(`unknown command: ${cmd}. try <b>help</b>`)))(rest.join(' '));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !term.hidden) closeTerm(); });
}
