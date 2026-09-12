// KILLSWITCH.GG — site script
// Status API lives on the status server (CT106) behind a Cloudflare tunnel.
const STATUS_API = 'https://status.superfucked.xyz/api/status';

// Slot counts (fallbacks when the API doesn't report max_players)
const SLOTS = { rust: 69, cs2: 16, mc: 20 };

// ── Wipe countdown: Thursday 16:00 America/Chicago ────────────────────────
// Uses Intl to get the real Chicago offset, so DST is handled correctly.
function chicagoOffsetMinutes(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function nextWipe(from = new Date()) {
  // Walk forward day by day until we hit a Thursday 16:00 Chicago that is in the future.
  for (let i = 0; i < 8; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const off = chicagoOffsetMinutes(probe);
    const local = new Date(probe.getTime() + off * 60000); // wall clock in Chicago, expressed as UTC fields
    if (local.getUTCDay() !== 4) continue;
    const wipeLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 16, 0, 0);
    const wipeUTC = wipeLocal - off * 60000;
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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const cards = [];
  let from = new Date();
  for (let i = 0; i < 5; i++) {
    const w = nextWipe(from);
    if (!w) break;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric' })
      .formatToParts(w).map(x => [x.type, x.value]));
    cards.push(`
      <div class="event-card">
        <div class="event-date">
          <div class="event-day">${String(p.day).padStart(2, '0')}</div>
          <div class="event-month">${months[+p.month - 1]}</div>
        </div>
        <div>
          <div class="event-title">Rust — Weekly Map Wipe</div>
          <div class="event-detail">4:00 PM CT · new 3500 seed · bases &amp; inventories reset · blueprints kept · kill leaderboard resets${i === 0 ? ' · <strong>next up</strong>' : ''}</div>
        </div>
        <span class="event-badge">${i === 0 ? 'NEXT WIPE' : 'WEEKLY'}</span>
      </div>`);
    from = new Date(w.getTime() + 60000);
  }
  const convoy = `
      <div class="event-card">
        <div class="event-date">
          <div class="event-day">∞</div>
          <div class="event-month">Auto</div>
        </div>
        <div>
          <div class="event-title">Rust — Convoy</div>
          <div class="event-detail">Spawns every 60–90 min · armed escort with NPC guards · elite crate for whoever clears it · marked on the map, announced in chat</div>
        </div>
        <span class="event-badge">RECURRING</span>
      </div>`;
  container.innerHTML = cards[0] + convoy + cards.slice(1).join('');
}
generateEventCards();

// ── Live status ────────────────────────────────────────────────────────────
function badge(id, online) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = online ? '● ONLINE' : '● OFFLINE';
  el.className = 'status-badge ' + (online ? 'online' : 'offline');
}
function dot(id, online) {
  const el = document.getElementById(id);
  if (el) el.className = 's-dot ' + (online ? 'online' : 'offline');
}
function text(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function applyStatus(data) {
  const rust = data.rust || {};
  const cs2 = data.cs2 || {};
  const mc = data.minecraft_blockhead || {};

  const rustMax = rust.max_players || SLOTS.rust;
  const cs2Max = cs2.max_players || SLOTS.cs2;
  const mcMax = mc.max_players || SLOTS.mc;

  // Hero widget
  text('hw-rust', `${rust.players ?? 0} / ${rustMax}`); dot('hw-rust-dot', !!rust.online);
  text('hw-cs2', `${cs2.players ?? 0} / ${cs2Max}`); dot('hw-cs2-dot', !!cs2.online);
  text('hw-mc', `${mc.players ?? 0} / ${mcMax}`); dot('hw-mc-dot', !!mc.online);

  // Server cards
  badge('rust-badge', !!rust.online); text('rust-players', `${rust.players ?? 0} / ${rustMax} players`);
  badge('cs2-badge', !!cs2.online); text('cs2-players', `${cs2.players ?? 0} / ${cs2Max} players`);
  badge('mc-badge', !!mc.online); text('mc-players', `${mc.players ?? 0} / ${mcMax} players`);

  // Status table
  badge('st-rust-badge', !!rust.online); text('st-rust-players', `${rust.players ?? 0} / ${rustMax}`);
  badge('st-cs2-badge', !!cs2.online); text('st-cs2-players', `${cs2.players ?? 0} / ${cs2Max}`);
  badge('st-mc-badge', !!mc.online); text('st-mc-players', `${mc.players ?? 0} / ${mcMax}`);
  if (rust.map) text('st-rust-event', `${rust.map} · wipes Thu 4 PM CT`);
  if (cs2.map) text('st-cs2-event', `Now playing: ${cs2.map}`);

  text('last-updated', `Last updated ${new Date().toLocaleTimeString()}`);
}

async function fetchStatus() {
  try {
    const res = await fetch(STATUS_API, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    applyStatus(await res.json());
  } catch (e) {
    text('last-updated', 'Live status unavailable right now');
  }
}
fetchStatus();
setInterval(fetchStatus, 30000);

// ── Copy to clipboard ──────────────────────────────────────────────────────
function copyIP(value, btn) {
  const original = btn ? btn.textContent : '';
  navigator.clipboard.writeText(value).then(() => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
    }
    showToast('✓ Copied: ' + value);
  }).catch(() => showToast('Copy failed — ' + value));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Mobile nav ─────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
if (hamburger) hamburger.addEventListener('click', () => document.getElementById('nav-links').classList.toggle('open'));
function closeMenu() { const n = document.getElementById('nav-links'); if (n) n.classList.remove('open'); }

// ── Nav scroll shadow ──────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.4)' : '';
});
