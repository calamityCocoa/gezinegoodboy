// Shared helpers for the API functions (Vercel doesn't turn files starting with _ into endpoints).
//
// The database is the Upstash Redis "webhook-kv", shared with other projects, so every key
// this site uses starts with "gez:".
//
// Privacy: visitors' IP addresses are never stored. Rate limiting uses a salted SHA-256 hash
// of the address, kept only for the length of the rate-limit window (a minute or an hour).

export const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
export const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const dbReady = () => !!(REDIS_URL && REDIS_TOKEN);

export async function redis(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis replied ${res.status}`);
  return (await res.json()).map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

export function reply(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

// Salted hash of the visitor's IP. The salt changes daily, so hashes can't be linked across days.
async function visitorId(request) {
  const ip = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.RATE_LIMIT_SALT || "gezinegoodboy";
  const bytes = new TextEncoder().encode(`${salt}:${day}:${ip}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Fixed-window rate limit. Returns { ok, headers } — pass the headers on in the reply.
// `cost` lets one request count as several (e.g. 25 batched headpats).
export async function rateLimit(request, name, limit, windowSeconds, cost = 1) {
  const id = await visitorId(request);
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `gez:rl:${name}:${id}:${window}`;
  const [used] = await redis([["INCRBY", key, cost], ["EXPIRE", key, windowSeconds + 5]]);
  const reset = (window + 1) * windowSeconds - Math.floor(Date.now() / 1000);
  const headers = {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, limit - used)),
    "RateLimit-Reset": String(reset),
  };
  if (used > limit) headers["Retry-After"] = String(reset);
  return { ok: used <= limit, headers };
}

export const tooMany = (rl, extra = {}) =>
  reply({ error: "Slow down a little and try again in a moment", ...extra }, 429, rl.headers);

export const methodNotAllowed = (allowed) =>
  reply({ error: "Method not allowed" }, 405, { allow: allowed });
