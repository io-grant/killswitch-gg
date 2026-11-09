// /events — the community calendar. Discord Scheduled Events (via the status API) merged with the
// fixed weekly beats: Rust wipe (Thu 16:00 CT, nextWipe() from app.js) and the surf map of the week
// (Thu 17:00 CT). Event text comes from Discord, so it is written with textContent only, never HTML,
// and the only link accepted is a discord.com event URL.
const EVENTS_API = 'https://status.superfucked.xyz/api/events';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const CT = 'America/Chicago';

function ctParts(d) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: CT, month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit',
  }).formatToParts(d).map(x => [x.type, x.value]));
}
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function card(ev) {
  const p = ctParts(ev.start);
  const row = el('div', 'event-card');
  const date = el('div', 'event-date');
  date.append(el('div', 'event-day', String(p.day).padStart(2, '0')), el('div', 'event-month', MONTHS[+p.month - 1]));
  const body = el('div');
  body.append(el('div', 'event-title', ev.title));
  body.append(el('div', 'event-detail', `${p.weekday} ${p.hour}:${p.minute} ${p.dayPeriod} CT · ${ev.detail}`));
  if (ev.description) body.append(el('div', 'event-detail cal-desc', ev.description));
  if (ev.url) {
    const a = el('a', 'cal-link', 'Open in Discord →');
    a.href = ev.url; a.target = '_blank'; a.rel = 'noopener';
    body.append(a);
  }
  row.append(date, body, el('span', 'event-badge', ev.badge));
  return row;
}
function weeklyBeats(weeks) {
  const out = [];
  let from = new Date();
  for (let i = 0; i < weeks; i++) {
    const w = nextWipe(from);                       // Thursday 16:00 CT, from app.js
    if (!w) break;
    out.push({ start: w, title: 'Rust wipe', detail: 'new seed · blueprints kept', badge: i === 0 ? 'NEXT WIPE' : 'WEEKLY' });
    from = new Date(w.getTime() + 60000);
  }
  // Map of the week rotates an hour after the wipe; shift "now" back an hour so a rotation
  // later today is still counted as upcoming.
  let m = nextWipe(new Date(Date.now() - 3600000));
  for (let i = 0; m && i < weeks; i++) {
    out.push({ start: new Date(m.getTime() + 3600000), title: 'Surf map of the week', detail: 'new map · fastest time of the week wins', badge: 'WEEKLY' });
    m = nextWipe(new Date(m.getTime() + 60000));
  }
  return out;
}
function discordEvents(list) {
  return (list || []).filter(e => e && e.name && e.start).map(e => {
    const url = typeof e.url === 'string' && e.url.startsWith('https://discord.com/events/') ? e.url : null;
    const bits = [e.where, e.interested ? `${e.interested} interested` : null].filter(Boolean);
    return {
      start: new Date(e.start), title: String(e.name).slice(0, 100),
      detail: bits.join(' · ') || 'Discord event', description: String(e.description || '').slice(0, 400),
      url, badge: e.status === 'active' ? 'LIVE NOW' : 'COMMUNITY',
    };
  }).filter(e => !isNaN(e.start));
}
async function loadCalendar() {
  const list = document.getElementById('cal-list');
  const note = document.getElementById('cal-note');
  let community = [], ok = false;
  try {
    const r = await fetch(EVENTS_API, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    community = discordEvents(d.events); ok = !d.error;
  } catch (e) { ok = false; }
  const horizon = Date.now() + 28 * 86400000;
  const all = community.concat(weeklyBeats(4)).filter(e => e.start.getTime() <= horizon || e.badge !== 'WEEKLY')
    .sort((a, b) => a.start - b.start);
  list.replaceChildren(...all.map(card));
  note.textContent = !ok ? '> community events unreachable — weekly schedule shown. Retrying every 60 s.'
    : community.length ? `> ${community.length} community event${community.length > 1 ? 's' : ''} scheduled · updated ${new Date().toLocaleTimeString()}`
    : '> no community nights scheduled yet. They are announced in Discord first.';
}
loadCalendar(); setInterval(loadCalendar, 60000);
