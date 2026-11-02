// Live events: things that happen at set times (UTC), the weekly tournament, and the
// community headpat goal. The schedule is worked out from the clock, so it costs nothing;
// the weekly board and the headpat count come from the (edge-cached) API.
// Safe for the Switch 1 browser (no ?. or ??).
(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy) return;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const HOUR = 3600000, DAY = 24 * HOUR;

  // when: (date) -> true if the event is on at that moment (all in UTC)
  const EVENTS = [
    { id: "midnight", name: "Midnight Debugging", icon: "🌙",
      desc: "John Nintendo is asleep. Shh. No peeking from him for a whole hour.",
      when: (d) => d.getUTCHours() === 0 },
    { id: "lunch", name: "Lawyer Lunch Break", icon: "🥪",
      desc: "John Nintendo's lawyers are at lunch, so he's checking up on everyone himself. Expect a lot of peeking.",
      when: (d) => d.getUTCHours() === 12 },
    { id: "happyhour", name: "Headpat Happy Hour", icon: "💖",
      desc: "gezine is extra happy to see you. Every headpat sparkles.",
      when: (d) => d.getUTCHours() === 18 },
    { id: "wednesday", name: "ETA WEN Wednesday", icon: "⏳",
      desc: "The ETA button knows things today. Probably.",
      when: (d) => d.getUTCDay() === 3 },
    { id: "friday", name: "Firmware Friday", icon: "⚠️",
      desc: "A wild system update has appeared. Remember the golden rule: DO NOT UPDATE.",
      when: (d) => d.getUTCDay() === 5 },
    { id: "sunday", name: "Bag of Eggs Sunday", icon: "🥚",
      desc: "Eggs are hidden all over the page. Find them all! (You still don't get a bag of eggs.)",
      when: (d) => d.getUTCDay() === 0 },
  ];
  const GOALS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000];
  const GAME_NAMES = { dodge: "DMCA Dodge", typer: "Bootstrap Typer", whack: "Whack-a-John", match: "Pose Match", combo: "Combo Says",
    blitz: "Better Gaming Blitz", empires: "Exploit Empires", lullaby: "Lua Lullaby" };

  const activeAt = (t) => EVENTS.filter((e) => e.when(new Date(t)));
  // when an event that's on right now ends (checked hour by hour)
  function endsAt(ev, now) { let t = Math.floor(now / HOUR) * HOUR; while (ev.when(new Date(t)) && t < now + 8 * DAY) t += HOUR; return t; }
  // the next event that isn't on now, and when it starts
  function nextUp(now) {
    const on = activeAt(now).map((e) => e.id);
    for (let t = Math.floor(now / HOUR) * HOUR + HOUR; t < now + 8 * DAY; t += HOUR) {
      const e = activeAt(t).filter((x) => on.indexOf(x.id) < 0)[0];
      if (e) return { ev: e, at: t };
    }
    return null;
  }
  function left(ms) {
    ms = Math.max(0, ms);
    const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / HOUR), m = Math.floor(ms % HOUR / 60000);
    return d ? d + "d " + h + "h" : h ? h + "h " + m + "m" : Math.max(1, m) + "m";
  }

  let active = [];
  window.GEZ_EVENTS = { isOn: (id) => active.some((e) => e.id === id) };

  function renderLive() {
    const el = $("events-live");
    if (!el) return;
    const now = Date.now();
    active = activeAt(now);
    document.documentElement.className = document.documentElement.className.replace(/\s*ev-[a-z]+/g, "") +
      active.map((e) => " ev-" + e.id).join("");
    const nx = nextUp(now);
    el.innerHTML = (active.length
      ? active.map((e) => '<div class="ev-now"><span class="ev-pill">LIVE NOW</span><b>' + e.icon + " " + esc(e.name) + "</b>" +
          '<span class="ev-left">ends in ' + left(endsAt(e, now) - now) + "</span><p>" + esc(e.desc) + "</p></div>").join("")
      : '<div class="ev-now quiet"><b>No event right now</b><p>Things happen here at set times. Keep an eye out.</p></div>') +
      (nx ? '<p class="ev-next">Up next: <b>' + nx.ev.icon + " " + esc(nx.ev.name) + "</b> in " + left(nx.at - now) + "</p>" : "");
  }

  function renderWeek() {
    const el = $("events-week");
    if (!el) return;
    fetch("/api/scores?week=1").then((r) => r.json()).then((w) => {
      if (!w || !w.game) throw new Error("offline");
      const name = GAME_NAMES[w.game] || w.game;
      el.innerHTML = '<h3>🏆 This week\'s tournament: ' + esc(name) + "</h3>" +
        "<p>Ends in " + left(w.endsAt - Date.now()) + ". Every score you set in " + esc(name) + " this week also counts here.</p>" +
        (w.top && w.top.length
          ? "<ol class=\"ev-top\">" + w.top.slice(0, 5).map((e) => "<li><b>" + esc(e.name) + "</b> " + e.score.toLocaleString() + "</li>").join("") + "</ol>"
          : "<p><small>Nobody's on the board yet this week. Easy win?</small></p>") +
        '<button class="btn btn-main" type="button" data-week-play="' + esc(w.game) + '">Play ' + esc(name) + "</button>";
      const b = el.querySelector("[data-week-play]");
      b.onclick = () => { if (window.GezArcade) window.GezArcade.open(w.game); };
    }).catch(() => { el.innerHTML = "<p><small>The weekly tournament is offline right now.</small></p>"; });
  }

  function renderGoal() {
    const el = $("events-goal");
    if (!el) return;
    fetch("/api/counts").then((r) => r.json()).then((c) => {
      if (typeof c.headpats !== "number") throw new Error("offline");
      const n = c.headpats, goal = GOALS.filter((g) => g > n)[0] || n * 2, prev = GOALS.filter((g) => g <= n).pop() || 0;
      const pct = Math.max(2, Math.min(100, Math.round((n - prev) / (goal - prev) * 100)));
      el.innerHTML = "<h3>💞 Community goal</h3><p>Give gezine <b>" + goal.toLocaleString() + "</b> headpats together. " +
        "So far: <b>" + n.toLocaleString() + "</b>.</p>" +
        '<div class="ev-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>' +
        "<p><small>Pat her with the button at the top, or in Headpat Clicker.</small></p>";
    }).catch(() => { el.innerHTML = ""; });
  }

  // ---------- what the events do ----------
  // Lawyer Lunch: John peeks a lot more (peek.js does the drawing)
  setInterval(() => {
    if (window.GEZ_EVENTS.isOn("lunch") && window.GezPeek && !document.hidden) window.GezPeek.now("john");
  }, 9000);

  // ETA WEN Wednesday: the ETA button gets special answers (this runs after app.js's own handler)
  const WED = ["Next Wednesday. Every Wednesday.", "pepsipu says: when it's done, and it's done when it's done",
    "After gezine finishes his nap", "The ETA is a state of mind", "John Nintendo has DMCA'd the ETA", "In 2 weeks (Wednesday edition)"];
  document.addEventListener("click", (e) => {
    if (!window.GEZ_EVENTS.isOn("wednesday") || !e.target || e.target.id !== "eta-btn") return;
    setTimeout(() => { const out = $("eta"); if (out) out.textContent = WED[Math.floor(Math.random() * WED.length)] + " ⏳"; }, 0);
  });

  // Firmware Friday: a fake system update banner, once per Friday
  function firmwareFriday() {
    if (!window.GEZ_EVENTS.isOn("friday")) return;
    const key = "ev-friday-" + new Date().toISOString().slice(0, 10);
    if (store.get(key) || document.getElementById("fw-banner")) return;
    const b = document.createElement("div");
    b.id = "fw-banner";
    b.setAttribute("role", "alert");
    b.innerHTML = "<b>⚠️ System update required</b><span>Version 99.0.0 brings stability improvements to the user experience (by removing the user).</span>" +
      '<button type="button" class="btn" data-fw="yes">Update now</button><button type="button" class="btn btn-main" data-fw="no">DO NOT UPDATE</button>';
    document.body.appendChild(b);
    b.querySelector('[data-fw="yes"]').onclick = () => { b.querySelector("span").textContent = "Nice try. Everyone knows you never update. (Firmware Friday!)"; };
    b.querySelector('[data-fw="no"]').onclick = () => { store.set(key, "1"); b.parentNode.removeChild(b); };
  }

  function tick() { renderLive(); firmwareFriday(); }
  tick();
  renderWeek();
  renderGoal();
  setInterval(tick, 30000);
  setInterval(renderWeek, 120000);
  setInterval(renderGoal, 60000);
})();
