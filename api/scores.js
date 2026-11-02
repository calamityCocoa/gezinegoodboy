// Vercel function: Headset Hero global leaderboard.
//   GET  /api/scores                          -> { top: [{ name, score }] }   (best 10)
//   POST /api/scores?start=1                  -> { run }   a game started; the id is needed to submit
//   POST /api/scores  { run, name, score }    -> { top, rank, best }
// Uses the same Upstash Redis database as api/counts.js.
//
// It's a joke site, so the cheat protection is light: each submit needs a fresh,
// single-use run id from when the game started, and the score has to be possible
// in the time that has passed since then.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// every key starts with "gez:" because this database is shared with other projects
const BOARD = "gez:lb:headset";
const DEVICES = "gez:lb:headset:device"; // name -> the device their best score was set on
const TOP_N = 10;
const RUN_TTL = 2 * 60 * 60;        // a run id lasts 2 hours
const MAX_POINTS_PER_SECOND = 30;   // comfortably above what a perfect player can manage
const MAX_SCORE = 1_000_000;
const LIMITS = { start: 60, submit: 15 }; // per visitor per minute

// keep the names friendly; anything matching these is refused
const BLOCKED = /n[i1!|]gg|f[a@4]gg?[o0]t|f[a@4]g\b|k[i1]ke|tr[a@4]nn(y|ie)|ch[i1]nk|sp[i1]c\b|retard|r[a@4]pe|hitler|nazi/i;

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

const reply = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function top() {
  const [flat] = await redis([["ZREVRANGE", BOARD, 0, TOP_N - 1, "WITHSCORES"]]);
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ name: flat[i], score: Number(flat[i + 1]) });
  if (out.length) {
    const [devices] = await redis([["HMGET", DEVICES, ...out.map((e) => e.name)]]);
    out.forEach((e, i) => { if (devices[i]) e.device = devices[i]; });
  }
  return out;
}

async function limited(request, kind) {
  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const bucket = `gez:rl:lb:${kind}:${ip}:${Math.floor(Date.now() / 60000)}`;
  const [used] = await redis([["INCR", bucket], ["EXPIRE", bucket, 70]]);
  return used > LIMITS[kind];
}

function cleanName(raw) {
  const name = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, "") // control and invisible characters
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
  if (!name) return { error: "Type a name first" };
  if (!/^[\p{L}\p{N} _.\-!?'~♪★☆♡♥]+$/u.test(name)) return { error: "Letters, numbers and simple punctuation only" };
  if (BLOCKED.test(name.replace(/[\s_.\-]/g, ""))) return { error: "Pick a nicer name" };
  return { name };
}

export async function GET() {
  if (!REDIS_URL || !REDIS_TOKEN) return reply({ error: "Leaderboard database not connected" }, 503);
  try {
    return reply({ top: await top() });
  } catch (e) {
    return reply({ error: String(e?.message || e) }, 502);
  }
}

export async function POST(request) {
  if (!REDIS_URL || !REDIS_TOKEN) return reply({ error: "Leaderboard database not connected" }, 503);
  try {
    // a game is starting: hand out a single-use run id
    if (new URL(request.url).searchParams.has("start")) {
      if (await limited(request, "start")) return reply({ error: "Slow down a little" }, 429);
      const run = crypto.randomUUID();
      await redis([["SET", `gez:run:${run}`, Date.now(), "EX", RUN_TTL]]);
      return reply({ run });
    }

    // a finished game: check it and record the score
    if (await limited(request, "submit")) return reply({ error: "Slow down a little" }, 429);
    const body = await request.json().catch(() => ({}));
    const run = String(body.run || "");
    const score = Math.floor(Number(body.score));
    if (!/^[0-9a-f-]{36}$/.test(run)) return reply({ error: "Missing run id" }, 400);
    if (!Number.isFinite(score) || score < 1 || score > MAX_SCORE) return reply({ error: "That score doesn't look right" }, 400);
    const checked = cleanName(body.name);
    if (checked.error) return reply({ error: checked.error }, 400);

    const [startedAt] = await redis([["GETDEL", `gez:run:${run}`]]); // single use
    if (!startedAt) return reply({ error: "That game already ended or expired" }, 400);
    const seconds = (Date.now() - Number(startedAt)) / 1000;
    if (score > 20 + seconds * MAX_POINTS_PER_SECOND) return reply({ error: "That score is faster than humanly possible" }, 400);

    const name = checked.name;
    const device = /^[a-z0-9]{2,12}$/.test(String(body.device || "")) ? String(body.device) : null;
    // keep each name's best score only
    const [, rank, best] = await redis([
      ["ZADD", BOARD, "GT", score, name],
      ["ZREVRANK", BOARD, name],
      ["ZSCORE", BOARD, name],
    ]);
    if (device && Number(best) === score) await redis([["HSET", DEVICES, name, device]]);
    return reply({ top: await top(), rank: rank === null ? null : Number(rank) + 1, best: Number(best), name });
  } catch (e) {
    return reply({ error: String(e?.message || e) }, 502);
  }
}
