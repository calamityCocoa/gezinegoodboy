// Vercel function: global headpat / respects counters, shared by every visitor.
//   GET  /api/counts                       -> { headpats, respects }
//   POST /api/counts?type=headpat&n=3      -> adds n (1-25), returns the new totals
//   POST /api/counts?type=respect&n=1
// Clicks are batched by the page, so one request can carry up to 25 of them.
import { dbReady, redis, reply, rateLimit, tooMany, methodNotAllowed } from "./_lib.js";

const KEYS = { headpat: "gez:count:headpats", respect: "gez:count:respects" };
const MAX_PER_REQUEST = 25;
const CLICKS_PER_MINUTE = 400; // per visitor; a human mashing the button stays well under this
const READS_PER_MINUTE = 120;

async function totals() {
  const [[headpats, respects]] = await redis([["MGET", KEYS.headpat, KEYS.respect]]);
  return { headpats: Number(headpats) || 0, respects: Number(respects) || 0 };
}

export async function GET(request) {
  if (!dbReady()) return reply({ error: "Counter database not connected" }, 503);
  try {
    const rl = await rateLimit(request, "counts-read", READS_PER_MINUTE, 60);
    if (!rl.ok) return tooMany(rl);
    return reply(await totals(), 200, rl.headers);
  } catch (e) {
    return reply({ error: "The counters are having a moment" }, 502);
  }
}

export async function POST(request) {
  if (!dbReady()) return reply({ error: "Counter database not connected" }, 503);
  const params = new URL(request.url).searchParams;
  const key = KEYS[params.get("type")];
  if (!key) return reply({ error: "type must be headpat or respect" }, 400);
  const n = Math.max(1, Math.min(MAX_PER_REQUEST, parseInt(params.get("n"), 10) || 1));
  try {
    const rl = await rateLimit(request, "counts-write", CLICKS_PER_MINUTE, 60, n);
    if (!rl.ok) return tooMany(rl, { ...(await totals()), limited: true });
    await redis([["INCRBY", key, n]]);
    return reply(await totals(), 200, rl.headers);
  } catch (e) {
    return reply({ error: "The counters are having a moment" }, 502);
  }
}

export const PUT = () => methodNotAllowed("GET, POST");
export const DELETE = PUT;
export const PATCH = PUT;
