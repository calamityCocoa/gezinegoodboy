// Easter eggs. Shh.
//  - Konami code: John Nintendo DMCAs the Konami code
//  - type "yarr", "kernel", "eggs", "ns2jb", "gezine" or "nintendo" anywhere (not in a text box)
//  - the egg in the footer, the logo clicked 5 times, the eggs hidden on Bag of Eggs Sunday
//  - something in the browser console for the curious
// Safe for the Switch 1 browser (no ?. or ??).
(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy) return;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const EGGS = ["konami", "yarr", "kernel", "bag", "takedown", "sunday", "summon", "console"];

  const css = `
  .egg-toast { position: fixed; left: 50%; bottom: calc(80px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 2000;
               background: #141a2b; color: #fff; padding: 10px 16px; border-radius: 16px; font: 700 15px/1.35 "Nunito", sans-serif;
               box-shadow: 0 8px 30px rgba(20,26,43,.3); max-width: min(92vw, 460px); text-align: center; animation: egg-in .25s ease-out; }
  @keyframes egg-in { from { opacity: 0; transform: translate(-50%, 10px); } }
  .egg-modal { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 2100; background: rgba(20,26,43,.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .egg-card { background: #fff; border-radius: 22px; padding: 20px; max-width: 360px; width: 100%; text-align: center; font-family: "Nunito", sans-serif; color: #141a2b;
              box-shadow: 0 12px 40px rgba(20,26,43,.3); border: 3px solid #fde7ef; }
  .egg-card img { max-width: 220px; width: 70%; height: auto; }
  .egg-card h3 { font-family: "Fredoka", sans-serif; margin: 6px 0; font-size: 1.4em; }
  .egg-card button { font: inherit; font-weight: 800; padding: 9px 18px; border-radius: 999px; border: 2px solid #141a2b; background: #141a2b; color: #fff; cursor: pointer; margin-top: 8px; min-height: 44px; }
  .egg-pirate { position: fixed; bottom: 70px; left: -180px; width: 150px; z-index: 1900; pointer-events: none; animation: egg-sail 7s linear forwards; }
  .egg-pirate img { width: 100%; height: auto; animation: egg-bob 1s ease-in-out infinite; }
  .egg-pirate span { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #fff; color: #141a2b; border: 2px solid #141a2b;
                     border-radius: 12px; padding: 4px 8px; white-space: nowrap; font: 800 13px "Nunito", sans-serif; }
  @keyframes egg-sail { to { left: calc(100vw + 40px); } }
  @keyframes egg-bob { 50% { transform: translateY(-8px) rotate(-4deg); } }
  .egg-takedown { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 2200; background: #fff; color: #222; display: flex; align-items: center; justify-content: center;
                  font-family: Arial, Helvetica, sans-serif; padding: 24px; text-align: left; }
  .egg-takedown div { max-width: 560px; }
  .egg-takedown h1 { font-size: 26px; margin: 0 0 12px; font-family: Arial, sans-serif; }
  .egg-takedown button { margin-top: 14px; padding: 8px 16px; font: inherit; cursor: pointer; border: 1px solid #888; background: #f3f3f3; border-radius: 4px; }
  .egg-hidden { display: inline-block; cursor: pointer; font-size: 18px; margin-left: 6px; opacity: .85; transition: transform .15s; border: 0; background: none; padding: 0; }
  .egg-hidden:hover { transform: scale(1.3) rotate(10deg); }
  .egg-count { font-weight: 800; color: #f06292; }
  html.egg-lawyer body { animation: egg-red 1.2s ease-in-out 2; }
  @keyframes egg-red { 50% { background: #ffe1e1; } }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- helpers ----------
  function toast(text, ms) {
    const old = document.querySelector(".egg-toast");
    if (old) old.parentNode.removeChild(old);
    const t = document.createElement("div");
    t.className = "egg-toast";
    t.setAttribute("role", "status");
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 3800);
  }
  function found(id) {
    let list = [];
    try { list = JSON.parse(store.get("eggs-found") || "[]"); } catch (e) {}
    if (list.indexOf(id) < 0) { list.push(id); store.set("eggs-found", JSON.stringify(list)); }
    showCount();
  }
  function showCount() {
    let list = [];
    try { list = JSON.parse(store.get("eggs-found") || "[]"); } catch (e) {}
    const el = document.getElementById("egg-count");
    if (el && list.length) el.innerHTML = 'Easter eggs found: <span class="egg-count">' + list.length + " / " + EGGS.length + "</span>";
  }
  function modal(html, buttons) {
    const m = document.createElement("div");
    m.className = "egg-modal";
    m.innerHTML = '<div class="egg-card" role="dialog" aria-modal="true">' + html + "</div>";
    const card = m.firstChild;
    const close = () => { if (m.parentNode) m.parentNode.removeChild(m); };
    (buttons || [["Close", close]]).forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.onclick = () => fn(close, card);
      card.appendChild(b);
    });
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    document.body.appendChild(m);
    const first = card.querySelector("button");
    if (first) first.focus();
    return { close, card };
  }
  const peek = (who) => { if (window.GezPeek) window.GezPeek.now(who); };

  // ---------- the eggs ----------
  function bagOfEggs() {
    found("bag");
    modal('<img src="images/eggs/bag-of-eggs.png" alt="gezine hugging a bag of eggs"><h3>Here\'s your bag of eggs!</h3><p>You earned it.</p>',
      [["Take the eggs 🥚", (close, card) => {
        card.querySelector("h3").textContent = "...just kidding.";
        card.querySelector("p").textContent = "You don't get a bag of eggs.";
        card.querySelector("button").textContent = "Fair enough";
        card.querySelector("button").onclick = close;
      }]]);
  }

  function pirate() {
    found("yarr");
    const p = document.createElement("div");
    p.className = "egg-pirate";
    p.innerHTML = '<span>Yarr! r/switch2hacks rule: no piracy, matey</span><img src="images/eggs/pirate-puffball.png" alt="">';
    document.body.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 7200);
  }

  function kernel() {
    found("kernel");
    toast("🚨 BREAKING: Jinova has found a low-level kernel exploit!", 2600);
    setTimeout(() => toast("...update: it was a joke. Jinova was joking. Stand down.", 3600), 2700);
  }

  function lawyerMode() {
    found("konami");
    document.documentElement.classList.add("egg-lawyer");
    setTimeout(() => document.documentElement.classList.remove("egg-lawyer"), 2600);
    toast("⚖️ John Nintendo has DMCA'd the Konami code. (It's Konami's, John.)", 4200);
    for (let i = 0; i < 4; i++) setTimeout(() => peek("john"), i * 900);
  }

  function takedown() {
    found("takedown");
    const t = document.createElement("div");
    t.className = "egg-takedown";
    t.innerHTML = "<div><h1>451: Unavailable For Legal Reasons</h1>" +
      "<p>This website is no longer available due to a copyright complaint from <b>John Nintendo, Esq.</b></p>" +
      "<p>The complaint alleges that gezine was <i>being too much of a good boy</i>, which is a registered trademark of Nintendo.</p>" +
      '<button type="button">File a counter-notice</button></div>';
    document.body.appendChild(t);
    const b = t.querySelector("button");
    b.focus();
    b.onclick = () => {
      t.querySelector("h1").textContent = "Counter-notice accepted";
      t.querySelectorAll("p")[0].textContent = "A judge (pepsipu, in a tiny wig) has ruled that gezine is, in fact, a good boy.";
      t.querySelectorAll("p")[1].textContent = "Case dismissed. John Nintendo has been ordered to go outside.";
      b.textContent = "Back to the website";
      b.onclick = () => { if (t.parentNode) t.parentNode.removeChild(t); };
    };
  }

  // Bag of Eggs Sunday (events.js): five eggs hidden in cards around the page
  function hideSundayEggs() {
    if (!window.GEZ_EVENTS || !window.GEZ_EVENTS.isOn("sunday")) return;
    const spots = [].slice.call(document.querySelectorAll("main .card h2")).sort(() => Math.random() - 0.5).slice(0, 5);
    let left = spots.length;
    spots.forEach((h) => {
      const e = document.createElement("button");
      e.type = "button"; e.className = "egg-hidden"; e.textContent = "🥚"; e.setAttribute("aria-label", "A hidden egg");
      e.onclick = () => {
        e.parentNode.removeChild(e);
        left--;
        if (left > 0) toast("🥚 Egg found! " + left + " left on the page.", 2000);
        else { found("sunday"); toast("You found every egg! Your prize: you don't get a bag of eggs. 🥚", 4200); }
      };
      h.appendChild(e);
    });
  }

  // ---------- triggers ----------
  // the Konami code
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kpos = 0, typed = "";
  const WORDS = {
    yarr: pirate, kernel: kernel, eggs: bagOfEggs,
    ns2jb: () => { found("summon"); peek("pepsipu"); toast("pepsipu heard you say ns2jb 👀", 2400); },
    gezine: () => { found("summon"); peek("gezine"); },
    nifty: () => { found("summon"); toast("✨ NiftyNova was here ✨ (the cat says hi)", 2800); },
    nintendo: () => { found("summon"); peek("john"); toast("Someone said \"Nintendo\". John Nintendo is on his way.", 2800); },
  };
  addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (document.getElementById("ar") && !document.getElementById("ar").hidden) return;   // not during games
    if (document.getElementById("hh") && !document.getElementById("hh").hidden) return;
    const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : k === KONAMI[0] ? 1 : 0;
    if (kpos === KONAMI.length) { kpos = 0; lawyerMode(); return; }
    if (k && k.length === 1 && /[a-z0-9]/.test(k)) {
      typed = (typed + k).slice(-12);
      Object.keys(WORDS).forEach((w) => { if (typed.slice(-w.length) === w) { typed = ""; WORDS[w](); } });
    }
  });

  // the logo, clicked 5 times quickly
  let clicks = 0, clickTimer = 0;
  const brand = document.querySelector(".brand");
  if (brand) brand.addEventListener("click", (e) => {
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clicks = 0; }, 1500);
    if (clicks >= 5) { e.preventDefault(); clicks = 0; takedown(); }
  });

  // the egg in the footer
  const foot = document.getElementById("footer-egg");
  if (foot) foot.onclick = bagOfEggs;

  // the console
  try {
    console.log("%c gezine good boy %c Looking for exploits? Jinova found a low-level kernel exploit in this page. (It was a joke.)",
      "background:#f06292;color:#fff;font-weight:800;padding:4px 8px;border-radius:6px", "color:#141a2b");
    console.log("Type GEZ_FOUND() here to collect an Easter egg.");
    window.GEZ_FOUND = () => { found("console"); return "🥚 You found the console egg. No bag of eggs though."; };
  } catch (e) {}

  showCount();
  setTimeout(hideSundayEggs, 1500);
})();
