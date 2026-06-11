// API base — both endpoints live on the same status server
const STATUS_API = 'https://status.superfucked.xyz/api/status';
const MAP_API    = 'https://status.superfucked.xyz/api/map';
// Internal fallback (only works from LAN): 'http://REDACTED-INTERNAL-IP:8765/api/status'

// ── Countdown timer (Thursday 4pm CDT = 21:00 UTC) ─────────────────────────
function nextThursday4pmCT() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  // CDT = UTC-5 during daylight saving (March–November), UTC-6 otherwise
  const month = now.getUTCMonth() + 1;
  const cdtOffset = (month >= 3 && month <= 11) ? -5 : -6;
  const cdtNow = new Date(utcMs + cdtOffset * 3600000);

  // Find next Thursday at 16:00 CDT
  let day = cdtNow.getDay(); // 0=Sun, 4=Thu
  let daysUntilThursday = (4 - day + 7) % 7;
  if (daysUntilThursday === 0 && (cdtNow.getHours() > 16 || (cdtNow.getHours() === 16 && cdtNow.getMinutes() >= 0))) {
    daysUntilThursday = 7; // already past today's wipe, next week
  }

  const wipeCDT = new Date(cdtNow);
  wipeCDT.setDate(cdtNow.getDate() + daysUntilThursday);
  wipeCDT.setHours(16, 0, 0, 0);

  // Convert back to UTC ms
  return new Date(wipeCDT.getTime() - cdtOffset * 3600000).getTime();
}

function updateCountdown() {
  const target = nextThursday4pmCT();
  const diff = target - Date.now();
  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '00';
    document.getElementById('cd-hours').textContent = '00';
    document.getElementById('cd-mins').textContent = '00';
    document.getElementById('cd-secs').textContent = '00';
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  document.getElementById('cd-days').textContent  = String(days).padStart(2,'0');
  document.getElementById('cd-hours').textContent = String(hours).padStart(2,'0');
  document.getElementById('cd-mins').textContent  = String(mins).padStart(2,'0');
  document.getElementById('cd-secs').textContent  = String(secs).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ── Generate wipe event cards ───────────────────────────────────────────────
function generateEventCards() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const events = [];

  // Next 5 Thursdays
  let d = new Date(now);
  let found = 0;
  while (found < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 4) { // Thursday
      const label = found === 0 ? 'NEXT WIPE' : 'WEEKLY';
      events.push({ day: d.getDate(), month: months[d.getMonth()], label });
      found++;
    }
  }

  const container = document.getElementById('event-list');
  container.innerHTML = events.map((e, i) => `
    <div class="event-card">
      <div class="event-date">
        <div class="event-day">${String(e.day).padStart(2,'0')}</div>
        <div class="event-month">${e.month}</div>
      </div>
      <div>
        <div class="event-title">Rust Server — Weekly Wipe</div>
        <div class="event-detail">rust.superfucked.xyz · 4:00 PM CT · Fresh map saves · All progress reset${i === 0 ? ' · <strong>This Thursday</strong>' : ''}</div>
      </div>
      <span class="event-badge">${e.label}</span>
    </div>
  `).join('');

  // Insert a Dangerous Treasures event after first wipe card
  const dtCard = `
    <div class="event-card">
      <div class="event-date">
        <div class="event-day">∞</div>
        <div class="event-month">Auto</div>
      </div>
      <div>
        <div class="event-title">Dangerous Treasures</div>
        <div class="event-detail">Rust server · Auto-spawns every 90 min · NPC guards · Elite crate loot</div>
      </div>
      <span class="event-badge">RECURRING</span>
    </div>
  `;
  container.children[0].insertAdjacentHTML('afterend', dtCard);
}
generateEventCards();

// ── Status API ──────────────────────────────────────────────────────────────
function applyStatus(data) {
  const rust = data.rust || {};
  const cs2  = data.cs2  || {};
  const mc   = data.minecraft_blockhead || {};
  const ec   = data.minecraft_everycraft || {};

  // Helper
  function badge(el, online) {
    if (!el) return;
    el.textContent = online ? '● ONLINE' : '● OFFLINE';
    el.className = 'status-badge ' + (online ? 'online' : 'offline');
  }
  function dot(id, online) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 's-dot ' + (online ? 'online' : 'offline');
  }

  // Hero widget
  if (rust.online !== undefined) {
    document.getElementById('hw-rust').textContent = `${rust.players ?? 0} / 50`;
    dot('hw-rust-dot', rust.online);
  }
  if (cs2.online !== undefined) {
    document.getElementById('hw-cs2').textContent = `${cs2.players ?? 0} / ${cs2.max_players || 16}`;
    dot('hw-cs2-dot', cs2.online);
  }
  const mcOnline = mc.online || ec.online;
  if (mc.online !== undefined) {
    document.getElementById('hw-mc').textContent = `${mc.players ?? 0} / 40`;
    dot('hw-mc-dot', mcOnline);
  }

  // Server cards
  badge(document.getElementById('rust-badge'), rust.online);
  document.getElementById('rust-players').textContent = `${rust.players ?? 0} / 50 players`;

  badge(document.getElementById('cs2-badge'), cs2.online);
  document.getElementById('cs2-players').textContent = `${cs2.players ?? 0} / ${cs2.max_players || 16} players`;

  badge(document.getElementById('mc-badge'), mc.online);
  document.getElementById('mc-players').textContent = `${mc.players ?? 0} / 40 players`;

  // Status table
  badge(document.getElementById('st-rust-badge'), rust.online);
  badge(document.getElementById('st-cs2-badge'), cs2.online);
  badge(document.getElementById('st-mc-badge'), mc.online);
  badge(document.getElementById('st-ec-badge'), ec.online);

  document.getElementById('st-rust-players').textContent = `${rust.players ?? 0} / 50`;
  document.getElementById('st-cs2-players').textContent  = `${cs2.players ?? 0} / ${cs2.max_players || 16}`;
  document.getElementById('st-mc-players').textContent   = `${mc.players ?? 0}`;
  document.getElementById('st-ec-players').textContent   = `${ec.players ?? 0}`;

  // Last updated timestamp
  const el = document.getElementById('last-updated');
  if (el) el.textContent = `Last updated: just now`;
}

