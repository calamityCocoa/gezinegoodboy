// DMCA Dodge: gezine's game (once called Headset Hero).
// gezine runs along the bottom catching music notes and SmileBASIC tokens in her
// headset while dodging John Nintendo's DMCA letters. When she runs out of hearts,
// the real lines of pepsipu's bootstrap.bas (fetched live from GitLab) rain down
// and bury her. Global leaderboard lives in api/scores.js.
// Opens from the play buttons on the page, or after 30 headpats / respects.
(function () {
  "use strict";

  // ---------------------------------------------------------------- data
  // feet position of every frame, in sprite pixels (art from the ASMR video)
  const ANCHORS = {
    run0: [195.7, 286.2], run1: [198.7, 286.2], run2: [209.7, 287.2], run3: [204.7, 287.2],
    jump0: [125.8, 254.0], jump1: [140.8, 289.0], jump2: [155.8, 323.0], jump3: [138.8, 270.0],
    trip0: [186.9, 280.6], trip1: [206.9, 270.6], trip2: [232.9, 262.6], trip3: [173.9, 238.6],
    wave0: [114.0, 312.0], wave1: [128.0, 312.0], wave2: [129.0, 312.0], wave3: [129.0, 312.0],
  };
  const SPRITE_H = 300; // standing height the sprites were exported at
  const FALLBACK_TOKENS = ["PRINT", "GOTO", "GOSUB", "DIM", "VAR", "FOR", "NEXT", "IF", "THEN", "WHILE",
    "WEND", "DEF", "CALL", "VSYNC", "WAIT", "LOCATE", "EXEC", "LOAD", "SPSET", "BGPUT"];
  const LOSE_LINES = [
    "John Nintendo got her.", "DMCA'd. Back to the hut.", "Buried in bootstrap.bas.",
    "gezine has been a bad boy (allegedly).", "The lawyers send their regards.", "Stack overflow. Literally.",
  ];
  const CODE_URL = "https://gitlab.com/api/v4/projects/pepsipu%2Fns2jb/repository/files/bootstrap.bas/raw?ref=main";
  const CODE_LINK = "https://gitlab.com/pepsipu/ns2jb/-/blob/main/bootstrap.bas";
  const API = "/api/scores";
  const DYING_TRIP = 1.1, BURY_SPAWN = 2.2, BURY_SETTLE = 0.8;
  // John Nintendo's frames (the same art as the tracker). They have gezine caught in them,
  // with her feet at JOHN_FEET (frame pixels) and her standing JOHN_GEZ_H pixels tall.
  const JOHN_W = 423, JOHN_H = 420, JOHN_FEET = [218, 410], JOHN_GEZ_H = 215;
  const JOHN_ENTER = [0.35, 0.7, 1.1, 1.4], JOHN_LOOP = [0.55, 0.9, 1.55, 1.85]; // cumulative seconds

  // ---------------------------------------------------------------- helpers
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const touchy = () => matchMedia("(pointer: coarse)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // roughly -1..1, bunched in the middle
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DEV = window.GEZ_DEVICE || {}; // from device.js
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

  // ---------------------------------------------------------------- assets
  const imgs = {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  // Blend weights survive interrupted frame changes without a visible snap.
  function blend(track, name, dt) {
    const a = 1 - Math.exp(-dt / 0.025);
    if (track[name] === undefined) track[name] = 0;
    Object.keys(track).forEach((key) => { track[key] += ((key === name ? 1 : 0) - track[key]) * a; if (track[key] < 0.001 && key !== name) delete track[key]; });
  }
  let spritesReady = null;
  function loadSprites() {
    if (!spritesReady) {
      const files = ["note", "star", "dmca", "token"].map((n) => ["item-" + n, "images/dodge/items/" + n + ".png"]).concat(Object.keys(ANCHORS).map((n) => [n, "images/headset/" + n + ".png"]));
      for (let i = 0; i < 4; i++) files.push(["jenter" + i, "images/john-enter/" + i + ".png"], ["jloop" + i, "images/john/" + i + ".png"]);
      spritesReady = Promise.all(files.map(([n, src]) => new Promise((ok) => {
        const im = new Image();
        im.onload = im.onerror = ok;
        im.src = src;
        imgs[n] = im;
      })));
    }
    return spritesReady;
  }

  // the real bootstrap.bas, straight from pepsipu's repo
  let codeLines = FALLBACK_TOKENS, tokens = FALLBACK_TOKENS, codeReal = false, codeReady = null;
  function loadCode() {
    if (!codeReady) {
      codeReady = fetch(CODE_URL)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
        .then((text) => {
          const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          if (lines.length < 10) return;
          codeLines = lines;
          codeReal = true;
          const words = new Set();
          for (const l of lines) {
            if (l.startsWith("'")) continue; // comments
            const re = /\b[A-Z][A-Z0-9_]{1,7}[#$%]?/g, plain = l.replace(/"[^"]*"/g, " ");
            let m;
            while ((m = re.exec(plain))) words.add(m[0]); // (no matchAll: the Switch 1 browser lacks it)
          }
          if (words.size >= 10) tokens = [...words];
        })
        .catch(() => {}); // the game still works with the built-in words
    }
    return codeReady;
  }

  // ---------------------------------------------------------------- leaderboard
  const board = {
    async top() {
      const r = await fetch(API);
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(b.top)) throw new Error(b.error || "offline");
      return b.top;
    },
    async start() {
      try {
        const r = await fetch(API + "?start=1", { method: "POST" });
        return r.ok ? (await r.json()).run || null : null;
      } catch (e) { return null; }
    },
    async submit(run, name, score) {
      const r = await fetch(API, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ run, name, score, device: DEV.id, token: window.GezPlayer ? window.GezPlayer.token() : "" }),
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

  // fills an element with the top scores (used in the game and on the page)
  async function renderBoard(el, n, mine) {
    if (!el) return;
    try {
      el.innerHTML = boardHTML(await board.top(), n || 10, mine);
    } catch (e) {
      el.innerHTML = "<p><small>The leaderboard is offline right now.</small></p>";
    }
  }

  // ---------------------------------------------------------------- DOM
  const css = `
  #hh { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 1000; background: rgba(255, 255, 255, .94); box-sizing: border-box;
        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        overscroll-behavior: contain; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent; }
  #hh[hidden] { display: none; }
  #hh canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  .hh-corner { position: absolute; top: calc(env(safe-area-inset-top) + 10px); width: 44px; height: 44px; border-radius: 50%;
               border: 1px solid #111; background: #fff; color: #111; font: 18px/1 Georgia, serif; cursor: pointer; padding: 0; transition: transform .14s ease, background .14s ease; }
  #hh-exit { right: calc(env(safe-area-inset-right) + 10px); }
  #hh-pause { right: calc(env(safe-area-inset-right) + 62px); }
  #hh-pause[hidden] { display: none; }
  #hh-pause i { display: inline-block; width: 4px; height: 14px; margin: 0 2px; background: #111; vertical-align: middle; }
  #hh-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 420px);
              box-sizing: border-box; max-height: 88%; overflow-y: auto; -webkit-overflow-scrolling: touch;
              background: #fff; border: 1px solid #111; border-radius: 14px; padding: 18px 20px; text-align: center;
              box-shadow: 0 6px 30px rgba(0, 0, 0, .18); font: 17px/1.45 Georgia, "Times New Roman", serif; color: #111;
              -webkit-user-select: text; user-select: text; }
  #hh-panel[hidden] { display: none; }
  #hh-panel h2 { margin: 0 0 6px; font-size: 1.5em; line-height: 1.2; }
  #hh-panel p { margin: 8px 0; }
  #hh-panel .big { font-size: 2.2em; font-weight: bold; margin: 0; line-height: 1.1; }
  #hh-panel button { font: inherit; min-height: 44px; padding: 8px 18px; margin: 6px 4px 0; border-radius: 999px;
                     border: 1px solid #111; background: #fff; color: #111; cursor: pointer; transition: transform .14s ease; }
  .hh-corner:hover, #hh-panel button:hover { transform: scale(1.04); }
  .hh-corner:active, #hh-panel button:active { transform: scale(.96); }
  #hh-panel button.main { background: #111; color: #fff; }
  #hh-panel form { margin: 10px 0 4px; }
  #hh-panel input { font: inherit; font-size: 16px; /* 16px stops iOS zooming in */ width: 100%; box-sizing: border-box;
                    min-height: 44px; padding: 8px 12px; border: 1px solid #111; border-radius: 10px; margin-top: 4px; }
  #hh-panel .msg { min-height: 1.4em; font-size: .9em; }
  #hh-panel .msg.err { color: #c62828; }
  #hh-panel a { color: inherit; }
  .hh-board { width: 100%; border-collapse: collapse; margin: 8px 0 4px; font-size: .92em; }
  .hh-board th, .hh-board td { border: 1px solid #999; padding: 3px 8px; text-align: left; }
  .hh-board td:first-child, .hh-board th:first-child { width: 2em; text-align: right; }
  .hh-board td:last-child, .hh-board th:last-child { text-align: right; }
  .hh-board td:nth-child(2) { overflow-wrap: anywhere; }
  .hh-board tr.me { background: #ffe8f0; font-weight: bold; }
  .hh-dev { font-weight: normal; color: #777; white-space: nowrap; }
  `;
  let root, canvas, ctx, panel, exitBtn, pauseBtn, lastFocus;

  function build() {
    if (root) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
    root = document.createElement("div");
    root.id = "hh";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "DMCA Dodge, gezine's game");
    root.innerHTML = '<canvas aria-hidden="true"></canvas>' +
      '<button id="hh-pause" class="hh-corner" type="button" aria-label="Pause" hidden><i></i><i></i></button>' +
      '<button id="hh-exit" class="hh-corner" type="button" aria-label="Leave the game">✕</button>' +
      '<div id="hh-panel" aria-live="polite"></div>';
    document.body.append(root);
    canvas = root.querySelector("canvas");
    ctx = canvas.getContext("2d");
    panel = root.querySelector("#hh-panel");
    panel.style.opacity = "0";
    exitBtn = root.querySelector("#hh-exit");
    pauseBtn = root.querySelector("#hh-pause");
    exitBtn.onclick = close;
    pauseBtn.onclick = pause;

    // she runs to wherever you point; tap or drag on touch screens
    const xOf = (e) => {
      const t = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
      return t.clientX - canvas.getBoundingClientRect().left;
    };
    const down = (e) => {
      if (state === "dying") { skipBury(); return; }
      pointerX = xOf(e); pointerDown = true; padActive = false;
      if (e.pointerId !== undefined && state === "play") try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    };
    const move = (e, mouse) => { if (pointerDown || mouse) { pointerX = xOf(e); padActive = false; } };
    const up = () => { pointerDown = false; };
    if (window.PointerEvent) {
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", (e) => move(e, e.pointerType === "mouse"));
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
    } else { // older browsers, including the Switch 1's
      canvas.addEventListener("mousedown", down);
      canvas.addEventListener("mousemove", (e) => move(e, true));
      addEventListener("mouseup", up);
      canvas.addEventListener("touchstart", (e) => { e.preventDefault(); down(e); }, { passive: false });
      canvas.addEventListener("touchmove", (e) => { e.preventDefault(); move(e, false); }, { passive: false });
      canvas.addEventListener("touchend", up);
      canvas.addEventListener("touchcancel", up);
    }
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    addEventListener("resize", resize);
    if (window.visualViewport) visualViewport.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
    addEventListener("blur", pause);
  }

  // ---------------------------------------------------------------- keyboard
  const keys = { left: false, right: false };
  function onKey(e) {
    if (!root || root.hidden) return;
    const down = e.type === "keydown";
    const k = e.key;
    const typing = e.target && e.target.tagName === "INPUT";
    if (typing && k !== "Escape") return; // typing a leaderboard name
    if (state === "dying" && down && !e.repeat) { e.preventDefault(); skipBury(); return; }
    if (k === "ArrowLeft" || k === "a" || k === "A") { keys.left = down; pointerX = null; e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d" || k === "D") { keys.right = down; pointerX = null; e.preventDefault(); }
    else if (down && k === "Escape") { e.preventDefault(); if (state === "play") pause(); else close(); }
    else if (down && (k === "p" || k === "P")) { if (state === "play") pause(); else if (state === "paused") resume(); }
    else if (down && k === "Tab") { // keep focus inside the game
      const f = [...root.querySelectorAll("button, input")].filter((b) => b.offsetParent);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKey);

  // ---------------------------------------------------------------- controllers
  // Any standard gamepad (Xbox, PlayStation, Switch Pro, Steam Deck): stick or D-pad to run,
  // A to start / pick, B to leave, Start to pause; D-pad moves between menu buttons.
  let padPrev = [];
  function pollPad() {
    if (!root || root.hidden) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    let p = null;
    if (pads) for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected !== false) { p = pads[i]; break; }
    if (p) {
      const held = (i) => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
      const pressed = (i) => held(i) && !padPrev[i];
      let x = Math.abs(p.axes[0] || 0) > 0.25 ? p.axes[0] : 0;
      if (held(14)) x = -1;
      if (held(15)) x = 1;
      if (x !== 0) { padActive = true; pointerX = null; }
      padX = x;
      if (state === "dying") { if (pressed(0) || pressed(1)) skipBury(); }
      else if (state === "play") { if (pressed(9)) pause(); }
      else if (!panel.hidden) {
        const btns = [].slice.call(panel.querySelectorAll("button")).filter((b) => b.offsetParent && !b.disabled);
        let i = btns.indexOf(document.activeElement);
        if (btns.length && (pressed(15) || pressed(13))) btns[(i + 1) % btns.length].focus();
        else if (btns.length && (pressed(14) || pressed(12))) btns[(i - 1 + btns.length) % btns.length].focus();
        else if (pressed(9) && state === "paused") resume();
        else if (pressed(0) && btns.length) (btns[i] || btns[0]).click();
        else if (pressed(1)) close();
      }
      padPrev = [].map.call(p.buttons, (b) => b.pressed || b.value > 0.5);
    }
  }

  // ---------------------------------------------------------------- sizing
  let W = 0, H = 0, dpr = 1, gh = 150, ground = 0;
  function resize() {
    if (!root || root.hidden) return;
    const r = canvas.getBoundingClientRect();
    const oldW = W, oldGround = ground;
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gh = clamp(Math.min(H * 0.22, W * 0.32), 90, 200);
    ground = H - Math.max(18, H * 0.05);
    if (oldW && g) g.x = g.x / oldW * W;
    if (bury && oldW) { // keep the pile on the floor
      const dy = ground - oldGround;
      for (const l of bury.lines) { l.x = l.x / oldW * W; l.y += dy; }
      bury.heights = null;
    }
    if (state !== "play" && state !== "dying") draw();
  }

  // ---------------------------------------------------------------- game state
  let state = "closed", raf = 0, last = 0, T = 0, spawnIn = 0, runId = null, runPromise = null;
  let g = null, items = [], pops = [], score = 0, lives = 3, combo = 0, best = 0, overIn = 0, bury = null, johnT = -1;
  let shownScore = 0, shownBest = 0, shownMult = 1, lean = 0, catchSquash = 0, catchVelocity = 0, gezBlend = {}, johnBlend = {}, johnAlpha = 0;
  let panelOpacity = 0, panelTarget = 0;
  let pointerX = null, pointerDown = false, padActive = false, padX = 0;

  function reset() {
    g = { x: W / 2, vx: 0, dir: 1, stun: 0, jump: 0, anim: 0, dead: false };
    items = []; pops = []; bury = null; johnT = -1;
    shownScore = 0; shownBest = best; shownMult = 1; lean = 0; catchSquash = 0; catchVelocity = 0; gezBlend = {}; johnBlend = {}; johnAlpha = 0;
    score = 0; lives = 3; combo = 0; T = 0; spawnIn = 0.6; overIn = 0;
    pointerX = null; pointerDown = false; keys.left = keys.right = false; padX = 0;
  }

  function spawn() {
    const d = Math.min(T / 150, 1); // gets harder over ~2.5 minutes
    const r = Math.random();
    let kind;
    if (r < 0.18 + 0.17 * d) kind = "dmca";
    else if (r < 0.21 + 0.17 * d) kind = "star";
    else if (r < 0.5 + 0.1 * d) kind = "token";
    else kind = "note";
    const size = gh * (kind === "token" ? 0.13 : kind === "dmca" ? 0.2 : 0.17);
    const text = kind === "token" ? tokens[Math.floor(Math.random() * tokens.length)] : "";
    ctx.font = "bold " + Math.round(size) + "px " + MONO;
    const half = kind === "token" ? ctx.measureText(text).width / 2 + size * 0.6 : size;
    items.push({
      kind, text, size, half, age: 0, fade: 1, phase: rand(0, Math.PI * 2),
      x: rand(half + 8, Math.max(half + 9, W - half - 8)), y: -size * 2,
      vy: H * (0.26 + 0.5 * d) * rand(0.85, 1.15) * (kind === "star" ? 1.25 : 1),
      rot: rand(-0.3, 0.3), vr: rand(-1.2, 1.2), hue: Math.random() < 0.5 ? "#7fb8f0" : "#f29bb0",
    });
    spawnIn = (0.85 - 0.5 * d) * rand(0.7, 1.3);
  }

  function pop(x, y, text, color) { pops.push({ x, y, text, color, t: 0 }); }

  function update(dt) {
    T += dt;
    items.forEach((it) => { it.age += dt; if (it.hit) it.fade = Math.max(0, it.fade - dt / 0.12); });
    g.anim += dt;
    g.stun = Math.max(0, g.stun - dt);
    g.jump = Math.max(0, g.jump - dt);
    for (const p of pops) { p.t += dt; p.y -= 40 * dt; }
    pops = pops.filter((p) => p.t < 0.9);

    if (state === "dying") {
      for (const it of items) { it.y += it.vy * dt; it.rot += it.vr * dt; }
      items = items.filter((it) => it.y < H + it.size * 3);
      if (overIn > 0) { // she trips first...
        if ((overIn -= dt) <= 0) {
          johnT = 0; // ...then John Nintendo rises up behind her
          pop(g.x, ground - gh * 1.75, "John Nintendo has entered the chat", "#c62828");
          if (navigator.vibrate) navigator.vibrate([60, 60, 60, 60, 200]);
        }
      } else if (johnT < JOHN_ENTER[3]) {
        johnT += dt;
        if (johnT >= JOHN_ENTER[3]) startBury(); // ...and the bootstrap.bas rains down on both of them
      } else {
        johnT += dt;
        updateBury(dt);
      }
      return;
    }

    spawnIn -= dt;
    if (spawnIn <= 0) spawn();

    // movement
    const maxV = clamp(W * 0.95, 380, 950);
    let want = 0;
    if (g.stun > 0) want = 0;
    else if (keys.left !== keys.right) want = keys.left ? -maxV : maxV;
    else if (padActive && Math.abs(padX) > 0.2) want = padX * maxV;
    else if (pointerX !== null) want = clamp((pointerX - g.x) * 9, -maxV, maxV);
    g.vx += (want - g.vx) * Math.min(1, dt * 14);
    if (Math.abs(want) < 1 && Math.abs(g.vx) < 25) g.vx = 0;
    g.x = clamp(g.x + g.vx * dt, gh * 0.35, W - gh * 0.35);
    if (Math.abs(g.vx) > 30) g.dir = g.vx < 0 ? -1 : 1;

    // her headset is the catcher
    const hx = g.x, hy = ground - gh * 0.72, hr = gh * 0.42;
    for (const it of items) {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (it.hit) continue;
      const dx = Math.max(0, Math.abs(it.x - hx) - (it.half - it.size)), dy = it.y - hy;
      if (dx * dx + dy * dy >= (hr + it.size * 0.8) ** 2) continue;
      if (it.kind === "dmca") {
        if (g.stun > 0) continue; // already down, can't be hit twice
        it.hit = true;
        lives--; combo = 0; g.stun = DYING_TRIP; g.jump = 0; g.vx = 0;
        pop(it.x, it.y, lives > 0 ? "DMCA'd!" : "DMCA'd for good", "#c62828");
        if (navigator.vibrate) navigator.vibrate(lives > 0 ? 120 : [120, 80, 250]);
        if (lives <= 0) die();
      } else if (g.stun <= 0) {
        it.hit = true;
        catchVelocity += 18;
        combo++;
        const mult = Math.min(5, 1 + Math.floor(combo / 10));
        const pts = (it.kind === "note" ? 1 : it.kind === "token" ? 3 : 10) * mult;
        score += pts;
        if (it.kind === "star") g.jump = 0.6;
        pop(it.x, it.y, "+" + pts + (it.kind === "token" ? " " + it.text : ""), it.kind === "star" ? "#b8860b" : "#141a2b");
      }
    }
    items = items.filter((it) => it.fade > 0 && it.y < H + it.size * 3);
  }

  // ---------------------------------------------------------------- the burial
  // When she's out of hearts, bootstrap.bas falls on her line by line and piles up.
  function die() {
    state = "dying";
    pauseBtn.hidden = true;
    g.dead = true;
    overIn = DYING_TRIP; // let the trip animation play first
  }

  const COL = 4; // heightmap column width in px
  function floorHeights() {
    const cols = Math.ceil(W / COL) + 1;
    const h = new Float32Array(cols).fill(ground);
    // the lines pile up from the floor and cover her (they're drawn in front of her)
    for (const l of bury.lines) if (l.landed) for (let c = Math.floor(l.x / COL); c <= Math.floor((l.x + l.w) / COL); c++)
      if (c >= 0 && c < cols) h[c] = Math.min(h[c], l.y);
    return h;
  }

  function startBury() {
    const fs = Math.round(clamp(gh * 0.085, 11, 15));
    bury = { t: 0, spawnIn: 0, idx: Math.floor(Math.random() * codeLines.length), fs, lines: [], heights: null, done: false };
  }

  function addLine() {
    const fs = bury.fs, padX = fs * 0.55, h = Math.round(fs * 1.65);
    ctx.font = fs + "px " + MONO;
    let text = codeLines[bury.idx++ % codeLines.length];
    const maxW = Math.min(W * 0.8, 560) - padX * 2;
    if (ctx.measureText(text).width > maxW) {
      while (text.length > 4 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
      text += "…";
    }
    const w = ctx.measureText(text).width + padX * 2;
    const x = clamp(g.x - w / 2 + gauss() * Math.max(gh * 0.8, W * 0.22), 4, Math.max(4, W - w - 4));
    bury.lines.push({ text, x, y: -h - rand(0, 40), w, h, vy: rand(0, 120), rot: rand(-0.05, 0.05), comment: text.startsWith("'"), landed: false });
  }

  function updateBury(dt) {
    if (!bury) return;
    bury.t += dt;
    if (!bury.heights) bury.heights = floorHeights();
    const hts = bury.heights;
    // keep dropping lines until she's buried (or time runs out)
    if (bury.t < BURY_SPAWN && !buried(hts)) {
      bury.spawnIn -= dt;
      while (bury.spawnIn <= 0) { addLine(); bury.spawnIn += 0.1; }
    } else bury.t = Math.max(bury.t, BURY_SPAWN);
    let falling = 0;
    for (const l of bury.lines) {
      if (l.landed) continue;
      l.vy += 2200 * dt;
      l.y += l.vy * dt;
      let floor = ground;
      const c0 = Math.max(0, Math.floor(l.x / COL)), c1 = Math.min(hts.length - 1, Math.floor((l.x + l.w) / COL));
      for (let c = c0; c <= c1; c++) floor = Math.min(floor, hts[c]);
      if (l.y + l.h >= floor) {
        l.y = floor - l.h;
        l.landed = true;
        l.rot *= 0.4;
        for (let c = c0; c <= c1; c++) hts[c] = l.y;
      } else falling++;
    }
    if (bury.t >= BURY_SPAWN + BURY_SETTLE && !falling && !bury.done) {
      bury.done = true;
      gameOver();
    }
  }

  // buried = the pile over her is taller than she is
  function buried(hts) {
    const c0 = Math.max(0, Math.floor((g.x - gh * 0.3) / COL)), c1 = Math.min(hts.length - 1, Math.floor((g.x + gh * 0.3) / COL));
    for (let c = c0; c <= c1; c++) if (hts[c] > ground - gh * 0.6) return false; // lines still falling top it up to about her head, so John's grin stays visible
    return true;
  }

  function skipBury() {
    if (state !== "dying") return;
    overIn = 0;
    if (johnT < JOHN_ENTER[3]) johnT = JOHN_ENTER[3];
    if (!bury) startBury();
    // drop everything that's left straight onto the pile
    for (let i = 0; i < 2000 && !bury.done; i++) updateBury(1 / 30);
    if (!bury.done) { bury.done = true; gameOver(); }
  }

  // ---------------------------------------------------------------- drawing
  function frame() {
    if (g.dead) return "trip" + (g.stun > 0 ? Math.min(3, Math.floor((DYING_TRIP - g.stun) / DYING_TRIP * 4)) : 3);
    if (g.stun > 0) return "trip" + Math.min(3, Math.floor((DYING_TRIP - g.stun) / DYING_TRIP * 4));
    if (g.jump > 0) return "jump" + Math.min(3, Math.floor((0.6 - g.jump) / 0.6 * 4));
    if (Math.abs(g.vx) > 40) return "run" + (Math.floor(g.anim * 11) % 4);
    return "wave" + [3, 3, 3, 3, 3, 1, 2, 2, 1, 3][Math.floor(g.anim * 4) % 10];
  }

  function johnFrame() {
    if (johnT < JOHN_ENTER[3]) { let i = 0; while (i < 3 && johnT >= JOHN_ENTER[i]) i++; return "jenter" + i; }
    const t = (johnT - JOHN_ENTER[3]) % JOHN_LOOP[3];
    let i = 0; while (i < 3 && t >= JOHN_LOOP[i]) i++;
    return "jloop" + i;
  }

  function drawJohn() {
    const k = gh / JOHN_GEZ_H;
    let ready = false;
    Object.keys(johnBlend).forEach((name) => {
      const im = imgs[name];
      if (!im || !im.complete || !im.naturalWidth) return;
      ready = true; ctx.save(); ctx.globalAlpha = johnBlend[name] * johnAlpha;
      ctx.translate(g.x, ground); ctx.scale(1, 1 + Math.sin(g.anim * 3) * (reduced ? .002 : .006)); ctx.translate(-g.x, -ground);
      ctx.drawImage(im, g.x - JOHN_FEET[0] * k, ground - JOHN_FEET[1] * k, JOHN_W * k, JOHN_H * k);
      ctx.restore();
    });
    return ready;
  }

  function drawGezine() {
    const s = gh / SPRITE_H, amount = reduced ? 0.3 : 1;
    ctx.fillStyle = "rgba(0, 0, 0, .12)";
    ctx.beginPath(); ctx.ellipse(g.x, ground + 3, gh * 0.32, gh * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    const bob = Math.sin(g.anim * 11 * Math.PI / 2) * Math.min(1, Math.abs(g.vx) / 300) * gh * 0.018 * amount;
    Object.keys(gezBlend).forEach((name) => {
      const im = imgs[name.split(":")[0]];
      if (!im || !im.complete || !im.naturalWidth) return;
      const pose = name.split(":")[0], anchor = ANCHORS[pose], flip = name.split(":")[1] === "-1" && !pose.startsWith("wave");
      const jumpStretch = g.jump > 0 ? Math.sin((0.6 - g.jump) / 0.6 * Math.PI * 2) * 0.045 : 0;
      const squash = (catchSquash * 0.12 - jumpStretch) * amount;
      ctx.save(); ctx.globalAlpha = gezBlend[name] * (1 - johnAlpha);
      if (g.stun > 0 && !g.dead) ctx.globalAlpha *= 0.8 + 0.2 * Math.cos(g.stun * 25);
      ctx.translate(g.x, ground + bob);
      ctx.rotate(lean * 0.1 * amount + (g.stun > 0 ? Math.sin(g.anim * 32) * Math.min(1, g.stun * 3) * 0.06 * amount : 0));
      ctx.scale((flip ? -1 : 1) * (1 + squash), 1 - squash + Math.sin(g.anim * 3) * 0.015 * amount);
      ctx.drawImage(im, -anchor[0] * s, -anchor[1] * s, im.naturalWidth * s, im.naturalHeight * s);
      ctx.restore();
    });
    if (johnT >= 0) drawJohn();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawItem(it) {
    const s = it.size;
    ctx.save();
    ctx.translate(it.x + Math.sin(it.age * 2.3 + it.phase) * s * (reduced ? 0.04 : 0.18), it.y);
    const arrival = ease(it.age / 0.16);
    ctx.globalAlpha = arrival * it.fade;
    ctx.scale(0.8 + 0.2 * arrival, 0.8 + 0.2 * arrival);
    ctx.rotate(Math.sin(it.age * 2 + it.phase) * (reduced ? 0.035 : 0.16));
    const im = imgs["item-" + it.kind];
    if (im && im.complete && im.naturalWidth) {
      const w = it.kind === "token" ? Math.max(it.half * 2, s * 2.6) : s * 2.2;
      const h = w * im.naturalHeight / im.naturalWidth;
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      if (it.kind === "token") {
        // Cover the baked-in VAR inside the pink bubble, preserving its outline/tail.
        ctx.fillStyle = "#fda9c1";
        roundRect(-w * 0.37, -h * 0.29, w * 0.74, h * 0.46, h * 0.08); ctx.fill();
        ctx.fillStyle = "#141a2b"; ctx.font = "bold " + Math.round(s) + "px " + MONO;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(it.text, 0, -h * 0.06, w * 0.73);
      }
      ctx.restore(); return;
    }
    ctx.lineWidth = Math.max(1.5, s * 0.1);
    ctx.strokeStyle = "#141a2b";
    if (it.kind === "note") {
      ctx.rotate(it.rot * 0.5);
      ctx.fillStyle = it.hue;
      ctx.beginPath(); ctx.ellipse(-s * 0.25, s * 0.45, s * 0.42, s * 0.32, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.13, s * 0.4); ctx.lineTo(s * 0.13, -s * 0.85);
      ctx.quadraticCurveTo(s * 0.75, -s * 0.5, s * 0.55, s * 0.05); ctx.stroke();
    } else if (it.kind === "token") {
      const w = it.half * 2, h = s * 1.8;
      roundRect(-w / 2, -h / 2, w, h, h / 2);
      ctx.fillStyle = "#141a2b"; ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.round(s) + "px " + MONO;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(it.text, 0, s * 0.05);
    } else if (it.kind === "star") {
      ctx.rotate(it.rot);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.48 : s * 1.1;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = "#ffcc33"; ctx.fill(); ctx.stroke();
    } else { // DMCA letter
      ctx.rotate(it.rot * 0.6);
      const w = s * 2.2, h = s * 1.45;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, h * 0.08); ctx.lineTo(w / 2, -h / 2); ctx.stroke();
      ctx.fillStyle = "#c62828";
      ctx.beginPath(); ctx.arc(0, h * 0.1, s * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.font = "bold " + Math.round(s * 0.55) + "px Georgia, serif";
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("DMCA", 0, h / 2 - s * 0.12);
    }
    ctx.restore();
  }

  function drawCodeLine(l) {
    const fs = bury.fs;
    ctx.save();
    ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
    ctx.rotate(l.rot);
    roundRect(-l.w / 2, -l.h / 2, l.w, l.h, 4);
    ctx.fillStyle = "#141a2b"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = fs + "px " + MONO;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = l.comment ? "#8bd17c" : "#e8ecf8";
    ctx.fillText(l.text, -l.w / 2 + fs * 0.55, 1);
    ctx.restore();
  }

  function heart(x, y, r, full) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    ctx.fillStyle = full ? "#f06292" : "rgba(0,0,0,.12)";
    ctx.fill();
  }

  function draw() {
    if (!ctx || !g) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(20, 26, 43, .25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ground + 0.5); ctx.lineTo(W, ground + 0.5); ctx.stroke();

    for (const it of items) drawItem(it);
    drawGezine();
    if (bury) for (const l of bury.lines) drawCodeLine(l);

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const p of pops) {
      ctx.globalAlpha = 1 - p.t / 0.9;
      ctx.fillStyle = p.color;
      ctx.font = "bold " + Math.round(gh * 0.13) + "px Georgia, serif";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // HUD: score top left, hearts top middle (the buttons are top right)
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#111";
    ctx.font = "bold 26px Georgia, serif";
    ctx.fillText(Math.round(shownScore).toLocaleString(), 14, 14);
    const mult = Math.min(5, 1 + Math.floor(combo / 10));
    ctx.font = "15px Georgia, serif";
    ctx.fillText(mult > 1 ? "combo x" + shownMult.toFixed(1).replace(/\.0$/, "") : "best " + Math.round(shownBest).toLocaleString(), 14, 46);
    const narrow = W < 480; // phones: hearts under the score, clear of the buttons
    for (let i = 0; i < 3; i++) heart((narrow ? 24 : W / 2 - 30) + i * 30, narrow ? 84 : 34, 10, i < lives);

    if (bury && codeReal) {
      ctx.textAlign = "center"; ctx.fillStyle = "#555"; ctx.font = "italic 14px Georgia, serif";
      ctx.fillText("bootstrap.bas by pepsipu", W / 2, 70);
    }
  }

  function loop(now) {
    raf = 0;
    if (!root || root.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    pollPad();
    if (state === "play" || state === "dying") update(dt);
    else if (g) g.anim += dt;
    if (g) {
      const a = 1 - Math.exp(-dt * 18);
      shownScore += (score - shownScore) * a;
      shownBest += (best - shownBest) * a;
      shownMult += (Math.min(5, 1 + Math.floor(combo / 10)) - shownMult) * a;
      lean += (g.vx / 650 - lean) * (1 - Math.exp(-dt * 10));
      const steps = Math.max(1, Math.ceil(dt / 0.008)), step = dt / steps;
      for (let i = 0; i < steps; i++) {
        catchVelocity += (-catchSquash * 300 - catchVelocity * 22) * step;
        catchSquash += catchVelocity * step;
      }
      blend(gezBlend, frame() + ":" + g.dir, dt);
      if (johnT >= 0) blend(johnBlend, johnFrame(), dt);
      const im = johnT >= 0 ? imgs[johnFrame()] : null;
      johnAlpha += ((im && im.complete && im.naturalWidth ? 1 : 0) - johnAlpha) * a;
    }
    panelOpacity += (panelTarget - panelOpacity) * (1 - Math.exp(-dt * 26));
    panel.style.opacity = String(panelOpacity);
    panel.style.transform = "translate(-50%, -50%) translateY(" + ((1 - panelOpacity) * (reduced ? 3 : 12)) + "px) scale(" + (0.98 + panelOpacity * 0.02) + ")";
    if (!panelTarget && panelOpacity < 0.005) panel.hidden = true;
    draw();
    if (root && !root.hidden && !raf) raf = requestAnimationFrame(loop);
  }
  function run() { last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); }

  // ---------------------------------------------------------------- screens
  function showPanel(html, buttons, focusSel) {
    panel.innerHTML = html;
    const row = document.createElement("div");
    for (const [label, fn, main] of buttons) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; if (main) b.className = "main";
      b.onclick = fn;
      row.append(b);
    }
    panel.append(row);
    panel.hidden = false; panelTarget = 1; panel.style.pointerEvents = "";
    panel.scrollTop = 0;
    const f = (focusSel && panel.querySelector(focusSel)) || row.querySelector("button");
    if (f) f.focus({ preventScroll: true });
  }

  function controlsText() {
    const pad = navigator.getGamepads && [].slice.call(navigator.getGamepads() || []).some((p) => p);
    if (pad) return "Controller: stick or D-pad to run, A to start, Start to pause.";
    if (DEV.controls && (DEV.nintendo || DEV.tv || DEV.family === "playstation" || DEV.id === "steamdeck" || DEV.car)) return DEV.controls;
    return touchy()
      ? "Drag, or tap where you want her to run."
      : "Move the mouse, or use ← → (or A and D). P pauses, Esc leaves.";
  }

  function title(reason) {
    state = "title";
    pauseBtn.hidden = true;
    reset(); draw();
    showPanel(
      "<h2>DMCA Dodge</h2>" +
      (reason === "pats" ? "<p>You gave gezine so many headpats she put her headset on.</p>" : "") +
      (DEV.car ? "<p><b>Parked only, please.</b></p>" : "") +
      "<p>Catch ♪ notes, SmileBASIC tokens and ★ stars in her headset. Dodge John Nintendo's DMCA letters. Three strikes and the bootstrap buries her.</p>" +
      "<p><small>" + controlsText() + "</small></p>" +
      '<div id="hh-top"><p><small>Loading the leaderboard...</small></p></div>',
      [["Play", start, true], ["Back to the website", close]]);
    renderBoard(panel.querySelector("#hh-top"), 5, store.get("headset-name"));
  }

  function start() {
    reset();
    panelTarget = 0; panel.style.pointerEvents = "none";
    pauseBtn.hidden = false;
    state = "play";
    runId = null;
    const p = (runPromise = board.start());
    p.then((id) => { if (runPromise === p) runId = id; });
    run();
  }

  function pause() {
    if (state !== "play") return;
    state = "paused";
    pauseBtn.hidden = true;
    keys.left = keys.right = false; pointerDown = false;
    showPanel("<h2>Paused</h2><p>Score: " + score.toLocaleString() + "</p>", [["Keep going", resume, true], ["Back to the website", close]]);
  }

  function resume() {
    if (state !== "paused") return;
    panelTarget = 0; panel.style.pointerEvents = "none";
    pauseBtn.hidden = false;
    state = "play";
    run();
  }

  async function gameOver() {
    state = "over";
    pauseBtn.hidden = true;
    const newBest = score > best;
    if (newBest) { best = score; store.set("headset-best", String(best)); }
    draw();
    if (runPromise) await Promise.race([runPromise, new Promise((ok) => setTimeout(ok, 1500))]);
    const run = runId;
    const canSubmit = score > 0 && run;
    const name = store.get("headset-name") || "";
    showPanel(
      "<h2>" + LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)] + "</h2>" +
      '<p class="big">' + score.toLocaleString() + "</p>" +
      "<p>" + (newBest && score > 0 ? "New personal best!" : "Your best: " + best.toLocaleString()) + "</p>" +
      (canSubmit
        ? '<form id="hh-form" novalidate><label>Your name for the leaderboard' +
          '<input id="hh-name" name="name" maxlength="16" autocomplete="nickname" autocapitalize="off" spellcheck="false" enterkeyhint="send" value="' + esc(name) + '"></label>' +
          '<button class="main" type="submit">Submit score</button></form><p class="msg" id="hh-msg"></p>'
        : score > 0 ? "<p><small>The leaderboard is offline right now, so this score is only saved on this device.</small></p>" : "") +
      '<div id="hh-top"></div>' +
      (codeReal ? '<p><small>The code that buried her is <a href="' + CODE_LINK + '" target="_blank" rel="noopener">pepsipu\'s bootstrap.bas</a>.</small></p>' : ""),
      [["Play again", start, !canSubmit], ["Back to the website", close]],
      canSubmit ? (name || touchy() ? "#hh-form button" : "#hh-name") : null);
    renderBoard(panel.querySelector("#hh-top"), 10, name);

    const form = panel.querySelector("#hh-form");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const input = form.querySelector("input"), btn = form.querySelector("button"), msg = panel.querySelector("#hh-msg");
      const typed = input.value.trim();
      if (!typed) { msg.className = "msg err"; msg.textContent = "Type a name first"; input.focus(); return; }
      btn.disabled = true; msg.className = "msg"; msg.textContent = "Sending...";
      try {
        const res = await board.submit(run, typed, score);
        store.set("headset-name", res.name || typed);
        form.remove();
        msg.textContent = res.rank ? "You're #" + res.rank + " on the leaderboard" + (res.best > score ? " (your best is " + res.best.toLocaleString() + ")" : "") + "!" : "Score sent!";
        panel.querySelector("#hh-top").innerHTML = boardHTML(res.top || [], 10, res.name || typed);
        const next = panel.querySelector("button.main, button");
        if (next) next.focus({ preventScroll: true });
      } catch (err) {
        btn.disabled = false;
        msg.className = "msg err";
        msg.textContent = err.message;
        if (/expired|already ended/.test(err.message)) form.remove();
      }
    };
  }

  // ---------------------------------------------------------------- open / close
  async function open(reason) {
    build();
    if (!root.hidden) return;
    lastFocus = document.activeElement;
    best = Number(store.get("headset-best")) || 0;
    store.set("headset-unlocked", "1");
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    padPrev = [];
    state = "loading";
    W = 0; resize();
    reset(); run();
    showPanel("<h2>DMCA Dodge</h2><p>Putting her headset on...</p>", []);
    await Promise.all([loadSprites(), Promise.race([loadCode(), new Promise((ok) => setTimeout(ok, 2500))])]);
    if (!root.hidden) title(reason);
  }

  function close() {
    if (!root || root.hidden) return;
    state = "closed";
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    root.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (typeof window.onHeadsetHeroClose === "function") window.onHeadsetHeroClose();
  }

  window.HeadsetHero = {
    open, close, renderBoard,
    preload() { loadSprites(); loadCode(); },
    unlocked: () => store.get("headset-unlocked") === "1",
  };
})();
