// Vercel function: global headpat / respects counters, shared by every visitor.
//   GET  /api/counts                       -> { headpats, respects }
//   POST /api/counts?type=headpat&n=3      -> adds n (1-25), returns the new totals
//   POST /api/counts?type=respect&n=1
// Stored in an Upstash Redis database connected to this Vercel project
// (Vercel sets the URL and token as environment variables when you connect it).

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEYS = { headpat: "count:headpats", respect: "count:respects" };
const MAX_PER_REQUEST = 25;
const MAX_PER_MINUTE = 300; // per visitor, so a script can't run the numbers up

async function redis(commands) {
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

async function totals() {
  const [[headpats, respects]] = await redis([["MGET", KEYS.headpat, KEYS.respect]]);
  return { headpats: Number(headpats) || 0, respects: Number(respects) || 0 };
}

const reply = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET() {
  if (!REDIS_URL || !REDIS_TOKEN) return reply({ error: "Counter database not connected" }, 503);
  try {
    return reply(await totals());
  } catch (e) {
    return reply({ error: String(e?.message || e) }, 502);
  }
}

export async function POST(request) {
  if (!REDIS_URL || !REDIS_TOKEN) return reply({ error: "Counter database not connected" }, 503);

  const params = new URL(request.url).searchParams;
  const key = KEYS[params.get("type")];
  if (!key) return reply({ error: "type must be headpat or respect" }, 400);
  const n = Math.max(1, Math.min(MAX_PER_REQUEST, parseInt(params.get("n"), 10) || 1));

  try {
    // simple per-visitor rate limit, one bucket per minute
    const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const bucket = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
    const [used] = await redis([["INCRBY", bucket, n], ["EXPIRE", bucket, 70]]);
    if (used > MAX_PER_MINUTE) return reply({ ...(await totals()), limited: true }, 429);

    await redis([["INCRBY", key, n]]);
    return reply(await totals());
  } catch (e) {
    return reply({ error: String(e?.message || e) }, 502);
  }
}
