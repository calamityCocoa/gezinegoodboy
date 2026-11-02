// Peekaboo: every so often gezine (or John Nintendo, or pepsipu) peeks out from behind a
// random card, tile or picture on the page, then ducks back down. Tap them to make them jump.
// Stays quiet during games, in background tabs, on old browsers and e-ink, and for anyone who
// has asked their device to reduce motion. Safe for the Switch 1 browser (no ?. or ??).
(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy || DEV.eink) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // who peeks, how often (weight), and what they say when you catch them
  const PEEKERS = [
    { id: "gezine", src: "images/peek/gezine.png", weight: 6, lines: ["boo!", "you found me!", "uwu", "headpat?", "shh, I'm hiding from John"] },
    { id: "john", src: "images/peek/john.png", weight: 3, lines: ["DMCA'd!", "I see you...", "that's my IP", "cease and desist!"] },
    { id: "pepsipu", src: "images/peek/pepsipu.png", weight: 1, lines: ["ns2jb!", "run the bootstrap", "hi :3"] },
  ];
  // whole cards and pictures only, so a peeker never pops up in the middle of a heading
  const TARGETS = ".card, .game-card, #stage, .credits li";

  const css = `
  .peek-box { position: absolute; z-index: 15; overflow: hidden; pointer-events: none; }
  .peek-box img { position: absolute; left: 0; bottom: 0; width: 100%; height: auto;
                  transition: transform .45s cubic-bezier(.2, .9, .3, 1.3); pointer-events: auto; cursor: pointer;
                  -webkit-user-drag: none; user-select: none; }
  .peek-say { position: absolute; z-index: 16; background: #141a2b; color: #fff; font: 800 13px/1.2 "Nunito", sans-serif;
              padding: 5px 9px; border-radius: 10px; white-space: nowrap; pointer-events: none; transform: translate(-50%, -100%);
              animation: peek-say 1.4s ease-out forwards; }
  @keyframes peek-say { 0% { opacity: 0; margin-top: 6px; } 15% { opacity: 1; margin-top: 0; } 80% { opacity: 1; } 100% { opacity: 0; margin-top: -8px; } }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // preload, and only use the ones that actually load
  const ready = [];
  PEEKERS.forEach((p) => { const im = new Image(); im.onload = () => { p.ratio = im.naturalHeight / im.naturalWidth; ready.push(p); }; im.src = p.src; });

  function choose(want) {
    if (want) { const w = ready.filter((p) => p.id === want)[0]; if (w) return w; }
    // Midnight Debugging (events.js): John is asleep
    const pool = window.GEZ_EVENTS && window.GEZ_EVENTS.isOn("midnight") ? ready.filter((p) => p.id !== "john") : ready;
    const total = pool.reduce((n, p) => n + p.weight, 0);
    let r = Math.random() * total;
    for (const p of pool) { if ((r -= p.weight) <= 0) return p; }
    return pool[0];
  }

  function gameOpen() {
    const ids = ["hh", "ar"];
    for (const id of ids) { const el = document.getElementById(id); if (el && !el.hidden) return true; }
    return false;
  }

  let busy = false, hideCurrent = null;
  // duck straight away if a game opens while someone's peeking
  setInterval(() => { if (hideCurrent && gameOpen()) hideCurrent(); }, 300);
  function peek(want) {
    if (busy || !ready.length || document.hidden || gameOpen()) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    // only things that are on screen, big enough, and not under the sticky top bar
    const bar = document.querySelector(".topbar");
    const top = bar ? bar.getBoundingClientRect().bottom : 0;
    const els = [].slice.call(document.querySelectorAll(TARGETS)).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 90 && r.height > 50 && r.top > top + 70 && r.top < vh - 30 && r.left >= 0 && r.right <= vw && el.offsetParent;
    });
    if (!els.length) return;
    const el = pick(els), r = el.getBoundingClientRect(), who = choose(want);
    const w = Math.round(Math.min(84, Math.max(56, r.width * 0.16)));
    const h = Math.round(w * (who.ratio || 0.8));
    const sx = window.pageXOffset, sy = window.pageYOffset;

    // peek up over the top edge, or (less often, if there's room) round a side
    const sides = ["top", "top", "top"];
    if (r.left > h + 8) sides.push("left");
    if (vw - r.right > h + 8) sides.push("right");
    const side = pick(sides);

    const box = document.createElement("div");
    box.className = "peek-box";
    const img = document.createElement("img");
    img.src = who.src;
    img.alt = "";
    img.draggable = false;
    box.appendChild(img);
    // the sprite is drawn peeking UP with its hands on the bottom edge. For the sides it's turned
    // 90 degrees so the hands grip the card's edge, and "hidden" means slid back behind the card.
    let rot = "";
    if (side === "top") {
      box.style.width = w + "px"; box.style.height = h + "px";
      box.style.left = Math.round(sx + rand(r.left + 10, r.right - w - 10)) + "px";
      box.style.top = Math.round(sy + r.top - h) + "px";
    } else {
      box.style.width = h + "px"; box.style.height = w + "px";
      box.style.left = Math.round(sx + (side === "left" ? r.left - h : r.right)) + "px";
      box.style.top = Math.round(sy + rand(r.top + 6, Math.max(r.top + 7, r.bottom - w - 6))) + "px";
      img.style.width = w + "px";
      img.style.left = Math.round((h - w) / 2) + "px";
      img.style.bottom = Math.round((w - h) / 2) + "px";
      rot = side === "left" ? "rotate(-90deg) " : "rotate(90deg) ";
    }
    img.style.transform = rot + "translateY(105%)";
    document.body.appendChild(box);
    busy = true;

    let gone = false;
    function hide() {
      if (gone) return;
      gone = true;
      hideCurrent = null;
      img.style.transform = rot + "translateY(105%)";
      setTimeout(() => { if (box.parentNode) box.parentNode.removeChild(box); busy = false; }, 500);
    }
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const found = (Number(store.get("peeks-found")) || 0) + 1;
      store.set("peeks-found", String(found));
      const say = document.createElement("div");
      say.className = "peek-say";
      say.textContent = pick(who.lines) + (found % 10 === 0 ? " (" + found + " found!)" : "");
      const b = img.getBoundingClientRect();
      say.style.left = Math.round(window.pageXOffset + b.left + b.width / 2) + "px";
      say.style.top = Math.round(window.pageYOffset + b.top - 4) + "px";
      document.body.appendChild(say);
      setTimeout(() => { if (say.parentNode) say.parentNode.removeChild(say); }, 1500);
      img.style.transform = rot + "translateY(-6%) scale(1.08)";
      setTimeout(hide, 220);
    });
    hideCurrent = hide;
    // slide up, wait, slide back down
    requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transform = rot + "translateY(0)"; }));
    setTimeout(hide, rand(2200, 3400));
    addEventListener("scroll", hide, { once: true, passive: true });
  }

  function schedule(first) {
    setTimeout(() => { peek(); schedule(false); }, first ? rand(5000, 9000) : rand(12000, 25000));
  }
  schedule(true);

  window.GezPeek = { now: peek }; // GezPeek.now() or GezPeek.now("pepsipu") (used by events.js and eggs.js)
})();
