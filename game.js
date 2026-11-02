// Headset Hero: gezine's headset game.
// Opens after 30 headpats (or 30 respects). gezine runs along the bottom catching
// music notes and SmileBASIC keywords in her headset while dodging John Nintendo's
// DMCA letters. Works with a keyboard, a mouse, or a finger.
(function () {
  "use strict";

  // feet position of every frame, in sprite pixels (from the ASMR video's art)
  const ANCHORS = {
    run0: [195.7, 286.2], run1: [198.7, 286.2], run2: [209.7, 287.2], run3: [204.7, 287.2],
    jump0: [125.8, 254.0], jump1: [140.8, 289.0], jump2: [155.8, 323.0], jump3: [138.8, 270.0],
    trip0: [186.9, 280.6], trip1: [206.9, 270.6], trip2: [232.9, 262.6], trip3: [173.9, 238.6],
    wave0: [114.0, 312.0], wave1: [128.0, 312.0], wave2: [129.0, 312.0], wave3: [129.0, 312.0],
  };
  const SPRITE_H = 300; // standing height the sprites were exported at
  const TOKENS = ["PRINT", "GOTO", "GOSUB", "DIM", "VAR", "FOR", "NEXT", "IF", "THEN", "WHILE",
    "WEND", "DEF", "CALL", "VSYNC", "WAIT", "LOCATE", "EXEC", "LOAD", "SPSET", "BGPUT"];
  const LOSE_LINES = [
    "John Nintendo got her.", "DMCA'd. Back to the hut.", "Her headset is full of takedown notices.",
    "gezine has been a bad boy (allegedly).", "The lawyers send their regards.",
  ];

  const imgs = {};
  let spritesReady = null;
  function loadSprites() {
    if (!spritesReady) {
      spritesReady = Promise.all(Object.keys(ANCHORS).map((n) => new Promise((ok) => {
        const im = new Image();
        im.onload = im.onerror = ok;
        im.src = "images/headset/" + n + ".png";
        imgs[n] = im;
      })));
    }
    return spritesReady;
  }

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const touchy = () => matchMedia("(pointer: coarse)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- DOM
  const css = `
  #hh { position: fixed; inset: 0; z-index: 1000; background: rgba(255, 255, 255, .94); box-sizing: border-box;
        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
        overscroll-behavior: contain; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  #hh[hidden] { display: none; }
  #hh canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  #hh-exit { position: absolute; top: calc(env(safe-area-inset-top) + 10px); right: calc(env(safe-area-inset-right) + 10px);
             width: 44px; height: 44px; border-radius: 50%; border: 1px solid #111; background: #fff; font-size: 20px; line-height: 1; cursor: pointer; }
  #hh-panel { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); width: min(92vw, 420px); box-sizing: border-box; max-height: 86%; overflow-y: auto;
              background: #fff; border: 1px solid #111; border-radius: 14px; padding: 18px 20px; text-align: center;
              box-shadow: 0 6px 30px rgba(0, 0, 0, .18); font: 17px/1.45 Georgia, "Times New Roman", serif; color: #111; }
  #hh-panel[hidden] { display: none; }
  #hh-panel h2 { margin: 0 0 6px; font-size: 1.6em; }
  #hh-panel p { margin: 8px 0; }
  #hh-panel .big { font-size: 2em; font-weight: bold; margin: 4px 0; }
  #hh-panel button { font: inherit; min-height: 44px; padding: 8px 18px; margin: 6px 4px 0; border-radius: 999px;
                     border: 1px solid #111; background: #fff; color: #111; cursor: pointer; }
  #hh-panel button.main { background: #111; color: #fff; }
  `;
  let root, canvas, ctx, panel, exitBtn, lastFocus;

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
    root.setAttribute("aria-label", "Headset Hero, gezine's headset game");
    root.innerHTML = '<canvas aria-hidden="true"></canvas>' +
      '<button id="hh-exit" type="button" aria-label="Leave the game">✕</button>' +
      '<div id="hh-panel" aria-live="polite"></div>';
    document.body.append(root);
    canvas = root.querySelector("canvas");
    ctx = canvas.getContext("2d");
    panel = root.querySelector("#hh-panel");
    exitBtn = root.querySelector("#hh-exit");
    exitBtn.onclick = close;

    // pointer: she runs to wherever you point, tap or drag
    canvas.addEventListener("pointerdown", (e) => { pointerX = e.offsetX; pointerDown = true; if (state === "play") canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => { if (pointerDown || e.pointerType === "mouse") pointerX = e.offsetX; });
    const up = () => { pointerDown = false; };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
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
    if (k === "ArrowLeft" || k === "a" || k === "A") { keys.left = down; pointerX = null; e.preventDefault(); }
    else if (k === "ArrowRight" || k === "d" || k === "D") { keys.right = down; pointerX = null; e.preventDefault(); }
    else if (down && k === "Escape") { e.preventDefault(); if (state === "play") pause(); else close(); }
    else if (down && (k === "p" || k === "P")) { state === "play" ? pause() : state === "paused" && resume(); }
    else if (down && k === "Tab") { // keep focus inside the game
      const f = [...root.querySelectorAll("button")].filter((b) => b.offsetParent);
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
    }
  }
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKey);

  // ---------------------------------------------------------------- sizing
  let W = 0, H = 0, dpr = 1, gh = 150, ground = 0;
  function resize() {
    if (!root || root.hidden) return;
    const r = canvas.getBoundingClientRect();
    const oldW = W;
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gh = clamp(Math.min(H * 0.22, W * 0.32), 90, 200);
    ground = H - Math.max(18, H * 0.05);
    if (oldW && g) g.x = g.x / oldW * W;
    if (state !== "play") draw();
  }

  // ---------------------------------------------------------------- game state
  let state = "title", raf = 0, last = 0, T = 0, spawnIn = 0;
  let g = null, items = [], pops = [], score = 0, lives = 3, combo = 0, best = 0, overIn = 0;
  let pointerX = null, pointerDown = false;

  function reset() {
    g = { x: W / 2, vx: 0, dir: 1, stun: 0, jump: 0, anim: 0 };
    items = []; pops = [];
    score = 0; lives = 3; combo = 0; T = 0; spawnIn = 0.6; overIn = 0;
    pointerX = null; keys.left = keys.right = false;
  }

  function spawn() {
    const d = Math.min(T / 150, 1); // difficulty ramps up over ~2.5 minutes
    const r = Math.random();
    let kind;
    if (r < 0.18 + 0.17 * d) kind = "dmca";
    else if (r < 0.21 + 0.17 * d) kind = "star";
    else if (r < 0.5 + 0.1 * d) kind = "token";
    else kind = "note";
    const size = gh * (kind === "token" ? 0.13 : kind === "dmca" ? 0.2 : 0.17);
    const text = kind === "token" ? TOKENS[Math.floor(Math.random() * TOKENS.length)] : "";
    ctx.font = "bold " + Math.round(size) + "px ui-monospace, Menlo, Consolas, monospace";
    const half = kind === "token" ? ctx.measureText(text).width / 2 + size * 0.6 : size;
    items.push({
      kind, text, size, half,
      x: rand(half + 8, W - half - 8), y: -size * 2,
      vy: H * (0.26 + 0.5 * d) * rand(0.85, 1.15) * (kind === "star" ? 1.25 : 1),
      rot: rand(-0.3, 0.3), vr: rand(-1.2, 1.2), hue: Math.random() < 0.5 ? "#7fb8f0" : "#f29bb0",
    });
    spawnIn = (0.85 - 0.5 * d) * rand(0.7, 1.3);
  }

  function pop(x, y, text, color) { pops.push({ x, y, text, color, t: 0 }); }

  function update(dt) {
    T += dt;
    spawnIn -= dt;
    if (spawnIn <= 0) spawn();

    // movement
    const maxV = clamp(W * 0.95, 380, 950);
    let want = 0;
    if (g.stun > 0) want = 0;
    else if (keys.left !== keys.right) want = keys.left ? -maxV : maxV;
    else if (pointerX !== null) want = clamp((pointerX - g.x) * 9, -maxV, maxV);
    g.vx += (want - g.vx) * Math.min(1, dt * 14);
    if (Math.abs(want) < 1 && Math.abs(g.vx) < 25) g.vx = 0;
    g.x = clamp(g.x + g.vx * dt, gh * 0.35, W - gh * 0.35);
    if (Math.abs(g.vx) > 30) g.dir = g.vx < 0 ? -1 : 1;
    g.anim += dt;
    g.stun = Math.max(0, g.stun - dt);
    g.jump = Math.max(0, g.jump - dt);

    // the headset is the catcher
    const hx = g.x, hy = ground - gh * 0.72, hr = gh * 0.42;
    for (const it of items) {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (it.hit) continue;
      const dx = Math.max(0, Math.abs(it.x - hx) - (it.half - it.size)), dy = it.y - hy;
      if (dx * dx + dy * dy < (hr + it.size * 0.8) ** 2) {
        if (it.kind === "dmca") {
          if (g.stun > 0) continue; // already down, can't be hit twice
          it.hit = true;
          lives--; combo = 0; g.stun = 1.1; g.jump = 0;
          pop(it.x, it.y, lives > 0 ? "DMCA'd!" : "Game over", "#c62828");
          if (navigator.vibrate) navigator.vibrate(120);
          if (lives <= 0) overIn = 1.1;
        } else if (g.stun <= 0) {
          it.hit = true;
          combo++;
          const mult = Math.min(5, 1 + Math.floor(combo / 10));
          const pts = (it.kind === "note" ? 1 : it.kind === "token" ? 3 : 10) * mult;
          score += pts;
          if (it.kind === "star") g.jump = 0.6;
          pop(it.x, it.y, "+" + pts + (it.kind === "token" ? " " + it.text : ""), it.kind === "star" ? "#c99a00" : "#141a2b");
        }
      }
    }
    items = items.filter((it) => !it.hit && it.y < H + it.size * 3);
    for (const p of pops) { p.t += dt; p.y -= 40 * dt; }
    pops = pops.filter((p) => p.t < 0.9);

    if (overIn > 0 && (overIn -= dt) <= 0) gameOver();
  }

  // ---------------------------------------------------------------- drawing
  function frame() {
    if (g.stun > 0) return "trip" + Math.min(3, Math.floor((1.1 - g.stun) / 1.1 * 4));
    if (g.jump > 0) return "jump" + Math.min(3, Math.floor((0.6 - g.jump) / 0.6 * 4));
    if (Math.abs(g.vx) > 40) return "run" + (Math.floor(g.anim * 11) % 4);
    return "wave" + [3, 3, 3, 3, 3, 1, 2, 2, 1, 3][Math.floor(g.anim * 4) % 10];
  }

  function drawGezine() {
    const name = frame(), im = imgs[name];
    const s = gh / SPRITE_H;
    // soft shadow
    ctx.fillStyle = "rgba(0, 0, 0, .12)";
    ctx.beginPath();
    ctx.ellipse(g.x, ground + 3, gh * 0.32, gh * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!im || !im.complete || !im.naturalWidth) return;
    const [ax, gy] = ANCHORS[name];
    const flip = g.dir < 0 && !name.startsWith("wave");
    ctx.save();
    ctx.translate(g.x, ground);
    if (flip) ctx.scale(-1, 1);
    if (g.stun > 0 && Math.floor(g.stun * 12) % 2) ctx.globalAlpha = 0.6;
    ctx.drawImage(im, -ax * s, -gy * s, im.naturalWidth * s, im.naturalHeight * s);
    ctx.restore();
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
    ctx.translate(it.x, it.y);
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
      ctx.font = "bold " + Math.round(s) + "px ui-monospace, Menlo, Consolas, monospace";
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
    // floor
    ctx.strokeStyle = "rgba(20, 26, 43, .25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ground + 0.5); ctx.lineTo(W, ground + 0.5); ctx.stroke();

    for (const it of items) drawItem(it);
    drawGezine();

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const p of pops) {
      ctx.globalAlpha = 1 - p.t / 0.9;
      ctx.fillStyle = p.color;
      ctx.font = "bold " + Math.round(gh * 0.13) + "px Georgia, serif";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // HUD (the ✕ button sits top right)
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#111";
    ctx.font = "bold 26px Georgia, serif";
    ctx.fillText(String(score), 14, 14);
    const mult = Math.min(5, 1 + Math.floor(combo / 10));
    ctx.font = "15px Georgia, serif";
    ctx.fillText(mult > 1 ? "combo x" + mult : "best " + best, 14, 46);
    for (let i = 0; i < 3; i++) heart(W - 74 - i * 30, 32, 10, i < lives);
  }

  function loop(now) {
    raf = 0;
    if (state !== "play") return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    draw();
    if (state === "play") raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- screens
  function showPanel(html, buttons) {
    panel.innerHTML = html;
    for (const [label, fn, main] of buttons) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; if (main) b.className = "main";
      b.onclick = fn;
      panel.append(b);
    }
    panel.hidden = false;
    panel.querySelector("button")?.focus({ preventScroll: true });
  }

  function controlsText() {
    return touchy()
      ? "Drag, or tap where you want her to run."
      : "Move the mouse, or use ← → (or A and D). P pauses, Esc leaves.";
  }

  function title() {
    state = "title";
    reset(); draw();
    showPanel(
      "<h2>Headset Hero</h2>" +
      "<p>You gave gezine so many headpats she put her headset on.</p>" +
      "<p>Catch the ♪ notes, SmileBASIC keywords and ⭐ stars in her headset. Dodge John Nintendo's DMCA letters.</p>" +
      "<p><small>" + controlsText() + "</small></p>",
      [["Play", start, true], ["Back to the website", close]]);
  }

  function start() {
    reset();
    panel.hidden = true;
    state = "play";
    canvas.focus?.();
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (state !== "play") return;
    state = "paused";
    keys.left = keys.right = false; pointerDown = false;
    showPanel("<h2>Paused</h2><p>Score: " + score + "</p>", [["Keep going", resume, true], ["Back to the website", close]]);
  }

  function resume() {
    if (state !== "paused") return;
    panel.hidden = true;
    state = "play";
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    state = "over";
    const newBest = score > best;
    if (newBest) { best = score; store.set("headset-best", String(best)); }
    draw();
    showPanel(
      "<h2>" + LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)] + "</h2>" +
      '<p class="big">' + score + "</p>" +
      "<p>" + (newBest ? "New best score!" : "Best: " + best) + "</p>",
      [["Play again", start, true], ["Back to the website", close]]);
  }

  // ---------------------------------------------------------------- open / close
  async function open() {
    build();
    lastFocus = document.activeElement;
    best = Number(store.get("headset-best")) || 0;
    store.set("headset-unlocked", "1");
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    resize();
    panel.hidden = true;
    reset();
    showPanel("<h2>Headset Hero</h2><p>Putting her headset on...</p>", []);
    await loadSprites();
    if (!root.hidden) title();
  }

  function close() {
    if (!root || root.hidden) return;
    state = "closed";
    if (raf) cancelAnimationFrame(raf), raf = 0;
    root.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (typeof window.onHeadsetHeroClose === "function") window.onHeadsetHeroClose();
  }

  window.HeadsetHero = {
    open, close, preload: loadSprites,
    unlocked: () => store.get("headset-unlocked") === "1",
  };
})();
