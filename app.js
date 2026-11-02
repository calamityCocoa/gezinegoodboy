// The main page (everything except the game, which is game.js).
// Runs as a module, so only browsers from about 2018 on run it; older ones get legacy.js.
// It also has to work in the Switch 1 browser (about Safari 12), so: no ?. or ??, no
// matchAll, and anything newer is checked before use.
const DEVICE = window.GEZ_DEVICE || { id: "unknown", legacy: false, allowVideo: true };

// some old browsers return nothing from video.play(), not a promise
function safePlay(media, onFail) {
  let p;
  try { p = media.play(); } catch (e) { if (onFail) onFail(); return; }
  if (p && typeof p.catch === "function") p.catch(() => { if (onFail) onFail(); });
}

const $ = (id) => document.getElementById(id);
function show(id, text) { const el = $(id); if (el) el.textContent = text; }

function main() {
// the backend lives in api/gezine.js on the same Vercel site
const API_URL = "/api/gezine";

const BAD = "I've been a bad boy!";
const GOOD = "I'm living in a hut in the middle of nowhere and not helping the hacking community with their Switch 2 fun and i'm boring and sad and enabled emails so nintendo could DMCA me and stuff";


// ---------- uwu mode (off by default, the checkbox turns it on) ----------
let uwuOn = false;
try { uwuOn = localStorage.getItem("uwu") === "on"; } catch (e) {}
$("uwu-toggle").checked = uwuOn;
$("uwu-toggle").onchange = () => {
  uwuOn = $("uwu-toggle").checked;
  try { localStorage.setItem("uwu", uwuOn ? "on" : "off"); } catch (e) {}
  setUwu(uwuOn);
  setTitle();
};

function setTitle() {
  document.title = uwuOn ? "Gezine Good Boy Twackew uwu" : isBad ? "BAD BOY ALERT" : "Gezine Good Boy Tracker";
}

const FACES = ["uwu", "owo", ">w<", "^w^", ":3", "nya~"];
const originals = new Map();

function uwu(t) {
  return t
    .replace(/[rl]/g, "w").replace(/[RL]/g, "W")
    .replace(/n([aeiou])/g, "ny$1").replace(/N([aeiouAEIOU])/g, "Ny$1")
    .replace(/ove/g, "uv")
    .replace(/([.!?])(\s|$)/g, (m, p, s) => p + " " + FACES[Math.floor(Math.random() * FACES.length)] + s);
}

function setUwu(on) {
  for (const [node, text] of originals) node.nodeValue = text; // undo the old uwu first
  originals.clear();
  if (!on) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => ["SCRIPT", "STYLE"].includes(n.parentNode.nodeName) || !n.nodeValue.trim()
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  while (walker.nextNode()) {
    originals.set(walker.currentNode, walker.currentNode.nodeValue);
    walker.currentNode.nodeValue = uwu(walker.currentNode.nodeValue);
  }
}

// ---------- buttons ----------
const ETAS = [
  "Soon™", "2 weeks", "When it's ready", "Every time you ask it gets delayed a week",
  "When John Nintendo stops watching", "gezine is busy in his hut, try again later",
  "After the next firmware update patches it", "Never. Go outside.",
];
$("eta-btn").onclick = () => show("eta", ETAS[Math.floor(Math.random() * ETAS.length)]);

let isBad = false, pats = 0, fs = 0;
// DMCA Dodge (game.js): the play buttons, the leaderboard on the page,
// and 30 headpats (or 30 respects) opens it as a surprise
const GAME_AT = 30;
let gameOpened = false;
document.querySelectorAll("[data-play-game]").forEach((b) => { b.onclick = () => HeadsetHero.open(); });
const refreshBoard = () => HeadsetHero.renderBoard($("game-board"), 10, (() => { try { return localStorage.getItem("headset-name"); } catch (e) { return null; } })());
refreshBoard();
window.onHeadsetHeroClose = refreshBoard;
function maybeStartGame(n) {
  if (n === GAME_AT - 10) HeadsetHero.preload(); // get the art ready early
  if (n >= GAME_AT && !gameOpened) {
    gameOpened = true;
    setTimeout(() => HeadsetHero.open("pats"), 700); // let the last headpat finish first
  }
}
$("mood-btn").onclick = () => {
  if (isBad) {
    show("mood-count", "F".repeat(Math.min(++fs, 40)) + " (" + fs + " respects paid to the exploits)");
    pending.respect++;
    maybeStartGame(fs);
  } else {
    show("mood-count", "headpats given: " + ++pats + (pats >= GAME_AT - 10 && pats < GAME_AT ? " (she's reaching for her headset...)" : ""));
    pending.headpat++;
    headpat();
    maybeStartGame(pats);
  }
  showGlobal();
};

// ---------- global counters (shared by everyone, stored by api/counts.js) ----------
// Clicks are saved up and sent every 2 seconds, so spamming the button is one request, not hundreds.
const pending = { headpat: 0, respect: 0 };
let globalTotals = null;

function showGlobal() {
  if (!globalTotals) return;
  $("global").hidden = false;
  show("g-pats", (globalTotals.headpats + pending.headpat).toLocaleString());
  show("g-fs", (globalTotals.respects + pending.respect).toLocaleString());
}

async function loadGlobal() {
  try {
    const res = await fetch("/api/counts");
    if (!res.ok) return; // database not connected yet: the line just stays hidden
    globalTotals = await res.json();
    showGlobal();
  } catch (e) {}
}

async function sendClicks() {
  for (const type of ["headpat", "respect"]) {
    const n = Math.min(pending[type], 25);
    if (!n) continue;
    pending[type] -= n;
    try {
      const res = await fetch(`/api/counts?type=${type}&n=${n}`, { method: "POST" });
      const body = await res.json();
      if (body.headpats !== undefined) globalTotals = body;
    } catch (e) {}
  }
  showGlobal();
}

// send any last clicks if the visitor leaves the page
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden") return;
  for (const type of ["headpat", "respect"]) {
    const n = Math.min(pending[type], 25);
    if (n && navigator.sendBeacon && navigator.sendBeacon(`/api/counts?type=${type}&n=${n}`)) pending[type] -= n;
  }
});

