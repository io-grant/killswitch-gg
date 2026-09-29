const RUST_API = 'https://status.superfucked.xyz/api/leaderboard';
const CS2_API  = 'https://status.superfucked.xyz/api/cs2/leaderboard';
const SURF_API = 'https://status.superfucked.xyz/api/surf/leaderboard';
const SOT_API  = 'https://status.superfucked.xyz/api/sot/leaderboard';
const SOT_BASE_RATING = 1500;
const REFRESH_MS = 60000;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function timeAgo(ts) { if (!ts) return '—'; const s = Math.max(0, Math.floor(Date.now() / 1000 - ts)); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; }
function fmtPlaytime(sec) { if (!sec) return '—'; const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? `${h}h ${m}m` : `${m}m`; }
function showTab(name) {
  ['rust', 'cs2', 'surf', 'sot'].forEach(t => { $('view-' + t).hidden = t !== name; $('tab-' + t).classList.toggle('active', t === name); $('tab-' + t).setAttribute('aria-selected', t === name); });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
}
function renderChart(svgId, wrapId, rows, valueKey, label, tipFn) {
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
      tt.innerHTML = tipFn ? tipFn(p) : `<strong>${esc(p.name)}</strong><br/>${p[valueKey]} ${label} <span class="tt-muted">· ${p.kills} K · ${p.deaths} D · ${p.kd} K/D</span>` + (p.rank_name ? `<br/><span class="tt-muted">rank</span> ${esc(p.rank_name)}` : p.top_weapon ? `<br/><span class="tt-muted">favors</span> ${esc(p.top_weapon)}` : '');
      tt.style.display = 'block'; tt.style.left = Math.min(e.clientX + 14, window.innerWidth - tt.offsetWidth - 8) + 'px'; tt.style.top = (e.clientY + 14) + 'px'; });
    el.addEventListener('mouseleave', () => { tt.style.display = 'none'; });
  });
}
let rustData = null, cs2Data = null, surfData = null;
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
      $('c-table').querySelector('tbody').innerHTML = d.players.map((p, i) => `<tr><td class="lb-rank ${i === 0 ? 'top' : ''}">${String(i + 1).padStart(2, '0')}</td><td class="lb-player">${esc(p.name)}</td><td class="lb-tier">${esc(p.rank_name || '—')}</td><td class="num">${p.points}</td><td class="num">${p.kills}</td><td class="num">${p.deaths}</td><td class="num">${(+p.kd).toFixed(2)}</td><td class="num">${(+(p.headshot_pct || 0)).toFixed(1)}</td><td class="num">${fmtPlaytime(p.playtime_seconds)}</td></tr>`).join('');
      const wl = d.weapons || [];
      $('c-weapons-panel').hidden = !wl.length;
      $('c-weapons').innerHTML = wl.map(w => `<span>${esc(w.weapon)}<b>${w.kills}</b></span>`).join('');
    }
    $('c-updated').textContent = `data cached 60s · fetched ${new Date().toLocaleTimeString()}`;
  } catch (e) { $('c-error').hidden = false; $('c-empty').hidden = true; $('c-content').hidden = true; }
}
const surfTip = p => `<strong>${esc(p.name)}</strong><br/>${p.points} pts <span class="tt-muted">· ${p.maps_completed} map${p.maps_completed === 1 ? '' : 's'} · ${p.total_finishes} finish${p.total_finishes === 1 ? '' : 'es'}</span>` + (p.rank_name ? `<br/><span class="tt-muted">rank</span> ${esc(p.rank_name)}` : '');
async function loadSurf() {
  try {
    const r = await fetch(SURF_API, { cache: 'no-store' }); const d = await r.json(); if (d.error) throw new Error(d.error);
    surfData = d; $('s-error').hidden = true;
    $('s-maps').textContent = d.maps_claimed; $('s-players').textContent = d.ranked_count;
    const ranked = d.players.filter(p => p.points > 0);
    $('s-top').textContent = ranked[0] ? ranked[0].name : '—'; $('s-last').textContent = timeAgo(d.last_finish_at);
    // A player who has connected but never finished a map is not "on the board":
    // the board is empty until somebody completes a run, not until somebody joins.
    const empty = !ranked.length && !d.records.length;
    $('s-empty').hidden = !empty; $('s-content').hidden = empty;
    if (!empty) {
      if (ranked.length) renderChart('s-chart', 's-chart-wrap', ranked, 'points', 'pts', surfTip);
      $('s-chart-wrap').hidden = !ranked.length;
      $('s-records').querySelector('tbody').innerHTML = d.records.map(r => `<tr><td class="lb-player">${esc(r.map)}</td><td class="num">${esc(r.time)}</td><td class="lb-player">${esc(r.player)}</td><td class="num">${r.finishes}</td><td class="num">${timeAgo(r.set_at)}</td></tr>`).join('');
      $('s-table').querySelector('tbody').innerHTML = d.players.map((p, i) => `<tr><td class="lb-rank ${i === 0 && p.points > 0 ? 'top' : ''}">${p.placement ? String(p.placement).padStart(2, '0') : '—'}</td><td class="lb-player">${esc(p.name)}</td><td class="lb-tier">${esc(p.rank_name)}</td><td class="num">${p.points}</td><td class="num">${p.maps_completed}</td><td class="num">${p.total_finishes}</td><td class="num">${timeAgo(p.last_finish_at)}</td></tr>`).join('');
      $('s-recent').innerHTML = (d.recent || []).map(k => `<div class="kill-row"><span class="kill-killer">${esc(k.player)}</span><span>&gt;</span><span class="kill-victim">${esc(k.map)}</span><span class="lb-weapon">[${esc(k.time)}]</span><span class="kill-time">${timeAgo(k.at)}</span></div>`).join('');
    }
    $('s-updated').textContent = `data cached 60s · fetched ${new Date().toLocaleTimeString()}`;
  } catch (e) { $('s-error').hidden = false; $('s-empty').hidden = true; $('s-content').hidden = true; }
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
showTab(['#cs2', '#surf'].includes(location.hash) ? location.hash.slice(1) : 'rust');

// ── Sea of Thieves ranked ladder ────────────────────────────────────────────
// Deliberately NOT renderChart(): Elo ratings cluster tightly around 1500, so
// bars measured from zero would render 1435 and 1565 as near-identical lengths
// and hide the only thing the chart exists to show. This is a diverging bar
// baselined on the 1500 starting rating instead.
function renderRatingChart(svgId, wrapId, rows) {
  const top = rows.slice(0, 10), svg = $(svgId);
  const wrapW = Math.max(560, ($(wrapId).clientWidth || 640));
  const nameW = 150, valW = 72, padT = 6, rowH = 34, barH = 20;
  const W = wrapW, H = padT + top.length * rowH + 22, plotW = W - nameW - valW;
  const spread = Math.max(...top.map(p => Math.abs(p.rating - SOT_BASE_RATING)), 25);
  const mid = nameW + plotW / 2, halfW = plotW / 2;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%'); svg.setAttribute('height', H);
  let s = '';
  // zero line = the starting rating
  s += `<line x1="${mid}" y1="${padT}" x2="${mid}" y2="${H - 18}" stroke="#0000AA" stroke-width="1.5"/>`;
  s += `<text x="${mid}" y="${H - 5}" text-anchor="middle" fill="#5A5AC8" font-size="11">${SOT_BASE_RATING} start</text>`;
  top.forEach((p, i) => {
    const y = padT + i * rowH + (rowH - barH) / 2;
    const diff = p.rating - SOT_BASE_RATING;
    const w = Math.max(Math.abs(diff) / spread * halfW, diff === 0 ? 0 : 2);
    const x = diff >= 0 ? mid : mid - w;
    const name = p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name;
    s += `<text x="${nameW - 10}" y="${y + barH / 2 + 4}" text-anchor="end" fill="#0000AA">${esc(name)}</text>`;
    s += `<rect class="bar" x="${x}" y="${y}" width="${w}" height="${barH}" fill="${diff >= 0 ? '#0000AA' : '#9A9AD8'}" data-i="${i}"/>`;
    const lx = diff >= 0 ? Math.min(x + w + 8, W - 4) : Math.max(x - 8, 4);
    s += `<text x="${lx}" y="${y + barH / 2 + 4}" text-anchor="${diff >= 0 ? 'start' : 'end'}" fill="#5A5AC8">${p.rating}</text>`;
    s += `<rect class="bar-hit" x="0" y="${padT + i * rowH}" width="${W}" height="${rowH}" fill="transparent" data-i="${i}"/>`;
  });
  svg.innerHTML = s;
  const tt = $('lb-tooltip');
  svg.querySelectorAll('.bar-hit, .bar').forEach(el => {
    el.addEventListener('mousemove', e => {
      const p = top[+el.dataset.i]; if (!p) return;
      const diff = p.rating - SOT_BASE_RATING;
      tt.innerHTML = `<strong>${esc(p.name)}</strong><br/>${p.rating} rating <span class="tt-muted">(${diff >= 0 ? '+' : ''}${diff} vs start)</span>`
        + `<br/><span class="tt-muted">tier</span> ${esc(p.tier || '—')}`
        + `<br/><span class="tt-muted">${p.wins}W-${p.losses}L · ${p.winrate}% · peak ${p.peak}</span>`;
      tt.style.display = 'block';
      tt.style.left = Math.min(e.clientX + 14, window.innerWidth - tt.offsetWidth - 8) + 'px';
      tt.style.top = (e.clientY + 14) + 'px';
    });
    el.addEventListener('mouseleave', () => { tt.style.display = 'none'; });
  });
}

function fmtForm(streak) {
  const n = +streak || 0;
  if (!n) return '—';
  return n > 0 ? `W${n}` : `L${Math.abs(n)}`;
}

let sotData = null, sotMode = null;
function renderSOTMode() {
  if (!sotData || !sotData.modes || !sotData.modes.length) return;
  const m = sotData.modes.find(x => x.key === sotMode) || sotData.modes[0];
  sotMode = m.key;

  $('t-modes').innerHTML = sotData.modes.map(x =>
    `<button class="lb-tab${x.key === sotMode ? ' active' : ''}" data-sotmode="${esc(x.key)}">${esc(x.label.toUpperCase())}<small>${x.players.length} ranked</small></button>`).join('');
  $('t-modes').querySelectorAll('[data-sotmode]').forEach(b =>
    b.addEventListener('click', () => { sotMode = b.dataset.sotmode; renderSOTMode(); }));

  const players = m.players || [], teams = m.teams || [];
  $('t-top').textContent = players[0] ? players[0].name : '—';

  if (!players.length && !teams.length) {
    $('t-empty').hidden = false; $('t-content').hidden = true; return;
  }
  $('t-empty').hidden = true; $('t-content').hidden = false;

  if (players.length) {
    renderRatingChart('t-chart', 't-chart-wrap', players);
    $('t-chart-wrap').hidden = false;
  } else {
    $('t-chart-wrap').hidden = true;
  }

  $('t-table').querySelector('tbody').innerHTML = players.length ? players.map((p, i) =>
    `<tr><td class="lb-rank ${i === 0 ? 'top' : ''}">${String(i + 1).padStart(2, '0')}</td>`
    + `<td class="lb-player">${esc(p.name)}</td><td class="lb-tier">${esc(p.tier || '—')}</td>`
    + `<td class="num">${p.rating}</td><td class="num">${p.wins}</td><td class="num">${p.losses}</td>`
    + `<td class="num">${(+p.winrate).toFixed(1)}</td><td class="num">${p.peak}</td>`
    + `<td class="lb-weapon">${fmtForm(p.streak)}</td></tr>`).join('')
    : `<tr><td colspan="9">Nobody has finished their ${sotData.provisional_games || 10} placement games in this mode yet.</td></tr>`;

  $('t-teams-panel').hidden = !teams.length;
  if (teams.length) {
    $('t-teams').querySelector('tbody').innerHTML = teams.map((t, i) =>
      `<tr><td class="lb-rank ${i === 0 ? 'top' : ''}">${String(i + 1).padStart(2, '0')}</td>`
      + `<td class="lb-player">${esc(t.name)}${t.tag ? ` <span class="lb-weapon">[${esc(t.tag)}]</span>` : ''}</td>`
      + `<td class="num">${t.rating}</td><td class="num">${t.wins}</td><td class="num">${t.losses}</td>`
      + `<td class="num">${(+t.winrate).toFixed(1)}</td><td class="num">${t.peak}</td>`
      + `<td class="lb-weapon">${fmtForm(t.streak)}</td></tr>`).join('');
  }

  const recent = (sotData.recent || []).filter(r => r.mode === sotMode);
  $('t-recent').innerHTML = recent.length ? recent.map(r =>
    `<div class="kill-row"><span class="kill-killer">${esc(r.winner)}</span><span>beat</span>`
    + `<span class="kill-victim">${esc(r.loser)}</span>`
    + (r.score ? `<span class="lb-weapon">[${r.score[0]}-${r.score[1]}]</span>` : '')
    + `<span class="kill-time">${timeAgo(r.at)}</span></div>`).join('')
    : '<div class="kill-row"><span class="kill-time">No matches in this mode yet.</span></div>';
}

async function loadSOT() {
  try {
    const r = await fetch(SOT_API, { cache: 'no-store' });
    const d = await r.json();
    // A bot that has never run is not an outage — it is an empty ladder, and it
    // must read as one rather than as a broken API.
    if (d.error && !/not present/i.test(d.error)) throw new Error(d.error);
    sotData = d; $('t-error').hidden = true;
    $('t-matches').textContent = d.match_count != null ? d.match_count : '—';
    $('t-players').textContent = d.player_count != null ? d.player_count : '—';
    $('t-last').textContent = timeAgo(d.last_match_at);
    if (!d.modes || !d.modes.length) {
      $('t-modes').innerHTML = '';
      $('t-top').textContent = '—';
      $('t-empty').hidden = false; $('t-content').hidden = true;
    } else {
      renderSOTMode();
    }
    $('t-updated').textContent = `data cached 60s · fetched ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    $('t-error').hidden = false; $('t-empty').hidden = true; $('t-content').hidden = true;
  }
}

loadRust(); loadCS2(); loadSurf(); loadSOT();
setInterval(() => { loadRust(); loadCS2(); loadSurf(); loadSOT(); }, REFRESH_MS);
window.addEventListener('resize', () => { if (rustData && rustData.players.length) renderChart('r-chart', 'r-chart-wrap', rustData.players, 'kills', 'kills'); if (cs2Data && cs2Data.players.length) renderChart('c-chart', 'c-chart-wrap', cs2Data.players, 'points', 'pts'); const sr = surfData ? surfData.players.filter(p => p.points > 0) : []; if (sr.length) renderChart('s-chart', 's-chart-wrap', sr, 'points', 'pts', surfTip); if (sotData && sotData.modes && sotData.modes.length) { const sm = sotData.modes.find(x => x.key === sotMode); if (sm && sm.players.length) renderRatingChart('t-chart', 't-chart-wrap', sm.players); } });
