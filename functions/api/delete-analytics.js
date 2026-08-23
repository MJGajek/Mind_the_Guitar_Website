// functions/api/delete-analytics.js
//
// Cloudflare Pages Function — GDPR "right to erasure" proxy for PostHog.
// Route: POST /api/delete-analytics
//
// Why this exists
// ---------------
// Deleting a person in PostHog requires the *personal* API key, which can read
// and delete ALL project data. That key must NEVER ship inside the mobile app.
// Instead the app sends only its own pseudonymous `distinct_id` to this
// function, which holds the personal key as an encrypted Cloudflare secret and
// turns the request into a PostHog "delete person (+ events)" call.
//
// Request  (from the app):   POST { "distinct_id": "<uuid-ish string>" }
// Response: 200 { ok: true, deleted: <bool> }  |  4xx/5xx { ok: false, error }
//
// Environment (set in Cloudflare Pages → Settings → Environment variables):
//   POSTHOG_PERSONAL_API_KEY   (secret) personal API key, scope: person:read + person:write
//   POSTHOG_PROJECT_ID         e.g. "255629"
//   POSTHOG_HOST               management API host, default "https://eu.posthog.com"
//                              (NOTE: this is the app host, NOT the ingestion
//                              host eu.i.posthog.com used by the SDK)
// Optional binding:
//   DELETE_RL                  a KV namespace → enables a simple per-IP limiter.
//                              If not bound, rate limiting is skipped (add a
//                              Cloudflare Rate Limiting rule on the route too).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// Simple per-IP rate limit (best-effort; only active when DELETE_RL KV is bound).
// Allows up to `max` requests per `windowSec` window.
async function rateLimited(env, ip, max = 10, windowSec = 3600) {
  if (!env.DELETE_RL || !ip) return false;
  const key = `rl:${ip}`;
  try {
    const current = parseInt((await env.DELETE_RL.get(key)) || '0', 10);
    if (current >= max) return true;
    await env.DELETE_RL.put(key, String(current + 1), { expirationTtl: windowSec });
    return false;
  } catch (_) {
    return false; // never block on limiter failure
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const key = env.POSTHOG_PERSONAL_API_KEY;
  const projectId = env.POSTHOG_PROJECT_ID;
  const host = (env.POSTHOG_HOST || 'https://eu.posthog.com').replace(/\/+$/, '');

  if (!key || !projectId) {
    return json(500, { ok: false, error: 'server_not_configured' });
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (await rateLimited(env, ip)) {
    return json(429, { ok: false, error: 'rate_limited' });
  }

  // Parse + validate the body.
  let distinctId;
  try {
    const body = await request.json();
    distinctId = body && body.distinct_id;
  } catch (_) {
    return json(400, { ok: false, error: 'invalid_json' });
  }
  if (typeof distinctId !== 'string') {
    return json(400, { ok: false, error: 'missing_distinct_id' });
  }
  distinctId = distinctId.trim();
  if (distinctId.length === 0 || distinctId.length > 200) {
    return json(400, { ok: false, error: 'invalid_distinct_id' });
  }

  const base = `${host}/api/projects/${projectId}/persons`;
  const authHeaders = { Authorization: `Bearer ${key}` };

  try {
    // 1) Resolve the internal person id from the pseudonymous distinct_id.
    const lookupUrl = `${base}/?distinct_id=${encodeURIComponent(distinctId)}`;
    const lookupRes = await fetch(lookupUrl, { headers: authHeaders });
    if (!lookupRes.ok) {
      return json(502, {
        ok: false,
        error: 'lookup_failed',
        status: lookupRes.status,
      });
    }
    const lookup = await lookupRes.json();
    const person = lookup && Array.isArray(lookup.results) ? lookup.results[0] : null;

    // Nothing to erase (already deleted / never created) — idempotent success.
    if (!person || person.id == null) {
      return json(200, { ok: true, deleted: false });
    }

    // 2) Delete the person AND all their events.
    const delUrl = `${base}/${person.id}/?delete_events=true`;
    const delRes = await fetch(delUrl, { method: 'DELETE', headers: authHeaders });
    if (delRes.status !== 204 && !delRes.ok) {
      return json(502, {
        ok: false,
        error: 'delete_failed',
        status: delRes.status,
      });
    }

    return json(200, { ok: true, deleted: true });
  } catch (e) {
    return json(500, { ok: false, error: 'unexpected', detail: String(e) });
  }
}