loadGlobal();
setInterval(sendClicks, 2000);
setInterval(loadGlobal, 30000);

// ---------- gezine's animations ----------
// Every animation starts and ends on the neutral pose (or a matching transition),
// so they can be chained in any order without a jump.
const frames = (dir) => [0, 1, 2, 3].map((n) => "images/" + dir + "/" + n + ".png");
const ANIMS = {
  good:   { frames: frames("good"),   ms: [700, 350, 140, 450] },
  bad:    { frames: frames("bad"),    ms: [450, 180, 380, 220] },
  pat:    { frames: frames("pat"),    ms: [220, 260, 380, 600], cls: "patting" },
  game:   { frames: frames("game"),   ms: [450, 200, 350, 650], cls: "gaming" },
  pickup: { frames: frames("pickup"), ms: [250, 300, 300, 250], holds: true },
  caught: { frames: frames("caught"), ms: [200, 550, 350, 300] },
};
ANIMS.putdown = { frames: [...ANIMS.pickup.frames].reverse(), ms: [...ANIMS.pickup.ms].reverse(), drops: true };

const JOHN = {
  loop:  { frames: frames("john"),       ms: [550, 350, 650, 300] },
  enter: { frames: frames("john-enter"), ms: [350, 350, 400, 300] },
  leave: { frames: frames("john-leave"), ms: [350, 500, 450, 500] },
};
for (const a of [...Object.values(ANIMS), ...Object.values(JOHN)]) for (const f of a.frames) new Image().src = f;

let gezTimer, busy = false, holding = false;

// play each step once, in order, then loop `loop` forever. onDone runs when the steps finish.
function play(steps, loop, onDone) {
  clearTimeout(gezTimer);
  const img = $("gezine-img");
  const seq = steps.map((n) => ANIMS[n]);
  let s = 0, i = 0;
  busy = seq.length > 0;

  const begin = (a) => {
    img.classList.remove("patting", "gaming");
    void img.offsetWidth; // restarts the squish if headpats are spammed
    if (a.cls) img.classList.add(a.cls);
    if (a.holds) holding = true;
  };
  begin(seq[0] || ANIMS[loop]);

  const step = () => {
    while (s < seq.length && i >= seq[s].frames.length) { // finished a step, move to the next
      if (seq[s].drops) holding = false;
      s++; i = 0;
      begin(seq[s] || ANIMS[loop]);
      if (s === seq.length && onDone) onDone();
    }
    if (s >= seq.length) busy = false;
    const a = seq[s] || ANIMS[loop];
    if (i >= a.frames.length) i = 0;
    img.src = a.frames[i];
    gezTimer = setTimeout(step, a.ms[i]);
    i++;
  };
  step();
}

let johnTimer;
// play one of John's animations; then = "loop" keeps looming, or a function to run when it ends
function johnPlay(name, then) {
  clearTimeout(johnTimer);
  const a = JOHN[name];
  let i = 0;
  const step = () => {
    if (i >= a.frames.length) return then === "loop" ? johnPlay("loop", "loop") : then();
    $("john-img").src = a.frames[i];
    johnTimer = setTimeout(step, a.ms[i]);
    i++;
  };
  step();
}

