const RUST_API = 'https://status.superfucked.xyz/api/leaderboard';
const CS2_API  = 'https://status.superfucked.xyz/api/cs2/leaderboard';
const REFRESH_MS = 60000;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function timeAgo(ts) { if (!ts) return '—'; const s = Math.max(0, Math.floor(Date.now() / 1000 - ts)); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; }
function fmtPlaytime(sec) { if (!sec) return '—'; const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? `${h}h ${m}m` : `${m}m`; }
function showTab(name) {
  ['rust', 'cs2'].forEach(t => { $('view-' + t).hidden = t !== name; $('tab-' + t).classList.toggle('active', t === name); $('tab-' + t).setAttribute('aria-selected', t === name); });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
}
function renderChart(svgId, wrapId, rows, valueKey, label) {
  const top = rows.slice(0, 10), svg = $(svgId);
  const wrapW = Math.max(560, ($(wrapId).clientWidth || 640));
  const nameW = 150, valW = 64, padT = 6, rowH = 34, barH = 20, W = wrapW, H = padT + top.length * rowH + 4, plotW = W - nameW - valW;
  const maxV = Math.max(...top.map(p => p[valueKey]), 1);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', H);
  let s = '';
  const tickStep = maxV <= 5 ? 1 : Math.ceil(maxV / 4);
  for (let t = tickStep; t <= maxV; t += tickStep) { const x = nameW + (t / maxV) * plotW; s += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - 4}" stroke="#CFCFFF" stroke-width="1"/>`; }
  top.forEach((p, i) => {
    const y = padT + i * rowH + (rowH - barH) / 2, w = Math.max((p[valueKey] / maxV) * plotW, 3);
    const name = p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name;
    s += `<text x="${nameW - 10}" y="${y + barH / 2 + 4}" text-anchor="end" fill="#0000AA">${esc(name)}</text>`;
    s += `<rect class="bar" x="${nameW}" y="${y}" width="${w}" height="${barH}" fill="#0000AA" data-i="${i}"/>`;
    s += `<text x="${nameW + w + 8}" y="${y + barH / 2 + 4}" fill="#5A5AC8">${p[valueKey]}</text>`;
    s += `<rect class="bar-hit" x="0" y="${padT + i * rowH}" width="${W}" height="${rowH}" fill="transparent" data-i="${i}"/>`;
  });
  svg.innerHTML = s;
  const tt = $('lb-tooltip');
  svg.querySelectorAll('.bar-hit, .bar').forEach(el => {
    el.addEventListener('mousemove', e => { const p = top[+el.dataset.i]; if (!p) return;
      tt.innerHTML = `<strong>${esc(p.name)}</strong><br/>${p[valueKey]} ${label} <span class="tt-muted">· ${p.kills} K · ${p.deaths} D · ${p.kd} K/D</span>` + (p.top_weapon ? `<br/><span class="tt-muted">favors</span> ${esc(p.top_weapon)}` : '');
      tt.style.display = 'block'; tt.style.left = Math.min(e.clientX + 14, window.innerWidth - tt.offsetWidth - 8) + 'px'; tt.style.top = (e.clientY + 14) + 'px'; });
    el.addEventListener('mouseleave', () => { tt.style.display = 'none'; });
  });
}
let rustData = null, cs2Data = null;
async function loadRust() {
  try {
    const r = await fetch(RUST_API, { cache: 'no-store' }); const d = await r.json(); if (d.error) throw new Error(d.error);
    rustData = d; $('r-error').hidden = true;
    $('r-kills').textContent = d.total_kills; $('r-players').textContent = d.player_count; $('r-top').textContent = d.players[0] ? d.players[0].name : '—'; $('r-last').textContent = timeAgo(d.last_kill_at);
    const empty = !d.players.length; $('r-empty').hidden = !empty; $('r-content').hidden = empty;
    if (!empty) {
      renderChart('r-chart', 'r-chart-wrap', d.players, 'kills', 'kills');
      $('r-table').querySelector('tbody').innerHTML = d.players.map((p, i) => `<tr><td class="lb-rank ${i === 0 ? 'top' : ''}">${String(i + 1).padStart(2, '0')}</td><td class="lb-player">${esc(p.name)}</td><td class="num">${p.kills}</td><td class="num">${p.deaths}</td><td class="num">${(+p.kd).toFixed(2)}</td><td class="lb-weapon">${esc(p.top_weapon || '—')}</td></tr>`).join('');
      $('r-recent').innerHTML = (d.recent || []).map(k => `<div class="kill-row"><span class="kill-killer">${esc(k.killer)}</span><span>&gt;</span><span class="kill-victim">${esc(k.victim)}</span>${k.weapon ? `<span class="lb-weapon">[${esc(k.weapon)}]</span>` : ''}<span class="kill-time">${timeAgo(k.at)}</span></div>`).join('');
    }
    $('r-updated').textContent = `data cached 60s · fetched ${new Date().toLocaleTimeString()}`;
  } catch (e) { $('r-error').hidden = false; $('r-empty').hidden = true; $('r-content').hidden = true; }
}
async function loadCS2() {
  try {
    const r = await fetch(CS2_API, { cache: 'no-store' }); const d = await r.json(); if (d.error) throw new Error(d.error);
    cs2Data = d; $('c-error').hidden = true;
    $('c-kills').textContent = d.total_kills; $('c-players').textContent = d.player_count; $('c-top').textContent = d.players[0] ? d.players[0].name : '—'; $('c-last').textContent = timeAgo(d.last_seen_at);
    const empty = !d.players.length; $('c-empty').hidden = !empty; $('c-content').hidden = empty;
    if (!empty) {
      renderChart('c-chart', 'c-chart-wrap', d.players, 'points', 'pts');
      $('c-table').querySelector('tbody').innerHTML = d.players.map((p, i) => `<tr><td class="lb-rank ${i === 0 ? 'top' : ''}">${String(i + 1).padStart(2, '0')}</td><td class="lb-player">${esc(p.name)}</td><td class="num">${p.points}</td><td class="num">${p.kills}</td><td class="num">${p.deaths}</td><td class="num">${(+p.kd).toFixed(2)}</td><td class="num">${fmtPlaytime(p.playtime_seconds)}</td><td class="lb-weapon">${esc(p.top_weapon || '—')}</td></tr>`).join('');
      $('c-weapons').innerHTML = (d.weapons || []).map(w => `<span>${esc(w.weapon)}<b>${w.kills}</b></span>`).join('');
    }
    $('c-updated').textContent = `data cached 60s · fetched ${new Date().toLocaleTimeString()}`;
  } catch (e) { $('c-error').hidden = false; $('c-empty').hidden = true; $('c-content').hidden = true; }
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
showTab(location.hash === '#cs2' ? 'cs2' : 'rust');
loadRust(); loadCS2();
setInterval(() => { loadRust(); loadCS2(); }, REFRESH_MS);
window.addEventListener('resize', () => { if (rustData && rustData.players.length) renderChart('r-chart', 'r-chart-wrap', rustData.players, 'kills', 'kills'); if (cs2Data && cs2Data.players.length) renderChart('c-chart', 'c-chart-wrap', cs2Data.players, 'points', 'pts'); });
