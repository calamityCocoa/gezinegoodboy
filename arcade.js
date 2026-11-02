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

  // ---------------------------------------------------------------- the games
  const GAMES = [
    { id: "dodge", title: "DMCA Dodge", art: "images/headset/run0.png", board: true, unit: "points",
      blurb: "Catch notes and SmileBASIC tokens in her headset, dodge the DMCA letters. Lose and John Nintendo turns up with the bootstrap.bas." },
    { id: "clicker", title: "Headpat Clicker", art: "images/pat/2.png", board: false, unit: "headpats",
      blurb: "Pat gezine, buy upgrades, pat harder. Every pat you give by hand counts towards everyone's headpats." },
    { id: "typer", title: "Bootstrap Typer", art: "images/game/1.png", board: true, unit: "characters",
      blurb: "Type pepsipu's real bootstrap.bas as fast as you can. 60 seconds on the clock." },
    { id: "whack", title: "Whack-a-John", art: "images/arcade/john-head.png", board: true, unit: "bonks",
      blurb: "John Nintendo keeps popping out of gezine's hut. Bonk him. Do not bonk gezine." },
    { id: "match", title: "Pose Match", art: "images/headset/wave2.png", board: true, unit: "points",
      blurb: "Flip the cards and find gezine's matching poses. Faster and fewer mistakes scores more." },
    { id: "combo", title: "Combo Says", art: "images/headset/jump2.png", board: true, unit: "points",
      blurb: "Watch the button combo, then press it back. It gets one longer every round." },
  ];
  const byId = {};
  GAMES.forEach((g) => { byId[g.id] = g; });

  // ---------------------------------------------------------------- leaderboards
  const board = {
    async top(game) {
      const r = await fetch(API + "?game=" + game, { cache: "no-store" });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(b.top)) throw new Error(b.error || "offline");
      return b.top;
    },
    async all() {
      const r = await fetch(API + "?all=1", { cache: "no-store" });
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
        body: JSON.stringify({ run, name, score, device: DEV.id }),
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
  const CODE_URL = "https://gitlab.com/api/v4/projects/pepsipu%2Fns2jb/repository/files/bootstrap.bas/raw?ref=main";
  const PRACTICE = ['PRINT "GOOD BOY"', "VAR HEADPATS=0", "FOR I=1 TO 30:NEXT", 'IF DMCA THEN PRINT "RUN"', "VSYNC 1", "WAIT 60"];
  let codeLines = null;
  function loadCode() {
    if (!codeLines) codeLines = fetch(CODE_URL)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((t) => {
        const lines = t.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 6 && l.length <= 44 && l[0] !== "'");
        return lines.length > 20 ? { lines, real: true } : { lines: PRACTICE, real: false };
      })
      .catch(() => ({ lines: PRACTICE, real: false }));
    return codeLines;
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

  /* typer */
  .ty { width: 720px; text-align: center; }
  .ty-line { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 1.35em; background: #141a2b; color: #6b7390; padding: 16px; border-radius: 14px;
             text-align: left; word-break: break-all; min-height: 2.6em; }
  .ty-line .ok { color: #8bd17c; } .ty-line .bad { color: #fff; background: #c62828; border-radius: 3px; } .ty-line .cur { color: #fff; border-bottom: 2px solid #f06292; }
  .ty input { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 18px; width: 100%; box-sizing: border-box; margin-top: 12px; padding: 12px; border-radius: 12px; border: 2px solid #141a2b; }
  .ty-next { font-family: ui-monospace, Menlo, Consolas, monospace; color: #8a90a2; margin-top: 10px; font-size: .95em; text-align: left; word-break: break-all; }

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
      (g.board ? '<div class="ar-top"><p><small>Loading the leaderboard...</small></p></div>' : ""),
      [["Play", start, true], ["Back to the arcade", close]]);
    if (g.board) renderBoard(panel.querySelector(".ar-top"), g.id, 5, store.get("headset-name"));
  }

  function start() {
    stopGame();
    panel.hidden = true;
    stage.innerHTML = "";
    scoreEl.textContent = ""; statusEl.textContent = "";
    playing = true;
    runId = null;
    if (current.board) {
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
    const canSubmit = g.board && score > 0 && run;
    const name = store.get("headset-name") || "";
    showPanel(
      "<h2>" + esc(headline || "Game over") + "</h2>" +
      '<p class="big">' + score.toLocaleString() + "</p><p><small>" + esc(g.unit) + "</small></p>" +
      "<p>" + (newBest && score > 0 ? "New personal best!" : "Your best: " + Math.max(prev, score).toLocaleString()) + "</p>" +
      (canSubmit
        ? '<form class="ar-form" novalidate><label>Your name for the leaderboard' +
          '<input name="name" maxlength="16" autocomplete="nickname" autocapitalize="off" spellcheck="false" enterkeyhint="send" value="' + esc(name) + '"></label>' +
          '<button class="ar-btn main" type="submit">Submit score</button></form><p class="ar-msg"></p>'
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
        msg.textContent = res.rank ? "You're #" + res.rank + " on the leaderboard" + (res.best > score ? " (your best is " + res.best.toLocaleString() + ")" : "") + "!" : "Score sent!";
        panel.querySelector(".ar-top").innerHTML = boardHTML(res.top || [], 10, res.name || typed);
      } catch (err) {
        btn.disabled = false;
        msg.className = "ar-msg err";
        msg.textContent = err.message;
        if (/expired|already ended/.test(err.message)) form.parentNode.removeChild(form);
      }
    };
  }

  function open(id) {
    const g = byId[id];
    if (!g) return;
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
    const SECONDS = 60;
    a.stage.innerHTML = '<div class="ty"><div class="ty-line" aria-live="polite">Loading pepsipu\'s bootstrap.bas...</div>' +
      '<input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the line here">' +
      '<div class="ty-next"></div><p class="ty-src"><small></small></p></div>';
    const lineEl = a.stage.querySelector(".ty-line"), input = a.stage.querySelector("input"), nextEl = a.stage.querySelector(".ty-next"),
      src = a.stage.querySelector(".ty-src small");
    input.focus(); // focus now, while we're still inside the click, so phones show the keyboard
    input.onpaste = (e) => e.preventDefault();
    let lines = PRACTICE, idx = 0, target = "", best = 0, score = 0, typedOk = 0, left = SECONDS, started = false;
    loadCode().then((c) => {
      lines = c.lines;
      idx = Math.floor(Math.random() * lines.length);
      src.textContent = c.real ? "Lines from pepsipu's bootstrap.bas (ns2jb)." : "Practice lines (couldn't reach GitLab).";
      next();
    });
    function next() {
      target = lines[idx % lines.length]; idx++;
      best = 0; input.value = "";
      nextEl.textContent = "next: " + lines[idx % lines.length];
      draw();
    }
    function draw() {
      const v = input.value;
      let ok = 0;
      while (ok < v.length && ok < target.length && v[ok].toUpperCase() === target[ok].toUpperCase()) ok++;
      let html = "";
      for (let i = 0; i < target.length; i++) {
        const ch = esc(target[i]);
        if (i < ok) html += '<span class="ok">' + ch + "</span>";
        else if (i < v.length) html += '<span class="bad">' + ch + "</span>";
        else if (i === v.length) html += '<span class="cur">' + ch + "</span>";
        else html += ch;
      }
      lineEl.innerHTML = html;
      return ok;
    }
    input.oninput = () => {
      if (left <= 0 || !target) return;
      if (!started) { started = true; tick(); }
      const ok = draw();
      if (ok > best) { score += ok - best; typedOk += ok - best; best = ok; }
      if (ok === target.length) { score += 5; a.pop(a.stage.clientWidth / 2, 60, "+5 line!", "#2e7d32"); next(); }
      a.score(score + " pts");
    };
    function tick() {
      a.status(left + "s");
      a.every(1000, () => {
        left--;
        const elapsed = SECONDS - left;
        const wpm = Math.round((typedOk / 5) / (elapsed / 60));
        a.status(left + "s" + (elapsed >= 5 ? " · " + wpm + " wpm" : "")); // too jumpy to show before 5 seconds
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
      '<button class="btn btn-main" type="button" data-game="' + g.id + '">Play</button></div></article>';
  }
  function renderMenu() {
    if (!menuEl) return;
    menuEl.innerHTML = GAMES.map(cardHTML).join("");
    [].forEach.call(menuEl.querySelectorAll("[data-game]"), (b) => { b.onclick = () => open(b.getAttribute("data-game")); });
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
    window.onHeadsetHeroClose = refreshPage; // DMCA Dodge (game.js) calls this when it closes
    [].forEach.call(document.querySelectorAll("[data-open-game]"), (b) => { b.onclick = () => open(b.getAttribute("data-open-game")); });
  }

  window.GezArcade = { open, renderBoard, games: GAMES };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