// ---------- moods and the camera ----------
let mood = null, moving = false, token = 0;
const putDownFirst = () => (holding ? ["putdown"] : []);

function showScene(on) {
  $("gez").hidden = on;
  $("john-img").hidden = !on;
}

function changeMood(bad) {
  const target = bad ? "bad" : "good";
  if (mood === target) return;
  const first = mood === null;
  mood = target;
  const my = ++token; // a newer mood change cancels anything still in progress

  if (first) { // page load: no transitions
    if (bad) { $("gez").classList.add("far"); showScene(true); johnPlay("loop", "loop"); }
    else play([], "good");
    return;
  }

  moving = true;
  if (bad) {
    // caught -> trembles -> camera pulls back -> John rises up
    showScene(false);
    $("gez").classList.remove("far");
    play([...putDownFirst(), "caught", "bad"], "bad", () => {
      if (my !== token) return;
      $("gez").classList.add("far");
      setTimeout(() => {
        if (my !== token) return;
        clearTimeout(gezTimer);
        showScene(true);
        johnPlay("enter", "loop");
        moving = false;
      }, 1000);
    });
  } else {
    // John chases the money bag away -> camera pushes back in
    johnPlay("leave", () => {
      if (my !== token) return;
      $("gez").classList.add("far");
      showScene(false);
      play([], "good");
      requestAnimationFrame(() => requestAnimationFrame(() => $("gez").classList.remove("far")));
      setTimeout(() => { if (my === token) moving = false; }, 1000);
    });
  }
}

function headpat() {
  if (mood === "good" && !moving) play([...putDownFirst(), "pat"], "good");
}

// every 20 seconds, if he's being good and just standing there, he plays his console for a bit
setInterval(() => {
  if (mood === "good" && !busy && !moving) play(["pickup", "game", "game", "putdown"], "good");
}, 20000);

function setMood(bad) {
  isBad = bad;
  changeMood(bad);
  show("verdict", bad ? "No. He has been a bad boy." : "Yes. For now.");
  show("bubble", bad ? BAD : GOOD);
  show("mood-btn", bad ? "Press F to pay respects to the exploits" : "Give gezine headpats");
  $("gezine-img").alt = bad ? "gezine looking guilty with a bag of money" : "gezine being a good boy";
  document.body.className = bad ? "bad" : "good";
  setTitle();
  setUwu(uwuOn);
}

// ---------- data ----------
async function check() {
  try {
    const data = await (await fetch(API_URL)).json();
    if (data.error) throw new Error(data.error);

    // add ?test=good or ?test=bad to the address to preview each mood
    const test = new URLSearchParams(location.search).get("test");
    if (test === "good" || test === "bad") data.badBoy = test === "bad";
    if (test === "flip") data.badBoy = isBad; // keep whatever the flip timer last set

    show("count", data.nintendoCount);
    show("total", data.total);
    show("days", data.lastNintendoAt
      ? Math.floor((Date.now() - new Date(data.lastNintendoAt)) / 86400000)
      : "never");

    const body = $("reports");
    body.innerHTML = "";
    for (const r of data.reports) {
      const tr = document.createElement("tr");
      if (r.isNintendo) tr.className = "nintendo";
      const cells = [
        r.title || "Secret undisclosed report",
        r.company || "hidden",
        r.disclosed ? "disclosed" : "not disclosed",
        r.activityAt ? new Date(r.activityAt).toLocaleDateString() : "unknown",
      ];
      cells.forEach((text, k) => {
        const td = document.createElement("td");
        if (k === 0 && r.url) {
          const a = document.createElement("a");
          a.href = r.url;
          a.textContent = text;
          td.append(a);
        } else {
          td.textContent = text;
        }
        tr.append(td);
      });
      body.append(tr);
    }
    if (!data.reports.length) body.innerHTML = '<tr><td colspan="4">No reports found</td></tr>';

    show("checked", "Last checked: " + new Date(data.checkedAt).toLocaleString());
    setMood(data.badBoy);
  } catch (e) {
    show("verdict", "Couldn't check right now, try again later.");
    $("reports").innerHTML = '<tr><td colspan="4">Couldn\'t load reports</td></tr>';
  }
}

check();
setInterval(check, 600000); // checks again every 10 minutes

// ?test=flip swaps between good and bad every 10 seconds, to check the transitions
if (new URLSearchParams(location.search).get("test") === "flip") {
  setInterval(() => setMood(!isBad), 10000);
}

}

