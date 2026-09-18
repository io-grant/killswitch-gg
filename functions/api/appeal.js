// POST /api/appeal — relays a ban appeal into Discord via a webhook.
//
// The webhook URL is NEVER in this repo: it lives in the Pages environment as
// BAN_APPEAL_WEBHOOK. This repo is public.
//
// Turnstile is optional and enabled purely by setting TURNSTILE_SECRET. Without
// it the endpoint is still usable but only lightly defended, so set it before
// the page is advertised anywhere a scraper will find it.

const MAX = { handle: 80, steamid: 64, server: 32, reason: 600, appeal: 2000 };
const SERVERS = ["Rust", "CS2 1v1", "CS2 Surf", "Minecraft", "Not sure"];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function turnstileOK(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;          // not configured — skip
  if (!token) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
                        { method: "POST", body });
  const d = await r.json().catch(() => ({ success: false }));
  return d.success === true;
}

export async function onRequestPost({ request, env }) {
  if (!env.BAN_APPEAL_WEBHOOK) return json({ error: "Appeals are not configured yet." }, 503);

  let form;
  const ct = request.headers.get("content-type") || "";
  try {
    form = ct.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ error: "Could not read that submission." }, 400);
  }

  // Honeypot: a real person never fills a field they cannot see.
  if (form.website) return json({ ok: true });

  const clean = (v, n) => String(v ?? "").trim().slice(0, n);
  const handle  = clean(form.handle,  MAX.handle);
  const steamid = clean(form.steamid, MAX.steamid);
  const server  = clean(form.server,  MAX.server);
  const reason  = clean(form.reason,  MAX.reason);
  const appeal  = clean(form.appeal,  MAX.appeal);

  if (!handle)          return json({ error: "Tell us the name you played under." }, 400);
  if (appeal.length < 30)
    return json({ error: "Give us a bit more than that — at least a couple of sentences." }, 400);
  if (server && !SERVERS.includes(server)) return json({ error: "Unknown server." }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!(await turnstileOK(env, form["cf-turnstile-response"], ip)))
    return json({ error: "Anti-bot check failed. Reload and try again." }, 400);

  const payload = {
    username: "Ban Appeal",
    embeds: [{
      title: "New ban appeal",
      color: 0x0000aa,
      fields: [
        { name: "Name played under", value: handle, inline: true },
        { name: "SteamID / UUID", value: steamid || "not given", inline: true },
        { name: "Server", value: server || "not given", inline: true },
        { name: "Their account of the ban", value: reason || "not given" },
        { name: "Why they should be unbanned", value: appeal },
      ],
      footer: { text: `submitted from killswitch.gg${request.cf?.country ? " · " + request.cf.country : ""}` },
      timestamp: new Date().toISOString(),
    }],
  };

  const r = await fetch(env.BAN_APPEAL_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return json({ error: "Could not deliver the appeal. Try again shortly." }, 502);
  return json({ ok: true });
}

// Explicitly GET, not a catch-all onRequest: exporting onRequest alongside
// onRequestPost makes which one wins ambiguous, and losing POST would mean
// every appeal silently 405s.
export const onRequestGet = () => json({ error: "POST only." }, 405);