async function fetchStatus() {
  try {
    const res = await fetch(STATUS_API, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    applyStatus(data);
  } catch (e) {
    // API unreachable — leave static display
    const el = document.getElementById('last-updated');
    if (el) el.textContent = 'Status API offline — fix CF tunnel';
  }
}
fetchStatus();
setInterval(fetchStatus, 30000);

// ── Copy IP ─────────────────────────────────────────────────────────────────
function copyIP(ip, btn) {
  navigator.clipboard.writeText(ip).then(() => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy IP'; btn.classList.remove('copied'); }, 2000);
    }
    showToast('✓ Copied: ' + ip);
  }).catch(() => showToast('Copy failed — manual: ' + ip));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Mobile nav ───────────────────────────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('open');
});
function closeMenu() {
  document.getElementById('nav-links').classList.remove('open');
}

// ── Rust Interactive Map ─────────────────────────────────────────────────────
let rustMap = null;
let mapImageLayer = null;
const MAP_SIZE = 3500; // pixels = world units for Leaflet CRS.Simple

function initMap(imageUrl) {
  const loading = document.getElementById('map-loading');
  const loadingText = document.getElementById('map-loading-text');

  // Show the full-map link
  const link = document.getElementById('map-full-link');
  if (link) {
    link.href = `https://rustmaps.com/map/${MAP_SIZE}/2031645717`;
    link.style.display = '';
  }

  // Leaflet CRS.Simple: coordinates are pixel-space, y-axis inverted
  rustMap = L.map('rust-map', {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 2,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    doubleClickZoom: true,
    scrollWheelZoom: true,
    attributionControl: false,
  });

  // Leaflet CRS.Simple: [lat, lng] maps to [y, x]; image top-left = [MAP_SIZE, 0]
  const bounds = [[0, 0], [MAP_SIZE, MAP_SIZE]];

  const img = new Image();
  img.onload = () => {
    mapImageLayer = L.imageOverlay(imageUrl, bounds, { opacity: 1 }).addTo(rustMap);
    rustMap.fitBounds(bounds, { padding: [0, 0] });
    loading.classList.add('hidden');
  };
  img.onerror = () => {
    loadingText.textContent = 'Map image failed to load.';
  };
  img.src = imageUrl;
}

function resetMapView() {
  if (!rustMap) return;
  const bounds = [[0, 0], [MAP_SIZE, MAP_SIZE]];
  rustMap.fitBounds(bounds, { padding: [0, 0] });
}

async function loadRustMap() {
  const loadingText = document.getElementById('map-loading-text');
  try {
    const res = await fetch(MAP_API, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.error) {
      loadingText.innerHTML = `Map unavailable: ${data.error}<br><br>
        <a href="https://rustmaps.com" target="_blank" style="color:var(--blue)">
          Configure at rustmaps.com →</a>`;
      return;
    }
    if (!data.imageUrl) {
      loadingText.textContent = 'No image URL returned from API.';
      return;
    }

    // Update meta if API returned values
    if (data.seed) document.getElementById('map-seed').textContent = data.seed;
    if (data.size) document.getElementById('map-size').textContent = data.size;

    initMap(data.imageUrl);
  } catch (e) {
    loadingText.innerHTML = `Status API offline.<br>Fix the CF tunnel to enable the live map.<br>
      <span style="color:var(--muted);font-size:0.8em">${e.message}</span>`;
  }
}

// Only init map when it scrolls into view (saves bandwidth)
const mapObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !rustMap) {
    loadRustMap();
    mapObserver.disconnect();
  }
}, { threshold: 0.1 });
const mapSection = document.getElementById('map');
if (mapSection) mapObserver.observe(mapSection);

// ── Nav scroll shadow ────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('nav').style.boxShadow =
    window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.4)' : '';
});