// ---------- the ASMR (audio only) ----------
// A proper player in the ASMR card plus a little floating one. It starts at the first
// click / tap / key press (browsers don't allow sound before that) unless you switch
// that off, and picks up where you left off last time.
function asmrPlayer() {
  const audio = $("asmr-audio"), play = $("asmr-play"), seek = $("asmr-seek"), time = $("asmr-time"),
    disc = $("asmr-disc"), mini = $("mini-player"), auto = $("asmr-auto");
  if (!audio || !play) return;
  const LENGTH = 1858.7; // seconds
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const fmt = (t) => { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  // auto-start is on by default, but not on Data Saver or in cars
  const savedAuto = store.get("asmr-auto");
  let autoOn = savedAuto ? savedAuto === "on" : DEVICE.allowVideo !== false && !saveData;
  auto.checked = autoOn;
  auto.onchange = () => { autoOn = auto.checked; store.set("asmr-auto", autoOn ? "on" : "off"); };

  // pick up where they left off
  const resumeAt = Number(store.get("asmr-pos")) || 0;
  seek.value = String(resumeAt);
  time.textContent = fmt(resumeAt) + " / " + fmt(LENGTH);
  let primed = false, userPaused = false, dragging = false;
  function prime() {
    if (primed) return;
    primed = true;
    audio.preload = "auto";
    if (resumeAt > 5 && resumeAt < LENGTH - 5) {
      const jump = () => { try { audio.currentTime = resumeAt; } catch (e) {} };
      if (audio.readyState >= 1) jump(); else audio.addEventListener("loadedmetadata", jump, { once: true });
    }
  }

  function render() {
    const playing = !audio.paused;
    const icon = playing ? '<i class="icon-pause"></i>' : '<i class="icon-play"></i>';
    const label = playing ? "Pause the ASMR" : "Play the ASMR";
    play.innerHTML = icon;
    play.setAttribute("aria-label", label);
    mini.innerHTML = '<img src="images/record.png" alt=""' + (playing ? ' class="spin"' : "") + ">" + icon +
      '<span class="label">' + (playing ? "ASMR playing" : "ASMR paused") + "</span>";
    mini.setAttribute("aria-label", label);
    disc.classList.toggle("spin", playing);
  }
  function start() { prime(); safePlay(audio, render); }
  function toggle() {
    if (audio.paused) { userPaused = false; start(); }
    else { userPaused = true; audio.pause(); }
  }
  play.onclick = toggle;
  mini.onclick = toggle;
  audio.addEventListener("play", () => { mini.hidden = false; render(); });
  audio.addEventListener("pause", render);
  audio.addEventListener("timeupdate", () => {
    const t = audio.currentTime;
    if (!dragging) seek.value = String(Math.floor(t));
    time.textContent = fmt(t) + " / " + fmt(audio.duration || LENGTH);
    if (Math.floor(t) % 5 === 0) store.set("asmr-pos", String(Math.floor(t)));
  });
  seek.addEventListener("input", () => { dragging = true; time.textContent = fmt(seek.value) + " / " + fmt(LENGTH); });
  seek.addEventListener("change", () => {
    dragging = false;
    prime();
    const to = Number(seek.value);
    store.set("asmr-pos", String(to));
    if (audio.readyState >= 1) { try { audio.currentTime = to; } catch (e) {} }
    else audio.addEventListener("loadedmetadata", () => { try { audio.currentTime = to; } catch (e) {} }, { once: true });
    if (audio.paused) start();
  });

  // lock screen and headphone buttons
  if ("mediaSession" in navigator && window.MediaMetadata) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "bootstrap.bas ASMR", artist: "gezine", album: "Gezine Good Boy Tracker",
        artwork: [{ src: new URL("images/record.png", location.href).href, sizes: "320x320", type: "image/png" }],
      });
      navigator.mediaSession.setActionHandler("play", () => { userPaused = false; start(); });
      navigator.mediaSession.setActionHandler("pause", () => { userPaused = true; audio.pause(); });
    } catch (e) {}
  }

  // start at the first interaction (phones only count a tap once the finger lifts, so listen for all of these)
  const EVENTS = ["pointerup", "touchend", "click", "keydown"];
  const stopListening = () => EVENTS.forEach((t) => removeEventListener(t, firstTouch, true));
  function firstTouch(e) {
    if (!autoOn || userPaused) return;
    const t = e.target;
    if (t && t.closest && t.closest("#asmr-play, #mini-player, .autoplay, #asmr-seek")) return; // those handle themselves
    if (audio.paused) start();
  }
  audio.addEventListener("playing", stopListening);
  EVENTS.forEach((t) => addEventListener(t, firstTouch, true));
  render();
}

if (!DEVICE.legacy) {
  main();
  asmrPlayer();
}
