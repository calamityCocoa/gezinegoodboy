// Vercel function: global leaderboards for gezine's Arcade.
//   GET  /api/scores?game=dodge                 -> { top: [{ name, score, device? }] }   (best 10)
//   GET  /api/scores?all=1                      -> { games: { dodge: [...top 3], typer: [...], ... } }
//   POST /api/scores?start=1&game=dodge         -> { run }   a game started; the id is needed to submit
//   POST /api/scores  { run, name, score, device } -> { top, rank, best, name }
//
// Cheat protection is light (it's a joke site): every submit needs a fresh, single-use run id
// from when that game started, the score has to be possible in the time that has passed, and
// everything is rate limited per visitor.
import { dbReady, redis, reply, rateLimit, tooMany, methodNotAllowed } from "./_lib.js";

// perSecond: most points a perfect player could get per second; minSeconds: shortest real game
const GAMES = {
  dodge: { board: "gez:lb:headset", perSecond: 30, minSeconds: 3, max: 1_000_000 }, // key kept from when it was Headset Hero
  typer: { board: "gez:lb:typer", perSecond: 25, minSeconds: 5, max: 100_000 },
  whack: { board: "gez:lb:whack", perSecond: 15, minSeconds: 5, max: 100_000 },
  match: { board: "gez:lb:match", perSecond: 250, minSeconds: 8, max: 1_000 },
  combo: { board: "gez:lb:combo", perSecond: 12, minSeconds: 3, max: 100_000 },
};
const TOP_N = 10;
const RUN_TTL = 2 * 60 * 60; // a run id lasts 2 hours

// keep the names friendly; anything matching these is refused
const BLOCKED = /n[i1!|]gg|f[a@4]gg?[o0]t|f[a@4]g\b|k[i1]ke|tr[a@4]nn(y|ie)|ch[i1]nk|sp[i1]c\b|retard|r[a@4]pe|hitler|nazi/i;

const gameOf = (id) => (Object.prototype.hasOwnProperty.call(GAMES, id) ? id : null);

async function top(game, n = TOP_N) {
  const g = GAMES[game];
  const [flat] = await redis([["ZREVRANGE", g.board, 0, n - 1, "WITHSCORES"]]);
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ name: flat[i], score: Number(flat[i + 1]) });
  if (out.length) {
    const [devices] = await redis([["HMGET", g.board + ":device", ...out.map((e) => e.name)]]);
    out.forEach((e, i) => { if (devices[i]) e.device = devices[i]; });
  }
  return out;
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

export async function GET(request) {
  if (!dbReady()) return reply({ error: "Leaderboard database not connected" }, 503);
  const params = new URL(request.url).searchParams;
  try {
    const rl = await rateLimit(request, "scores-read", 120, 60);
    if (!rl.ok) return tooMany(rl);
    if (params.has("all")) {
      const games = {};
      for (const id of Object.keys(GAMES)) games[id] = await top(id, 3);
      return reply({ games }, 200, rl.headers);
    }
    const game = gameOf(params.get("game") || "dodge");
    if (!game) return reply({ error: "Unknown game" }, 400);
    return reply({ top: await top(game) }, 200, rl.headers);
  } catch (e) {
    return reply({ error: "The leaderboard is having a moment" }, 502);
  }
}

export async function POST(request) {
  if (!dbReady()) return reply({ error: "Leaderboard database not connected" }, 503);
  const params = new URL(request.url).searchParams;
  try {
    // a game is starting: hand out a single-use run id
    if (params.has("start")) {
      const game = gameOf(params.get("game") || "dodge");
      if (!game) return reply({ error: "Unknown game" }, 400);
      const rl = await rateLimit(request, "scores-start", 60, 60);
      if (!rl.ok) return tooMany(rl);
      const run = crypto.randomUUID();
      await redis([["SET", `gez:run:${run}`, `${game}|${Date.now()}`, "EX", RUN_TTL]]);
      return reply({ run }, 200, rl.headers);
    }

    // a finished game: check it and record the score (15 a minute, 120 an hour per visitor)
    const perMinute = await rateLimit(request, "scores-submit", 15, 60);
    if (!perMinute.ok) return tooMany(perMinute);
    const perHour = await rateLimit(request, "scores-submit-h", 120, 3600);
    if (!perHour.ok) return tooMany(perHour);

    const text = await request.text();
    if (text.length > 2000) return reply({ error: "That's too much data" }, 413);
    let body = {};
    try { body = JSON.parse(text); } catch (e) { return reply({ error: "Bad request" }, 400); }

    const run = String(body.run || "");
    const score = Math.floor(Number(body.score));
    if (!/^[0-9a-f-]{36}$/.test(run)) return reply({ error: "Missing run id" }, 400);
    const checked = cleanName(body.name);
    if (checked.error) return reply({ error: checked.error }, 400);

    const [stored] = await redis([["GETDEL", `gez:run:${run}`]]); // single use
    if (!stored) return reply({ error: "That game already ended or expired" }, 400);
    // runs from before the arcade only stored the start time, and were all DMCA Dodge
    const [game, startedAt] = String(stored).includes("|") ? String(stored).split("|") : ["dodge", stored];
    const g = GAMES[game];
    if (!g) return reply({ error: "Unknown game" }, 400);
    if (!Number.isFinite(score) || score < 1 || score > g.max) return reply({ error: "That score doesn't look right" }, 400);
    const seconds = (Date.now() - Number(startedAt)) / 1000;
    if (seconds < g.minSeconds || score > 20 + seconds * g.perSecond) return reply({ error: "That score is faster than humanly possible" }, 400);

    const name = checked.name;
    const device = /^[a-z0-9]{2,12}$/.test(String(body.device || "")) ? String(body.device) : null;
    // keep each name's best score only
    const [, rank, best] = await redis([
      ["ZADD", g.board, "GT", score, name],
      ["ZREVRANK", g.board, name],
      ["ZSCORE", g.board, name],
    ]);
    if (device && Number(best) === score) await redis([["HSET", g.board + ":device", name, device]]);
    return reply({ top: await top(game), rank: rank === null ? null : Number(rank) + 1, best: Number(best), name, game }, 200, perMinute.headers);
  } catch (e) {
    return reply({ error: "The leaderboard is having a moment" }, 502);
  }
}

export const PUT = () => methodNotAllowed("GET, POST");
export const DELETE = PUT;
export const PATCH = PUT;
