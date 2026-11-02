// gezine's Arcade: the menu on the page, a shared game window, and the mini games.
// DMCA Dodge lives in game.js; everything else is here:
//   Headpat Clicker, Bootstrap Typer, Whack-a-John, Pose Match, Combo Says.
// Global leaderboards come from api/scores.js. Written to run in the Switch 1 browser
// (about Safari 12): no ?. or ??, clicks instead of pointer events.
(function () {
  "use strict";

  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy) return; // old browsers get legacy.js instead
  const API = "/api/scores";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  const short = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e4 ? (n / 1e3).toFixed(1) + "K" : Math.floor(n).toLocaleString();
  const touchy = () => matchMedia("(pointer: coarse)").matches;

  // Bootstrap Typer can use different versions of the bootstrap.bas, loaded live from each repo
  const VERSIONS = [
    { id: "pepsipu", label: "pepsipu (original)", repo: "https://gitlab.com/pepsipu/ns2jb",
      url: "https://gitlab.com/api/v4/projects/pepsipu%2Fns2jb/repository/files/bootstrap.bas/raw?ref=main" },
    { id: "kurumuz", label: "kurumuz fork", repo: "https://gitlab.com/kurumuz/ns2jb",
      url: "https://gitlab.com/api/v4/projects/kurumuz%2Fns2jb/repository/files/bootstrap.bas/raw?ref=main" },
    { id: "mhzsajan", label: "mhzsajan rework", repo: "https://github.com/mhzsajan/ns2jb",
      url: "https://raw.githubusercontent.com/mhzsajan/ns2jb/HEAD/bootstrap.bas" },
    { id: "pico", label: "Pico edition (MikeM64)", repo: "https://github.com/MikeM64/pico-ns2jb-bootstrap",
      url: "https://raw.githubusercontent.com/MikeM64/pico-ns2jb-bootstrap/HEAD/src/bootstrap.bas" },
  ];
  const versionById = (id) => VERSIONS.filter((v) => v.id === id)[0] || VERSIONS[0];

  // ---------------------------------------------------------------- the games
  const GAMES = [
    { id: "dodge", title: "DMCA Dodge", art: "images/headset/run0.png", board: true, unit: "points",
      blurb: "Catch notes and SmileBASIC tokens in her headset, dodge the DMCA letters. Lose and John Nintendo turns up with the bootstrap.bas." },
    { id: "clicker", title: "Headpat Clicker", art: "images/pat/2.png", board: false, unit: "headpats",
      blurb: "Pat gezine, buy upgrades, pat harder. Every pat you give by hand counts towards everyone's headpats." },
    { id: "typer", title: "Bootstrap Typer", art: "images/peek/pepsipu.png", board: true, unit: "characters",
      blurb: "Type the real ns2jb bootstrap.bas as fast as you can, in a SmileBASIC 4 style editor. Pick a version and a mode.",
      options: [
        { id: "version", label: "Version", choices: VERSIONS.map((v) => ({ id: v.id, label: v.label })) },
        { id: "mode", label: "Mode", choices: [{ id: "classic", label: "Classic 60s" }, { id: "sprint", label: "Sprint 30s" }, { id: "marathon", label: "Marathon 2min" }] },
      ],
      ranked: (o) => o.mode === "classic", rankedNote: "Classic (60s)" },
    { id: "whack", title: "Whack-a-John", art: "images/arcade/john-head.png", board: true, unit: "bonks",
      blurb: "John Nintendo keeps popping out of gezine's hut. Bonk him. Do not bonk gezine." },
    { id: "match", title: "Pose Match", art: "images/headset/wave2.png", board: true, unit: "points",
      blurb: "Flip the cards and find gezine's matching poses. Faster and fewer mistakes scores more." },
    { id: "combo", title: "Combo Says", art: "images/headset/jump2.png", board: true, unit: "points",
      blurb: "Watch the button combo, then press it back. It gets one longer every round." },
  ];
  const byId = {};
  GAMES.forEach((g) => { byId[g.id] = g; });

  // ---------------------------------------------------------------- your player code
  // A random secret made on this device the first time it's needed. The server only keeps a hash
  // of it, and uses it so nobody else can post scores under a name you've claimed.
  const player = {
    token() {
      let t = store.get("player-token");
      if (!t || !/^[A-Za-z0-9_-]{20,64}$/.test(t)) {
        const bytes = new Uint8Array(24);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        t = btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        store.set("player-token", t);
      }
      return t;
    },
    use(code) {
      code = String(code || "").trim();
      if (!/^[A-Za-z0-9_-]{20,64}$/.test(code)) return false;
      store.set("player-token", code);
      return true;
    },
  };
  window.GezPlayer = player;

  // ---------------------------------------------------------------- leaderboards
  const board = {
    async top(game) {
      const r = await fetch(API + "?game=" + game);
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(b.top)) throw new Error(b.error || "offline");
      return b.top;
    },
    async all() {
      const r = await fetch(API + "?all=1");
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.games) throw new Error(b.error || "offline");
      return b.games;
    },
    async start(game) {
      try {
        const r = await fetch(API + "?start=1&game=" + game, { method: "POST" });
        return r.ok ? (await r.json()).run || null : null;
      } catch (e) { return null; }
    },
    async submit(run, name, score) {
      const r = await fetch(API, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ run, name, score, device: DEV.id, token: player.token() }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "Couldn't reach the leaderboard");
      return b;
    },
  };

  function boardHTML(top, n, mine) {
    if (!top.length) return "<p><small>No scores yet. Be the first!</small></p>";
    const names = window.GEZ_DEVICE_NAMES || {};
    return '<table class="hh-board"><thead><tr><th>#</th><th>Name</th><th>Score</th></tr></thead><tbody>' +
      top.slice(0, n).map((e, i) =>
        "<tr" + (mine && e.name === mine ? ' class="me"' : "") + "><td>" + (i + 1) + "</td><td>" + esc(e.name) +
        (e.device && names[e.device] ? ' <small class="hh-dev">on ' + esc(names[e.device]) + "</small>" : "") +
        "</td><td>" + e.score.toLocaleString() + "</td></tr>").join("") +
      "</tbody></table>";
  }

  async function renderBoard(el, game, n, mine) {
    if (!el) return;
    try { el.innerHTML = boardHTML(await board.top(game), n || 10, mine); }
    catch (e) { el.innerHTML = "<p><small>The leaderboard is offline right now.</small></p>"; }
  }

  // the bootstrap.bas, for Bootstrap Typer (same file DMCA Dodge uses)
  const PRACTICE = ['PRINT "GOOD BOY"', "VAR HEADPATS=0", "FOR I=1 TO 30:NEXT", 'IF DMCA THEN PRINT "RUN"', "VSYNC 1", "WAIT 60"];
  const codeCache = {};
  // every line of the file with its real line number; "typeable" ones are the ones you type
  const toLines = (arr) => arr.map((raw, i) => {
    const text = raw.replace(/\s+$/, "").replace(/^\s+/, "");
    const indent = raw.length - raw.replace(/^\s+/, "").length;
    return { n: i + 1, indent: Math.min(indent, 8), text, typeable: text.length >= 2 && text.length <= 52 && text[0] !== "'" && !/^REM\b/i.test(text) };
  });
  function loadCode(versionId) {
    const v = versionById(versionId);
    if (!codeCache[v.id]) codeCache[v.id] = fetch(v.url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((t) => {
        const lines = toLines(t.replace(/\t/g, " ").split(/\r?\n/));
        return lines.filter((l) => l.typeable).length > 20 ? { lines, real: true } : { lines: toLines(PRACTICE), real: false };
      })
      .catch(() => ({ lines: toLines(PRACTICE), real: false }));
    return codeCache[v.id];
  }

  // SmileBASIC syntax colours (in the spirit of the SmileBASIC 4 editor)
  const SB_KEYWORDS = new Set(("VAR DEF END IF THEN ELSE ELSEIF ENDIF FOR TO STEP NEXT WHILE WEND REPEAT UNTIL RETURN PRINT COMMON " +
    "GOTO GOSUB ON BREAK CONTINUE AND OR NOT MOD DIV XOR CALL DIM OUT EXEC USE STOP INPUT LINPUT DATA READ RESTORE SWAP " +
    "INC DEC CLS LOCATE COLOR VSYNC WAIT OPTION STRICT DEFINT TRUE FALSE CASE WHEN OTHERWISE ENDCASE LOOP ENDLOOP").split(" "));
  function sbColors(s) {
    const out = [];
    for (let k = 0; k < s.length; k++) out.push("tx");
    const set = (a, b, c) => { for (let k = a; k < b && k < s.length; k++) out[k] = c; };
    let i = 0;
    while (i < s.length) {
      const c = s[i], nx = s[i + 1] || "";
      if (c === "'") { set(i, s.length, "cm"); break; }
      if (c === '"') { let j = i + 1; while (j < s.length && s[j] !== '"') j++; set(i, j + 1, "st"); i = j + 1; continue; }
      if (c === "&" && /[HBhb]/.test(nx)) { let j = i + 2; while (j < s.length && /[0-9A-Fa-f]/.test(s[j])) j++; set(i, j, "nu"); i = j; continue; }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(nx))) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; set(i, j, "nu"); i = j; continue; }
      if (c === "@") { let j = i + 1; while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++; set(i, j, "lb"); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) {
        let j = i; while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
        const word = s.slice(i, j).toUpperCase();
        if (/[#$%]/.test(s[j] || "")) j++;
        if (word === "REM") { set(i, s.length, "cm"); break; }
        set(i, j, SB_KEYWORDS.has(word) ? "kw" : s[j] === "(" ? "fn" : "tx");
        i = j; continue;
      }
      if (/[=<>+\-*\/!:,;()[\]]/.test(c)) out[i] = "op";
      i++;
    }
    return out;
  }

  // ---------------------------------------------------------------- direct links
  // Every game has its own link, gezinegoodboy.vercel.app/play/<game> (vercel.json sends that
  // to /?play=<game>). While a game is open, the address bar shows its link too.
  const linkFor = (id) => location.protocol + "//" + location.host + "/play/" + id;
  function setPlayParam(id) {
    if (!window.history || !history.replaceState) return;
    try {
      const params = new URLSearchParams(location.search);
      if (id) params.set("play", id); else params.delete("play");
      const q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    } catch (e) {}
  }
  function copyLink(id, btn) {
    const url = linkFor(id);
    const done = () => { if (btn) { const old = btn.textContent; btn.textContent = "Link copied!"; setTimeout(() => { btn.textContent = old; }, 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt("Copy this link:", url));
    else window.prompt("Copy this link:", url); // older browsers, like the Switch's
  }

  // ---------------------------------------------------------------- the game window
  const css = `
  #ar { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 1000; background: #f4f2fb; box-sizing: border-box;
        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        display: flex; flex-direction: column; overscroll-behavior: contain; -webkit-tap-highlight-color: transparent;
        font-family: "Nunito", system-ui, sans-serif; color: #141a2b; }
  #ar[hidden] { display: none; }
  .ar-bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; border-bottom: 1px solid #d9dcea; flex: none; }
  .ar-bar h2 { margin: 0; font-family: "Fredoka", sans-serif; font-size: 1.25em; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ar-score { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ar-status { color: #5b6275; font-size: .9em; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ar-x { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #141a2b; background: #fff; color: #141a2b; font-size: 18px; cursor: pointer; flex: none; padding: 0; }
  .ar-stage { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; padding: 16px; display: flex; align-items: center; justify-content: center; position: relative; }
  .ar-stage > * { max-width: 100%; }
  .ar-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 440px); max-height: 86%; overflow-y: auto;
              box-sizing: border-box; background: #fff; border-radius: 18px; padding: 20px; text-align: center; box-shadow: 0 10px 40px rgba(20,26,43,.18); z-index: 5; }
  .ar-panel[hidden] { display: none; }
  .ar-panel h2 { font-family: "Fredoka", sans-serif; font-weight: 600; margin: 0 0 8px; font-size: 1.5em; }
  .ar-panel .big { font-family: "Fredoka", sans-serif; font-size: 2.4em; font-weight: 600; margin: 0; line-height: 1.1; }
  .ar-panel img.art { height: 96px; width: auto; margin: 0 auto 6px; display: block; }
  .ar-panel p { margin: 8px 0; }
  .ar-btn { font: inherit; font-weight: 700; min-height: 44px; padding: 9px 18px; margin: 6px 4px 0; border-radius: 999px; border: 2px solid #141a2b;
            background: #fff; color: #141a2b; cursor: pointer; }
  .ar-btn.main { background: #141a2b; color: #fff; }
  .ar-btn[disabled] { opacity: .4; cursor: default; }
  .ar-panel input { font: inherit; font-size: 16px; width: 100%; box-sizing: border-box; min-height: 44px; padding: 8px 12px;
                    border: 2px solid #141a2b; border-radius: 12px; margin-top: 4px; }
  .ar-msg { min-height: 1.4em; font-size: .9em; }
  .ar-opt { margin: 10px 0 0; } .ar-opt span { display: block; font-size: .8em; font-weight: 800; color: #5b6275; margin-bottom: 4px; }
  .ar-chip { font: inherit; font-size: .85em; font-weight: 700; padding: 5px 11px; margin: 0 4px 6px 0; border-radius: 999px; border: 2px solid #d9dcea; background: #fff; color: #141a2b; cursor: pointer; }
  .ar-chip.on { border-color: #f06292; background: #fde7ef; }
  .ar-msg.err { color: #c62828; }
  .hh-board { width: 100%; border-collapse: collapse; margin: 8px 0 4px; font-size: .92em; }
  .hh-board th, .hh-board td { border-bottom: 1px solid #d9dcea; padding: 4px 8px; text-align: left; }
  .hh-board td:first-child, .hh-board th:first-child { width: 2em; text-align: right; }
  .hh-board td:last-child, .hh-board th:last-child { text-align: right; }
  .hh-board tr.me td { background: #fde7ef; font-weight: 800; }
  .hh-dev { font-weight: 400; color: #8a90a2; white-space: nowrap; }
  .pop { position: absolute; pointer-events: none; font-weight: 800; animation: ar-pop .8s ease-out forwards; }
  @keyframes ar-pop { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -50px); } }

  /* clicker */
  .ck { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; justify-content: center; width: 760px; }
  .ck-left { flex: 1 1 280px; text-align: center; position: relative; }
  .ck-gez { width: 260px; height: 260px; max-width: 70vw; max-height: 70vw; border-radius: 50%; border: 4px solid #141a2b; background: #fff; cursor: pointer; padding: 10px; }
  .ck-gez img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
  .ck-gez:active { transform: scale(.97); }
  .ck-count { font-family: "Fredoka", sans-serif; font-size: 2em; font-weight: 600; margin: 10px 0 0; }
  .ck-rate { color: #5b6275; margin: 0; }
  .ck-global { font-size: .85em; color: #5b6275; margin-top: 6px; }
  .ck-shop { flex: 1 1 280px; }
  .ck-up { display: block; width: 100%; text-align: left; margin: 0 0 8px; padding: 10px 14px; border-radius: 14px; border: 2px solid #141a2b; background: #fff;
           font: inherit; cursor: pointer; color: #141a2b; }
  .ck-up[disabled] { opacity: .45; cursor: default; }
  .ck-up b { display: block; }
  .ck-up span { font-size: .85em; color: #5b6275; }
  .ck-up em { float: right; font-style: normal; font-weight: 800; }

  /* typer: a SmileBASIC 4 style editor */
  .ty { width: 760px; }
  .sb { background: #0b0f2a; border-radius: 12px; overflow: hidden; border: 3px solid #2b3270; box-shadow: 0 8px 30px rgba(11,15,42,.35);
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-weight: 600; letter-spacing: .02em; }
  .sb-tabs { display: flex; gap: 2px; background: #1a2054; padding: 4px 6px 0; font-size: 12px; }
  .sb-tab { padding: 4px 12px; color: #8c95d4; border-radius: 6px 6px 0 0; }
  .sb-tab.on { background: #0b0f2a; color: #fff; }
  .sb-body { padding: 8px 0; font-size: 15px; font-size: clamp(10px, 2.45vw, 16px); line-height: 1.65; }
  .sb-row { display: flex; white-space: pre; overflow: hidden; }
  .sb-row .ln { flex: none; width: 4.6em; padding-right: .8em; text-align: right; color: #4b5596; background: #10153a; margin-right: .6em; }
  .sb-row .code { overflow: hidden; text-overflow: ellipsis; }
  .sb-row.cur { background: #1b2366; }
  .sb-row.cur .ln { color: #ffe066; background: #232c7a; }
  .sb-row.prev { opacity: .5; }
  .sb-row.skip .code { opacity: .55; }
  .sb .tx { color: #f2f2f8; } .sb .kw { color: #4fd6ff; } .sb .fn { color: #9fe3ff; } .sb .st { color: #ff8ad8; }
  .sb .nu { color: #ffb35c; } .sb .cm { color: #6fdc74; } .sb .lb { color: #ffe066; } .sb .op { color: #c3c6e0; }
  .sb .todo { opacity: .38; }
  .sb .bad { background: #e53935; color: #fff !important; border-radius: 2px; opacity: 1; }
  .sb .caret { position: relative; opacity: .38; }
  .sb .caret::after { content: ""; position: absolute; left: 0; right: 0; bottom: 1px; height: 3px; background: #fff; animation: sb-blink 1s steps(1) infinite; }
  @keyframes sb-blink { 50% { opacity: 0; } }
  .sb-status { display: flex; justify-content: space-between; gap: 10px; background: #1a2054; color: #8c95d4; font-size: 12px; padding: 5px 10px; }
  .ty-cmd { display: flex; align-items: center; gap: 8px; margin-top: 12px; background: #0b0f2a; border: 3px solid #2b3270; border-radius: 12px; padding: 4px 12px; }
  .ty-cmd span { color: #ffe066; font: 700 18px ui-monospace, Menlo, Consolas, monospace; }
  .ty-cmd input { flex: 1; min-width: 0; background: transparent; border: 0; color: #fff; font: 600 18px ui-monospace, Menlo, Consolas, monospace; padding: 10px 0; outline: none; }
  .ty-src { text-align: center; margin: 8px 0 0; }

  /* whack */
  .wk { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: min(520px, 92vw); }
  .wk-win { position: relative; aspect-ratio: 1; height: 0; padding-bottom: 100%; border-radius: 18px; border: 3px solid #6b4a2b; background: #2a3350; overflow: hidden; cursor: pointer; }
  @supports (aspect-ratio: 1) { .wk-win { height: auto; padding-bottom: 0; } }
  .wk-win::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 18%; background: #8a5a33; border-top: 3px solid #6b4a2b; }
  .wk-win img { position: absolute; left: 8%; width: 84%; bottom: -100%; transition: bottom .12s ease-out; pointer-events: none; }
  .wk-win.up img { bottom: 17%; } /* sits just above the sill */
  .wk-win.hit { background: #4a2a2a; }
  .wk-win.oops { background: #c62828; }
  .wk-key { position: absolute; top: 4px; left: 8px; color: rgba(255,255,255,.35); font-size: .75em; font-weight: 800; }

  /* match */
  .mt { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: min(520px, 92vw); }
  .mt-card { position: relative; aspect-ratio: 1; height: 0; padding-bottom: 100%; border-radius: 14px; border: 2px solid #141a2b; background: #141a2b; cursor: pointer; overflow: hidden; }
  @supports (aspect-ratio: 1) { .mt-card { height: auto; padding-bottom: 0; } }
  .mt-card::before { content: "?"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f06292; font: 600 2em "Fredoka", sans-serif; }
  .mt-card img { position: absolute; top: 6%; left: 6%; width: 88%; height: 88%; object-fit: contain; visibility: hidden; }
  .mt-card.open, .mt-card.done { background: #fff; }
  .mt-card.open::before, .mt-card.done::before { content: ""; }
  .mt-card.open img, .mt-card.done img { visibility: visible; }
  .mt-card.done { border-color: #2e7d32; box-shadow: inset 0 0 0 3px #a5d6a7; cursor: default; }

  /* combo */
  .cb { display: grid; grid-template-columns: repeat(3, 110px); grid-template-rows: repeat(3, 110px); gap: 8px; }
  .cb button { border-radius: 50%; border: 4px solid #141a2b; font: 600 2.2em "Fredoka", sans-serif; color: #fff; cursor: pointer; opacity: .55; transition: transform .08s, opacity .08s; }
  .cb button.lit { opacity: 1; transform: scale(1.08); box-shadow: 0 0 0 6px rgba(255,255,255,.7), 0 0 30px currentColor; }
  .cb .X { grid-column: 2; grid-row: 1; background: #3a7bd5; } .cb .A { grid-column: 3; grid-row: 2; background: #e04848; }
  .cb .B { grid-column: 2; grid-row: 3; background: #e0b020; } .cb .Y { grid-column: 1; grid-row: 2; background: #43a047; }
  .cb .mid { grid-column: 2; grid-row: 2; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 800; font-size: .95em; }
  @media (max-width: 420px) { .cb { grid-template-columns: repeat(3, 84px); grid-template-rows: repeat(3, 84px); } }
  `;

  let root, titleEl, scoreEl, statusEl, stage, panel, lastFocus;
  let current = null, playing = false, runPromise = null, runId = null, timers = [], keyHandler = null, cleanup = null;

  function build() {
    if (root) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    root = document.createElement("div");
    root.id = "ar";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML = '<div class="ar-bar"><h2></h2><span class="ar-status" aria-live="polite"></span><span class="ar-score" aria-live="polite"></span>' +
      '<button class="ar-x" type="button" aria-label="Leave the game">✕</button></div><div class="ar-stage"></div><div class="ar-panel" hidden></div>';
    document.body.appendChild(root);
    titleEl = root.querySelector("h2");
    scoreEl = root.querySelector(".ar-score");
    statusEl = root.querySelector(".ar-status");
    stage = root.querySelector(".ar-stage");
    panel = root.querySelector(".ar-panel");
    root.querySelector(".ar-x").onclick = close;
    addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      const typing = e.target && e.target.tagName === "INPUT";
      if (playing && keyHandler && !typing) keyHandler(e);
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && playing && current && current.pauses) close(); });
  }

  function clearTimers() { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers = []; }
  const api = {
    get stage() { return stage; },
    score(text) { scoreEl.textContent = text; },
    status(text) { statusEl.textContent = text; },
    after(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; },
    every(ms, fn) { const t = setInterval(fn, ms); timers.push(t); return t; },
    keys(fn) { keyHandler = fn; },
    onStop(fn) { cleanup = fn; },
    end(score, headline) { finish(score, headline); },
    pop(x, y, text, color) {
      const el = document.createElement("div");
      el.className = "pop"; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; el.style.color = color || "#141a2b";
      stage.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
    },
  };

  function stopGame() {
    playing = false;
    clearTimers();
    keyHandler = null;
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  }

  function showPanel(html, buttons, focusSel) {
    panel.innerHTML = html;
    const row = document.createElement("div");
    buttons.forEach(([label, fn, main]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ar-btn" + (main ? " main" : ""); b.textContent = label; b.onclick = fn;
      row.appendChild(b);
    });
    panel.appendChild(row);
    panel.hidden = false;
    panel.scrollTop = 0;
    const f = (focusSel && panel.querySelector(focusSel)) || row.querySelector("button");
    if (f) f.focus({ preventScroll: true });
  }

  function controls(g) {
    const t = touchy();
    if (g.controls) return typeof g.controls === "function" ? g.controls(t) : g.controls;
    return {
      clicker: t ? "Tap gezine to pat her." : "Click gezine, or press Space.",
      typer: "Type the line exactly (capitals don't matter). It moves on by itself.",
      whack: t ? "Tap John when he pops up." : "Click John, or use the keys shown in each window.",
      match: "Tap two cards to flip them.",
      combo: t ? "Watch, then tap the buttons in the same order." : "Watch, then press them back: click, or X A B Y (or the arrow keys).",
    }[g.id] || "";
  }

  function showTitle() {
    const g = current;
    scoreEl.textContent = ""; statusEl.textContent = "";
    stage.innerHTML = "";
    const best = Number(store.get("arcade-best-" + g.id)) || 0;
    showPanel(
      '<img class="art" src="' + g.art + '" alt="">' +
      "<h2>" + esc(g.title) + "</h2><p>" + esc(g.blurb) + "</p><p><small>" + esc(controls(g)) + "</small></p>" +
      (best ? "<p>Your best: <b>" + best.toLocaleString() + "</b></p>" : "") +
      optionsHTML(g) +
      (g.board ? '<div class="ar-top"><p><small>Loading the leaderboard...</small></p></div>' : ""),
      [["Play", start, true], ["Copy link", (e) => copyLink(g.id, e.target), false], ["Back to the arcade", close]]);
    if (g.board) renderBoard(panel.querySelector(".ar-top"), g.id, 5, store.get("headset-name"));
  }

  // games can offer choices on their title screen: options: [{ id, label, choices: [{ id, label }] }]
  const chosen = (g, o) => {
    const saved = store.get(g.id + "-opt-" + o.id);
    return o.choices.some((c) => c.id === saved) ? saved : o.choices[0].id;
  };
  function optionsHTML(g) {
    if (!g.options) return "";
    return g.options.map((o) => '<div class="ar-opt"><span>' + esc(o.label) + "</span>" + o.choices.map((c) =>
      '<button type="button" class="ar-chip' + (chosen(g, o) === c.id ? " on" : "") + '" data-opt="' + o.id + '" data-val="' + c.id + '">' + esc(c.label) + "</button>").join("") +
      "</div>").join("");
  }
  addEventListener("click", (e) => {
    const b = e.target && e.target.closest ? e.target.closest(".ar-chip") : null;
    if (!b || !current) return;
    store.set(current.id + "-opt-" + b.getAttribute("data-opt"), b.getAttribute("data-val"));
    [].forEach.call(panel.querySelectorAll('.ar-chip[data-opt="' + b.getAttribute("data-opt") + '"]'), (x) => x.classList.toggle("on", x === b));
  });

  function start() {
    stopGame();
    panel.hidden = true;
    stage.innerHTML = "";
    scoreEl.textContent = ""; statusEl.textContent = "";
    playing = true;
    runId = null;
    api.options = {};
    (current.options || []).forEach((o) => { api.options[o.id] = chosen(current, o); });
    api.ranked = true;
    if (current.board && (!current.ranked || current.ranked(api.options))) {
      const p = (runPromise = board.start(current.id));
      p.then((id) => { if (runPromise === p) runId = id; });
    }
    IMPL[current.id](api);
  }

  async function finish(score, headline) {
    if (!playing) return;
    stopGame();
    const g = current;
    score = Math.max(0, Math.floor(score));
    const key = "arcade-best-" + g.id;
    const prev = Number(store.get(key)) || 0;
    const newBest = score > prev;
    if (newBest) store.set(key, String(score));
    if (runPromise) await Promise.race([runPromise, new Promise((ok) => setTimeout(ok, 1500))]);
    const run = runId;
    runId = null;
    const ranked = !g.ranked || g.ranked(api.options || {});
    const canSubmit = g.board && ranked && score > 0 && run;
    const name = store.get("headset-name") || "";
    showPanel(
      "<h2>" + esc(headline || "Game over") + "</h2>" +
      '<p class="big">' + score.toLocaleString() + "</p><p><small>" + esc(g.unit) + "</small></p>" +
      "<p>" + (newBest && score > 0 ? "New personal best!" : "Your best: " + Math.max(prev, score).toLocaleString()) + "</p>" +
      (canSubmit
        ? '<form class="ar-form" novalidate><label>Your name for the leaderboard' +
          '<input name="name" maxlength="16" autocomplete="nickname" autocapitalize="off" spellcheck="false" enterkeyhint="send" value="' + esc(name) + '"></label>' +
          '<button class="ar-btn main" type="submit">Submit score</button></form><p class="ar-msg"></p>'
        : g.board && !ranked ? "<p><small>Only " + esc(g.rankedNote || "the main mode") + " counts for the leaderboard.</small></p>"
        : g.board && score > 0 ? "<p><small>The leaderboard is offline right now, so this score is only saved on this device.</small></p>" : "") +
      (g.board ? '<div class="ar-top"></div>' : ""),
      [["Play again", start, !canSubmit], ["Back to the arcade", close]],
      canSubmit ? (name || touchy() ? ".ar-form button" : ".ar-form input") : null);
    if (g.board) renderBoard(panel.querySelector(".ar-top"), g.id, 10, name);
    const form = panel.querySelector(".ar-form");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const input = form.querySelector("input"), btn = form.querySelector("button"), msg = panel.querySelector(".ar-msg");
      const typed = input.value.trim();
      if (!typed) { msg.className = "ar-msg err"; msg.textContent = "Type a name first"; input.focus(); return; }
      btn.disabled = true; msg.className = "ar-msg"; msg.textContent = "Sending...";
      try {
        const res = await board.submit(run, typed, score);
        store.set("headset-name", res.name || typed);
        form.parentNode.removeChild(form);
        msg.textContent = (res.rank ? "You're #" + res.rank + " on the leaderboard" + (res.best > score ? " (your best is " + res.best.toLocaleString() + ")" : "") + "!" : "Score sent!") +
          (res.week && res.week.rank ? " And #" + res.week.rank + " in this week's event!" : "");
        panel.querySelector(".ar-top").innerHTML = boardHTML(res.top || [], 10, res.name || typed);
      } catch (err) {
        btn.disabled = false;
        msg.className = "ar-msg err";
        msg.textContent = err.message;
        if (/expired|already ended/.test(err.message)) form.parentNode.removeChild(form);
      }
    };
  }

  let pendingOpen = null;
  function open(id) {
    const g = byId[id];
    if (!g) { pendingOpen = id; return; } // a plug-in game that hasn't loaded yet
    setPlayParam(id);
    if (id === "dodge") { if (window.HeadsetHero) window.HeadsetHero.open(); return; }
    build();
    lastFocus = document.activeElement;
    current = g;
    root.setAttribute("aria-label", g.title);
    titleEl.textContent = g.title;
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    if (id === "clicker") start(); // nothing to explain, just start patting
    else showTitle();
  }

  function close() {
    if (!root || root.hidden) return;
    if (current && current.id === "clicker" && playing) stopGame();
    stopGame();
    root.hidden = true;
    stage.innerHTML = "";
    panel.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    setPlayParam(null);
    refreshPage();
  }

  // ================================================================ Headpat Clicker
  const UPGRADES = [
    { id: "hand", name: "Extra hand", desc: "+1 headpat per pat", base: 15, grow: 1.6 },
    { id: "auto", name: "Pat-o-matic", desc: "+1 headpat every second", base: 60, grow: 1.7 },
    { id: "helper", name: "Homebrew helper", desc: "+8 headpats every second", base: 600, grow: 1.75 },
    { id: "headset", name: "Cat-ear headset", desc: "Doubles all headpats", base: 2500, grow: 6 },
    { id: "exploit", name: "ns2jb exploit", desc: "+60 headpats every second", base: 12000, grow: 1.85 },
  ];
  const IMPL = {};
  IMPL.clicker = (a) => {
    let S;
    try { S = JSON.parse(store.get("clicker") || "null"); } catch (e) { S = null; }
    if (!S || typeof S.pats !== "number") S = { pats: 0, owned: {} };
    const owned = (id) => S.owned[id] || 0;
    const mult = () => Math.pow(2, owned("headset"));
    const perPat = () => (1 + owned("hand")) * mult();
    const perSec = () => (owned("auto") + owned("helper") * 8 + owned("exploit") * 60) * mult();
    const cost = (u) => Math.floor(u.base * Math.pow(u.grow, owned(u.id)));
    const save = () => store.set("clicker", JSON.stringify(S));

    a.stage.innerHTML = '<div class="ck"><div class="ck-left"><button class="ck-gez" type="button" aria-label="Pat gezine"><img src="images/good/0.png" alt=""></button>' +
      '<p class="ck-count"></p><p class="ck-rate"></p><p class="ck-global"></p></div><div class="ck-shop"></div></div>';
    const gez = a.stage.querySelector(".ck-gez"), img = gez.querySelector("img"), count = a.stage.querySelector(".ck-count"),
      rate = a.stage.querySelector(".ck-rate"), global = a.stage.querySelector(".ck-global"), shop = a.stage.querySelector(".ck-shop");
    shop.innerHTML = "<h3 style=\"margin:0 0 10px\">Upgrades</h3>" + UPGRADES.map((u) =>
      '<button class="ck-up" type="button" data-up="' + u.id + '"><em></em><b>' + esc(u.name) + '</b><span>' + esc(u.desc) + "</span></button>").join("");
    const ups = [].slice.call(shop.querySelectorAll(".ck-up"));

    function render() {
      count.textContent = short(S.pats) + " headpats";
      rate.textContent = perPat().toLocaleString() + " per pat · " + short(perSec()) + " per second";
      a.score(short(S.pats));
      ups.forEach((b) => {
        const u = UPGRADES.filter((x) => x.id === b.getAttribute("data-up"))[0];
        b.querySelector("em").textContent = short(cost(u)) + (owned(u.id) ? " · x" + owned(u.id) : "");
        b.disabled = S.pats < cost(u);
      });
    }
    ups.forEach((b) => {
      b.onclick = () => {
        const u = UPGRADES.filter((x) => x.id === b.getAttribute("data-up"))[0];
        if (S.pats < cost(u)) return;
        S.pats -= cost(u);
        S.owned[u.id] = owned(u.id) + 1;
        save(); render();
      };
    });

    // every pat by hand also counts towards everyone's global headpats (batched, like the main button)
    let pending = 0, frame = 0, frameTimer = 0;
    function pat(e) {
      S.pats += perPat();
      pending++;
      clearTimeout(frameTimer);
      frame = (frame + 1) % 4;
      img.src = "images/pat/" + frame + ".png";
      frameTimer = setTimeout(() => { img.src = "images/good/0.png"; }, 450);
      const r = gez.getBoundingClientRect(), s = a.stage.getBoundingClientRect();
      const x = e && e.clientX ? e.clientX - s.left : r.left - s.left + r.width / 2;
      const y = e && e.clientY ? e.clientY - s.top : r.top - s.top + 20;
      a.pop(x + rand(-20, 20), y - 10, "+" + short(perPat()), "#f06292");
      render();
    }
    gez.onclick = pat;
    a.keys((e) => {
      if (e.target && e.target.tagName === "BUTTON") return; // a focused button already clicks itself
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) pat(); }
    });
    a.every(100, () => { S.pats += perSec() / 10; render(); });
    a.every(2000, () => {
      save();
      const n = Math.min(pending, 25);
      if (!n) return;
      pending -= n;
      fetch("/api/counts?type=headpat&n=" + n, { method: "POST" })
        .then((r) => r.json()).then((b) => { if (b.headpats !== undefined) global.textContent = "Everyone so far: " + b.headpats.toLocaleString() + " headpats"; })
        .catch(() => {});
    });
    fetch("/api/counts").then((r) => r.json()).then((b) => { if (b.headpats !== undefined) global.textContent = "Everyone so far: " + b.headpats.toLocaleString() + " headpats"; }).catch(() => {});
    a.status("saved on this device");
    a.onStop(save);
    render();
    gez.focus({ preventScroll: true });
  };

  // ================================================================ Bootstrap Typer
  IMPL.typer = (a) => {
    const opts = a.options || {}, version = versionById(opts.version);
    const SECONDS = opts.mode === "sprint" ? 30 : opts.mode === "marathon" ? 120 : 60, BEFORE = 3, AFTER = 6;
    a.stage.innerHTML = '<div class="ty"><div class="sb"><div class="sb-tabs"><span class="sb-tab on">SLOT 0: BOOTSTRAP.BAS</span><span class="sb-tab">' + esc(version.label.toUpperCase()) + '</span></div>' +
      '<div class="sb-body" aria-live="polite"><div class="sb-row cur"><span class="ln"></span><span class="code">LOADING...</span></div></div>' +
      '<div class="sb-status"><span class="pos"></span><span class="clock">60s</span></div></div>' +
      '<label class="ty-cmd"><span>&gt;</span><input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the highlighted line here"></label>' +
      '<p class="ty-src"><small></small></p></div>';
    const body = a.stage.querySelector(".sb-body"), input = a.stage.querySelector("input"),
      pos = a.stage.querySelector(".pos"), clock = a.stage.querySelector(".clock"), src = a.stage.querySelector(".ty-src small");
    input.focus(); // focus now, while we're still inside the click, so phones show the keyboard
    input.onpaste = (e) => e.preventDefault();
    let lines = toLines(PRACTICE), cur = 0, best = 0, score = 0, typedOk = 0, left = SECONDS, started = false, ready = false;

    clock.textContent = SECONDS + "s";
    loadCode(version.id).then((c) => {
      lines = c.lines;
      src.innerHTML = c.real ? "Lines from the " + esc(version.label) + ' bootstrap.bas (<a href="' + version.repo + '" target="_blank" rel="noopener">source</a>). Capitals don\'t matter.' : "Practice lines (couldn't reach that repo).";
      // start somewhere random, on a line you can type
      const starts = lines.map((l, i) => (l.typeable ? i : -1)).filter((i) => i >= 0);
      cur = starts[Math.floor(Math.random() * starts.length)];
      ready = true;
      best = 0; input.value = "";
      draw();
    });

    function nextTypeable(from) {
      for (let k = 1; k <= lines.length; k++) { const i = (from + k) % lines.length; if (lines[i].typeable) return i; }
      return from;
    }
    function okCount(v, t) { let ok = 0; while (ok < v.length && ok < t.length && v[ok].toUpperCase() === t[ok].toUpperCase()) ok++; return ok; }
    function rowHTML(l, cls, typed) {
      const pad = " ".repeat(l.indent);
      const colors = sbColors(l.text);
      let html = "";
      for (let k = 0; k < l.text.length; k++) {
        let c = colors[k];
        if (typed) {
          if (k < typed.ok) {} // typed correctly: full colour
          else if (k < typed.v.length) c += " bad";
          else if (k === typed.v.length) c += " caret";
          else c += " todo";
        }
        html += '<span class="' + c + '">' + esc(l.text[k]) + "</span>";
      }
      if (typed && typed.v.length >= l.text.length && typed.ok < l.text.length) html += '<span class="bad"> </span>';
      return '<div class="sb-row ' + cls + (l.typeable || cls === "cur" ? "" : " skip") + '"><span class="ln">' + l.n + '</span><span class="code">' + pad + html + "</span></div>";
    }
    function draw() {
      if (!ready) return 0;
      const l = lines[cur], v = input.value, ok = okCount(v, l.text);
      let html = "";
      for (let k = BEFORE; k >= 1; k--) { const i = cur - k; if (i >= 0) html += rowHTML(lines[i], "prev"); }
      html += rowHTML(l, "cur", { v, ok });
      for (let k = 1; k <= AFTER; k++) {
        const i = cur + k;
        if (i >= lines.length) break;
        html += rowHTML(lines[i], "next").replace('class="sb-row next', 'style="opacity:' + (0.62 - k * 0.08).toFixed(2) + '" class="sb-row next');
      }
      body.innerHTML = html;
      pos.textContent = "LINE " + l.n + "  COL " + (Math.min(v.length, l.text.length) + 1 + l.indent);
      return ok;
    }
    input.oninput = () => {
      if (left <= 0 || !ready) return;
      if (!started) { started = true; tick(); }
      const t = lines[cur].text, ok = draw();
      if (ok > best) { score += ok - best; typedOk += ok - best; best = ok; }
      if (ok === t.length) {
        score += 5;
        a.pop(a.stage.clientWidth / 2, 40, "+5 line " + lines[cur].n + "!", "#2e7d32");
        cur = nextTypeable(cur);
        best = 0; input.value = "";
        draw();
      }
      a.score(score + " pts");
    };
    function tick() {
      a.every(1000, () => {
        left--;
        const elapsed = SECONDS - left;
        const wpm = Math.round((typedOk / 5) / (elapsed / 60));
        clock.textContent = left + "s" + (elapsed >= 5 ? "  " + wpm + " WPM" : "");
        a.status(left + "s");
        if (left <= 0) { input.blur(); a.end(score, wpm + " words a minute"); }
      });
    }
    a.status("starts when you type");
    a.score("0 pts");
  };

  // ================================================================ Whack-a-John
  IMPL.whack = (a) => {
    const SECONDS = 45, KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"], LETTERS = ["q", "w", "e", "a", "s", "d", "z", "x", "c"];
    a.stage.innerHTML = '<div class="wk">' + KEYS.map((k, i) =>
      '<button class="wk-win" type="button" data-i="' + i + '" aria-label="Window ' + (i + 1) + '">' + (touchy() ? "" : '<span class="wk-key">' + LETTERS[i].toUpperCase() + "</span>") +
      '<img src="images/arcade/john-head.png" alt=""></button>').join("") + "</div>";
    const wins = [].slice.call(a.stage.querySelectorAll(".wk-win"));
    const slot = wins.map(() => null); // null | { who, until }
    let score = 0, combo = 0, left = SECONDS, t = 0;
    function show(i, who, ms) {
      const w = wins[i];
      w.querySelector("img").src = who === "john" ? "images/arcade/john-head.png" : "images/arcade/gezine-head.png";
      w.classList.remove("hit", "oops");
      w.classList.add("up");
      slot[i] = { who, until: Date.now() + ms };
    }
    function hide(i) { wins[i].classList.remove("up"); slot[i] = null; }
    function hit(i) {
      const s = slot[i];
      if (!s) return;
      const r = wins[i].getBoundingClientRect(), st = a.stage.getBoundingClientRect();
      const x = r.left - st.left + r.width / 2, y = r.top - st.top + 10;
      if (s.who === "john") {
        combo++;
        const pts = 1 + Math.min(2, Math.floor(combo / 5));
        score += pts;
        wins[i].classList.add("hit");
        a.pop(x, y, "+" + pts + " bonk!", "#c62828");
      } else {
        combo = 0;
        score = Math.max(0, score - 5);
        wins[i].classList.add("oops");
        a.pop(x, y, "-5 not gezine!", "#c62828");
        if (navigator.vibrate) navigator.vibrate(80);
      }
      hide(i);
      a.after(260, () => wins[i].classList.remove("hit", "oops")); // just a quick flash
      a.score(score + " bonks");
    }
    wins.forEach((w, i) => { w.onclick = () => hit(i); });
    a.keys((e) => {
      const k = String(e.key).toLowerCase();
      let i = KEYS.indexOf(k);
      if (i < 0) i = LETTERS.indexOf(k);
      if (i >= 0) { e.preventDefault(); hit(i); }
    });
    a.every(100, () => {
      t += 0.1;
      const now = Date.now(), d = Math.min(1, t / SECONDS);
      slot.forEach((s, i) => { if (s && now > s.until) { if (s.who === "john") combo = 0; hide(i); } });
      // spawn more often, for shorter, as time goes on
      if (Math.random() < 0.09 + 0.12 * d) {
        const free = slot.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
        if (free.length) show(pick(free), Math.random() < 0.78 ? "john" : "gezine", 1150 - 550 * d);
      }
    });
    a.every(1000, () => {
      left--;
      a.status(left + "s left");
      if (left <= 0) a.end(score, score >= 40 ? "John Nintendo has been bonked into next week" : "John Nintendo escaped... for now");
    });
    a.status(left + "s left");
    a.score("0 bonks");
  };

  // ================================================================ Pose Match
  IMPL.match = (a) => {
    const POSES = ["images/headset/run0.png", "images/headset/jump2.png", "images/headset/trip2.png", "images/headset/wave2.png",
      "images/good/0.png", "images/bad/0.png", "images/pat/2.png", "images/game/1.png"];
    const deck = shuffle(POSES.concat(POSES));
    a.stage.innerHTML = '<div class="mt">' + deck.map((src, i) =>
      '<button class="mt-card" type="button" data-i="' + i + '" aria-label="Card ' + (i + 1) + '"><img src="' + src + '" alt=""></button>').join("") + "</div>";
    const cards = [].slice.call(a.stage.querySelectorAll(".mt-card"));
    let first = null, lock = false, misses = 0, found = 0, startedAt = 0;
    const scoreNow = () => Math.max(50, Math.round(1000 - ((Date.now() - startedAt) / 1000) * 8 - misses * 15));
    cards.forEach((c, i) => {
      c.onclick = () => {
        if (lock || c.classList.contains("open") || c.classList.contains("done")) return;
        if (!startedAt) {
          startedAt = Date.now();
          a.every(250, () => a.status(Math.floor((Date.now() - startedAt) / 1000) + "s · " + misses + " misses"));
        }
        c.classList.add("open");
        c.setAttribute("aria-label", "Card " + (i + 1) + ", showing a pose");
        if (first === null) { first = i; return; }
        const j = first; first = null;
        if (deck[i] === deck[j]) {
          cards[i].classList.add("done"); cards[j].classList.add("done");
          cards[i].classList.remove("open"); cards[j].classList.remove("open");
          found++;
          if (found === POSES.length) a.after(400, () => a.end(scoreNow(), misses === 0 ? "Perfect memory!" : "All matched!"));
        } else {
          misses++;
          lock = true;
          a.after(700, () => { cards[i].classList.remove("open"); cards[j].classList.remove("open"); lock = false; });
        }
        a.score(found + " / " + POSES.length);
      };
    });
    a.status("flip a card to start the clock");
    a.score("0 / " + POSES.length);
  };

  // ================================================================ Combo Says
  IMPL.combo = (a) => {
    const BTN = ["X", "A", "B", "Y"], TONE = { X: 523, A: 659, B: 392, Y: 440 };
    a.stage.innerHTML = '<div class="cb"><button class="X" type="button">X</button><button class="A" type="button">A</button>' +
      '<div class="mid">Watch</div><button class="B" type="button">B</button><button class="Y" type="button">Y</button></div>';
    const el = {};
    BTN.forEach((b) => { el[b] = a.stage.querySelector("." + b); });
    const mid = a.stage.querySelector(".mid");
    let audio = null;
    try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); } catch (e) {}
    function beep(freq, ms) {
      if (!audio) return;
      try {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.07, audio.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
        o.connect(g); g.connect(audio.destination);
        o.start(); o.stop(audio.currentTime + ms / 1000);
      } catch (e) {}
    }
    function light(b, ms) {
      el[b].classList.add("lit");
      beep(TONE[b], ms);
      a.after(ms, () => el[b].classList.remove("lit"));
    }
    const seq = [];
    let pos = 0, listening = false, rounds = 0;
    function round() {
      listening = false;
      seq.push(pick(BTN));
      pos = 0;
      mid.textContent = "Watch";
      a.status("round " + (rounds + 1));
      const step = Math.max(260, 520 - rounds * 18);
      seq.forEach((b, i) => a.after(600 + i * step, () => light(b, step * 0.7)));
      a.after(600 + seq.length * step, () => { listening = true; mid.textContent = "Your turn"; });
    }
    function press(b) {
      if (!listening) return;
      light(b, 160);
      if (b !== seq[pos]) {
        listening = false;
        beep(140, 500);
        mid.textContent = "Nope!";
        a.after(500, () => a.end(rounds * 10, rounds >= 10 ? "Combo master!" : "Combo dropped at " + (rounds + 1)));
        return;
      }
      pos++;
      if (pos === seq.length) {
        rounds++;
        a.score(rounds * 10 + " pts");
        mid.textContent = "Nice!";
        listening = false;
        a.after(500, round);
      }
    }
    BTN.forEach((b) => { el[b].onclick = () => press(b); });
    a.keys((e) => {
      const k = String(e.key);
      const map = { x: "X", a: "A", b: "B", y: "Y", ArrowUp: "X", ArrowRight: "A", ArrowDown: "B", ArrowLeft: "Y" };
      const b = map[k] || map[k.toLowerCase()];
      if (b) { e.preventDefault(); if (!e.repeat) press(b); }
    });
    a.onStop(() => { if (audio && audio.close) audio.close().catch(() => {}); });
    a.score("0 pts");
    round();
  };

  // ---------------------------------------------------------------- the menu on the page
  let menuEl, tabsEl, boardEl, boardGame = "dodge", tops = {};
  function cardHTML(g) {
    const best = Number(store.get(g.id === "dodge" ? "headset-best" : "arcade-best-" + g.id)) || 0;
    const t = tops[g.id] && tops[g.id][0];
    const extra = g.id === "clicker"
      ? (() => { try { const s = JSON.parse(store.get("clicker") || "null"); return s && s.pats ? "You have " + short(s.pats) + " headpats" : "Counts towards everyone's headpats"; } catch (e) { return ""; } })()
      : t ? "Top: " + esc(t.name) + " · " + t.score.toLocaleString() : g.board ? "No scores yet. Be the first!" : "";
    return '<article class="game-card">' +
      '<div class="game-art"><img src="' + g.art + '" alt="" loading="lazy"></div>' +
      '<div class="game-body"><h3>' + esc(g.title) + "</h3><p>" + esc(g.blurb) + "</p>" +
      '<p class="game-meta">' + extra + (best ? "<br>Your best: " + best.toLocaleString() : "") + "</p>" +
      '<button class="btn btn-main" type="button" data-game="' + g.id + '">Play</button>' +
      '<a class="game-link" href="/play/' + g.id + '" data-link="' + g.id + '">Copy link</a></div></article>';
  }
  function renderMenu() {
    if (!menuEl) return;
    menuEl.innerHTML = GAMES.map(cardHTML).join("");
    [].forEach.call(menuEl.querySelectorAll("[data-game]"), (b) => { b.onclick = () => open(b.getAttribute("data-game")); });
    [].forEach.call(menuEl.querySelectorAll("[data-link]"), (a) => { a.onclick = (e) => { e.preventDefault(); copyLink(a.getAttribute("data-link"), a); }; });
  }
  function renderTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = GAMES.filter((g) => g.board).map((g) =>
      '<button type="button" role="tab" class="tab' + (g.id === boardGame ? " on" : "") + '" aria-selected="' + (g.id === boardGame) + '" data-board="' + g.id + '">' + esc(g.title) + "</button>").join("");
    [].forEach.call(tabsEl.querySelectorAll("[data-board]"), (b) => {
      b.onclick = () => { boardGame = b.getAttribute("data-board"); renderTabs(); renderBoard(boardEl, boardGame, 10, store.get("headset-name")); };
    });
  }
  function refreshPage() {
    board.all().then((g) => { tops = g; renderMenu(); }).catch(() => renderMenu());
    renderBoard(boardEl, boardGame, 10, store.get("headset-name"));
  }

  function init() {
    menuEl = document.getElementById("arcade-grid");
    tabsEl = document.getElementById("board-tabs");
    boardEl = document.getElementById("game-board");
    renderMenu();
    renderTabs();
    refreshPage();
    const box = document.getElementById("player-box");
    if (box) {
      const name = store.get("headset-name");
      box.innerHTML = "<summary>Your player code" + (name ? " (" + esc(name) + ")" : "") + "</summary>" +
        "<p><small>The first time you put a name on a leaderboard, it's saved to this code, so nobody else can use your name. " +
        "To use your name on another device, copy the code there. Keep it secret, like a password.</small></p>" +
        '<p><button type="button" class="btn" data-pc="copy">Copy my code</button> <button type="button" class="btn" data-pc="use">Use a code from another device</button></p><p class="pc-msg"></p>';
      const msg = box.querySelector(".pc-msg");
      box.querySelector('[data-pc="copy"]').onclick = () => {
        const code = player.token();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => { msg.textContent = "Copied. Paste it on your other device."; }, () => window.prompt("Your player code:", code));
        else window.prompt("Your player code:", code);
      };
      box.querySelector('[data-pc="use"]').onclick = () => {
        const code = window.prompt("Paste your player code:");
        if (code === null) return;
        msg.textContent = player.use(code) ? "Done! Scores from this device now count for your name." : "That doesn't look like a player code.";
      };
    }
    window.onHeadsetHeroClose = () => { setPlayParam(null); refreshPage(); }; // DMCA Dodge (game.js) calls this when it closes
    [].forEach.call(document.querySelectorAll("[data-open-game]"), (b) => { b.onclick = () => open(b.getAttribute("data-open-game")); });
    // a direct link: open that game's start screen straight away
    let want = null;
    try { want = new URLSearchParams(location.search).get("play"); } catch (e) {}
    if (want && /^[a-z]{2,20}$/.test(want)) setTimeout(() => open(want), 0); // plug-in games may register a moment later
  }

  // ---------------------------------------------------------------- plug-in games
  // Extra games live in games/<id>.js and call GezArcade.register({...}). See docs/GAME-PLUGIN.md.
  function register(game) {
    if (!game || !game.id || byId[game.id] || typeof game.start !== "function") return;
    GAMES.push(game);
    byId[game.id] = game;
    IMPL[game.id] = (a) => game.start(a);
    if (menuEl) { renderMenu(); renderTabs(); }
    if (pendingOpen === game.id) { pendingOpen = null; open(game.id); }
  }

  window.GezArcade = { open, renderBoard, games: GAMES, linkFor, register };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
