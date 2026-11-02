(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy || !window.GezArcade) return;

  // Leaderboard bounds: score <= 2500, round >= 30 s => <= 83 1/3 pts/s.
  // The first 30 s verify the cartridge; an early result waits with its score frozen.
  const CAP = 2500, MIN_MS = 30000, MAX_MS = 300000;
  const W = 8, H = 6, TECH = [12, 30, 55, 85];
  const NAMES = ["Userland", "Kernel", "Hypervisor", "Untethered"];
  const INK = "#141a2b", PINK = "#f06292", RED = "#c62828";

  function addStyle() {
    if (document.getElementById("empires-style")) return;
    const style = document.createElement("style");
    style.id = "empires-style";
    style.textContent = `
      .empires-root { width:100%; max-width:580px; margin:auto; color:#141a2b; font:13px Nunito,sans-serif; box-sizing:border-box; }
      .empires-root * { box-sizing:border-box; }
      .empires-root button { font:inherit; cursor:pointer; color:#141a2b; touch-action:manipulation; }
      .empires-root button:focus { outline:3px solid #5939a5; outline-offset:1px; }
      .empires-title { font:22px Fredoka,sans-serif; margin:0 0 6px; text-align:center; }
      .empires-intro { text-align:center; margin:6px 0 12px; }
      .empires-choices { display:flex; gap:8px; }
      .empires-leader { flex:1; border:2px solid #f06292; border-radius:18px; padding:10px 5px; background:#fde7ef; min-width:0; }
      .empires-leader:nth-child(2) { background:#e6f1fd; border-color:#7fb8f0; }
      .empires-leader strong,.empires-leader small { display:block; }
      .empires-leader strong { font:19px Fredoka,sans-serif; margin:6px 0; }
      .empires-portrait { display:inline-flex; position:relative; width:70px; height:80px; align-items:flex-start; justify-content:center; padding-top:2px; vertical-align:middle; }
      .empires-portrait::before { content:""; position:absolute; bottom:0; width:56px; height:35px; border-radius:18px 18px 6px 6px; background:#475b83; border:2px solid #141a2b; }
      .empires-portrait::after { content:"★　★"; position:absolute; bottom:12px; font-size:12px; color:#ffe19b; }
      .empires-initial { width:50px; height:50px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#f8b8d0; border:2px solid #141a2b; font:28px Fredoka,sans-serif; z-index:1; }
      .empires-portrait img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; z-index:2; }
      .empires-portrait img[hidden] { display:none; }
      .empires-mini { width:30px; height:34px; padding:0; flex:none; }
      .empires-mini .empires-initial { width:28px; height:28px; font-size:17px; }
      .empires-mini::before { width:26px; height:16px; }
      .empires-mini::after { display:none; }
      .empires-top { display:flex; justify-content:space-between; align-items:center; gap:5px; margin-bottom:5px; }
      .empires-badge { display:flex; align-items:center; gap:5px; font-weight:900; }
      .empires-tech { border-radius:12px; background:#e6f1fd; padding:6px 8px; margin-bottom:6px; }
      .empires-track { display:flex; justify-content:space-between; font-size:11px; gap:3px; }
      .empires-tech-step { opacity:.55; }
      .empires-tech-done { opacity:1; color:#794375; font-weight:900; }
      .empires-tech progress { display:block; width:100%; height:9px; margin:4px 0; accent-color:#f06292; }
      .empires-tech-line { display:flex; justify-content:space-between; font-size:11px; }
      .empires-board { display:grid; grid-template-columns:repeat(8,minmax(0,1fr)); gap:3px; padding:4px; border-radius:12px; background:#d3cbe3; }
      .empires-cell { position:relative; height:clamp(32px,7vw,49px); min-height:32px; padding:0; border:2px solid transparent; border-radius:6px; background:#e3efd6; overflow:hidden; }
      .empires-water { background:#b8daf5; }
      .empires-mountain { background:#d8d5df; }
      .empires-cartridge { background:#fff1b9; }
      .empires-own { border-bottom-color:#f06292; background:#fde7ef; }
      .empires-enemy { border-bottom-color:#c62828; background:#f8d8d4; }
      .empires-cell.empires-cartridge { background:#fff1b9; }
      .empires-reach { border:2px dashed #6847a0; }
      .empires-selected { border:2px solid #141a2b; box-shadow:inset 0 0 0 2px #fff; }
      .empires-cursor { outline:2px solid #5939a5; outline-offset:1px; z-index:1; }
      .empires-terrain { position:absolute; top:0; left:2px; font-size:13px; line-height:1.1; color:#526c59; }
      .empires-piece { position:relative; display:inline-block; font-size:22px; line-height:1.2; text-shadow:0 1px white; }
      .empires-unit { position:absolute; bottom:0; right:0; border-radius:5px 0 3px 0; background:#f06292; color:#141a2b; font-size:11px; line-height:14px; padding:0 2px; font-weight:900; }
      .empires-lawyer { background:#c62828; color:white; }
      .empires-spent { opacity:.5; }
      .empires-info { min-height:35px; padding:5px 2px; font-size:12px; }
      .empires-actions { display:flex; gap:7px; }
      .empires-action { flex:1; min-height:38px; border:2px solid #141a2b; border-radius:12px; padding:5px; background:#fde7ef; font-weight:900!important; }
      .empires-action:last-child { background:#e6f1fd; }
      .empires-action:disabled { opacity:.45; cursor:default; }
      .empires-log { border-radius:10px; background:#f4f2fb; padding:6px; margin-top:6px; min-height:30px; font-size:12px; }
      .empires-rules { font-size:11px; margin-top:6px; }
      .empires-rules summary { cursor:pointer; font-weight:900; padding:5px 0; }
      .empires-rules p { margin:5px 0; }
      .empires-result { text-align:center; padding:16px 8px; border:2px solid #f06292; background:#fde7ef; border-radius:16px; }
      .empires-result strong { display:block; font:22px Fredoka,sans-serif; }
      @media (prefers-reduced-motion:no-preference) { .empires-reach { animation:empires-glow 1.5s ease-in-out infinite alternate; } @keyframes empires-glow { to { box-shadow:inset 0 0 7px #c9a7e5; } } }
      @media (max-width:360px) { .empires-track { font-size:9px; } .empires-root { font-size:12px; } .empires-cell { border-radius:4px; } }
    `;
    document.head.appendChild(style);
  }

  function portrait(who, mini) {
    const wrap = document.createElement("span");
    wrap.className = "empires-portrait" + (mini ? " empires-mini" : "");
    const initial = document.createElement("span");
    initial.className = "empires-initial";
    initial.textContent = who.charAt(0).toUpperCase();
    wrap.appendChild(initial);
    const img = document.createElement("img");
    img.alt = who + " in a little leader outfit";
    let tried = false;
    img.addEventListener("error", function () {
      if (who === "john" && !tried) {
        tried = true;
        img.src = "images/arcade/john-head.png";
      } else img.hidden = true;
    });
    img.src = "images/empires/" + who + "-leader.png";
    wrap.appendChild(img);
    return wrap;
  }

  function neighbors(i) {
    const x = i % W, y = Math.floor(i / W), out = [];
    if (x > 0) out.push(i - 1);
    if (x < W - 1) out.push(i + 1);
    if (y > 0) out.push(i - W);
    if (y < H - 1) out.push(i + W);
    return out;
  }
  function mirror(i) { return Math.floor(i / W) * W + (W - 1 - i % W); }
  function pass(t) { return t.kind !== "water" && t.kind !== "mountain"; }
  function makeMap() {
    // Reflection gives both sides identical distances and terrain. Reject islands.
    for (;;) {
      const tiles = Array.from({ length:48 }, () => ({ kind:"grass", owner:0, hut:0, build:0, hq:false }));
      const r = Math.random() < .5 ? 1 : 2;
      [r * W + 2, (5 - r) * W + 2].forEach(i => {
        tiles[i].kind = "cartridge";
        tiles[mirror(i)].kind = "cartridge";
      });
      const eligible = [];
      for (let i = 0; i < 48; i++) {
        const x = i % W, y = Math.floor(i / W);
        if (x < 4 && !(x <= 1 && y >= 1 && y <= 4) && tiles[i].kind === "grass") eligible.push(i);
      }
      for (let n = 0; n < 4; n++) {
        const at = Math.floor(Math.random() * eligible.length), i = eligible.splice(at, 1)[0];
        tiles[i].kind = tiles[mirror(i)].kind = n < 2 ? "water" : "mountain";
      }
      const seen = new Set([16]), queue = [16];
      for (let n = 0; n < queue.length; n++) neighbors(queue[n]).forEach(i => {
        if (pass(tiles[i]) && !seen.has(i)) { seen.add(i); queue.push(i); }
      });
      if (seen.size !== 40) continue;
      [16,23].forEach((i, n) => {
        tiles[i].hut = tiles[i].owner = n + 1;
        tiles[i].hq = n + 1;
        neighbors(i).forEach(j => { if (pass(tiles[j])) tiles[j].owner = n + 1; });
      });
      return tiles;
    }
  }

  window.GezArcade.register({
    id:"empires", title:"Exploit Empires", art:"images/peek/gezine.png", board:true, unit:"points",
    blurb:"gezine found an exploit in a strategy cartridge! Grow a tiny homebrew empire before John Nintendo patches the party.",
    controls:touch => touch ? "Pick a leader. Tap a Hacker, then a dashed tile. Found huts or end your turn below." : "Click a Hacker, then a dashed tile. Arrows: cursor; Enter: select; H: found hut; E: end turn. Pick leader with 1 or 2.",
    start(api) {
      addStyle();
      const root = document.createElement("div");
      root.className = "empires-root";
      api.stage.appendChild(root);
      const started = Date.now();
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let stopped = false, leader = null, tiles = [], units = [], serial = 0;
      let turn = 1, research = 0, level = 0, selected = null, cursor = 16;
      let busy = false, outcome = null, finalScore = 0, lastLog = "", view = null;
      let lastTap = -Infinity;
      api.onStop(() => { stopped = true; });

      function score(win) {
        const land = tiles.filter(t => t.owner === 1).length;
        const carts = tiles.filter(t => t.owner === 1 && t.kind === "cartridge").length;
        return Math.min(CAP, land * 10 + carts * 60 + level * 250 + (win ? 1000 + (25 - turn) * 20 : 0));
      }
      function countHuts(side) { return tiles.filter(t => t.hut === side).length; }
      function unitAt(i) { return units.find(u => u.pos === i); }
      function newUnit(pos, side) { units.push({ id:++serial, pos:pos, side:side, moves:0 }); }
      function income() {
        let n = countHuts(1) * 2 + (leader === "gezine" ? 1 : 0);
        tiles.forEach((t, i) => {
          if (t.owner === 1 && t.kind === "cartridge") {
            const u = unitAt(i);
            n += 3 + (u && u.side === 1 ? 2 : 0);
          }
        });
        return n;
      }
      function say(text) { lastLog = text; if (view) view.log.textContent = text; }
      function pop(i, text, color) {
        if (!view || stopped || reduced) return;
        const r = view.cells[i].getBoundingClientRect(), s = api.stage.getBoundingClientRect();
        api.pop(r.left - s.left + r.width / 2, r.top - s.top + 8, text, color);
      }
      function finish(win, headline) {
        if (outcome || stopped) return;
        outcome = { win:win, headline:headline };
        busy = true;
        finalScore = score(win);
        render();
        settle();
      }
      function settle() {
        if (stopped || !outcome) return;
        const left = Math.max(0, Math.ceil((MIN_MS - (Date.now() - started)) / 1000));
        api.score(finalScore + " pts");
        api.status(left ? "Verifying cartridge · " + left + "s" : "Cartridge verified");
        if (!left) { api.end(finalScore, outcome.headline); return; }
        view.info.textContent = outcome.headline + " Score locked: " + finalScore + ". Cartridge verification: " + left + "s.";
      }
      function tick() {
        if (stopped) return;
        if (outcome) { settle(); return; }
        const elapsed = Date.now() - started;
        if (elapsed >= MAX_MS) {
          if (!leader) { api.end(0, "The cartridge fell asleep. Pick a leader next time!"); return; }
          finish(false, "Patch deadline! Your homebrew legacy: " + score(false));
          return;
        }
        const seconds = Math.ceil((MAX_MS - elapsed) / 1000);
        api.status(leader ? "Turn " + turn + "/25 · " + Math.floor(seconds / 60) + ":" + ("0" + seconds % 60).slice(-2) : "Choose your leader · 1 or 2");
      }
      api.every(200, tick);
      api.score("0 pts");
      tick();

      root.innerHTML = '<h2 class="empires-title">A tiny empire. A very big exploit.</h2><p class="empires-intro">Pick your cartridge commander</p><div class="empires-choices"></div><p class="empires-intro">Pink = you · red = John Nintendo<br>Research the four-link exploit or capture John’s HQ.</p>';
      const choices = root.querySelector(".empires-choices");
      ["gezine","pepsipu"].forEach((who, n) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "empires-leader";
        b.appendChild(portrait(who, false));
        const name = document.createElement("strong"); name.textContent = (n + 1) + ". " + who; b.appendChild(name);
        const description = document.createElement("small");
        description.textContent = n ? "Bootstrapper · Huts make a Hacker every 2 turns" : "Bug Hunter · +1 research each turn";
        b.appendChild(description);
        b.addEventListener("click", () => begin(who)); choices.appendChild(b);
      });

      function begin(who) {
        if (leader || stopped) return;
        leader = who;
        tiles = makeMap();
        [16,17,24].forEach(i => newUnit(i, 1));
        [23,22,31].forEach(i => newUnit(i, 2));
        units.forEach(u => { u.moves = u.side === 1 ? 2 : 0; });
        selected = units[1].id;
        root.innerHTML = '<div class="empires-top"><span class="empires-badge empires-you"></span><b class="empires-turn"></b><span class="empires-badge empires-john"></span></div>' +
          '<div class="empires-tech"><div class="empires-track"></div><progress max="85" value="0" aria-label="Exploit research"></progress><div class="empires-tech-line"><span class="empires-research"></span><span class="empires-counts"></span></div></div>' +
          '<div class="empires-board" role="group" aria-label="Empire map: 8 columns, 6 rows"></div><div class="empires-info" role="status" aria-live="polite"></div>' +
          '<div class="empires-actions"><button type="button" class="empires-action empires-found">Found hut [H]</button><button type="button" class="empires-action empires-end">End turn [E]</button></div><div class="empires-log" role="status" aria-live="polite"></div>' +
          '<details class="empires-rules"><summary>How to play · terrain & score</summary><p>Arrows move the cursor; Enter selects. Tap a pink H, then a dashed tile. H = Hacker, L = Lawyer, ⌂ = Hut, ★ = HQ, ▣ = cartridge. Pink/red underlines mark ownership. Mountains ▲ and water ≈ block movement.</p>' +
          '<p>Hackers get 2 steps per turn. An attack uses all remaining steps: Hacker 3 vs Lawyer 2; each rolls 0 or 1. Defender wins ties, +1 when defending a Hut. No health to track! Entering enemy ground claims it; an empty enemy Hut is captured. Capture John’s ★ to win. Lose your last Hut and you lose.</p>' +
          '<p>Founding consumes a Hacker with at least 1 step, on grass, away from every Hut (no adjacent Huts). Found while below 5 pink Huts; captures can exceed this. Huts add 2 research and make Hackers every 3 turns (pepsipu: 2). Max 10 units per side; blocked spawns wait.</p>' +
          '<p>Owned cartridges add 3 research, +2 with a Hacker parked on them. Bank research to unlock Userland (12), Kernel (30), Hypervisor (55), Untethered (85). Income arrives after John’s turn; newborn Hackers can move next turn.</p>' +
          '<p>10 per owned tile + 60 per cartridge + 250 per completed tech. Win: +1000 and +20 per unused turn. Score cap 2500. Turn 25 or 5 minutes ends the round. Early results wait for the 30-second cartridge check. Most expeditions take 3–5 minutes.</p></details>';
        root.querySelector(".empires-you").appendChild(portrait(who, true));
        root.querySelector(".empires-you").appendChild(document.createTextNode(who));
        root.querySelector(".empires-john").appendChild(portrait("john", true));
        root.querySelector(".empires-john").appendChild(document.createTextNode("John"));
        view = {
          cells:[], board:root.querySelector(".empires-board"), info:root.querySelector(".empires-info"),
          log:root.querySelector(".empires-log"), found:root.querySelector(".empires-found"),
          end:root.querySelector(".empires-end"), turn:root.querySelector(".empires-turn"),
          track:root.querySelector(".empires-track"), progress:root.querySelector("progress"),
          research:root.querySelector(".empires-research"), counts:root.querySelector(".empires-counts")
        };
        for (let i = 0; i < 48; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.addEventListener("click", () => { cursor = i; select(i); });
          view.board.appendChild(b); view.cells.push(b);
        }
        view.found.addEventListener("click", found);
        view.end.addEventListener("click", endTurn);
        say("gezine found the cartridge exploit! Race John’s Lawyers to the glowing ▣ tiles.");
        render(); tick();
      }

      // Breadth-first paths allow a two-step move to turn corners, but never pass a unit.
      function reachable(u) {
        const result = {}, queue = [{ pos:u.pos, cost:0 }], seen = new Set([u.pos]);
        for (let q = 0; q < queue.length; q++) {
          const node = queue[q];
          if (node.cost >= u.moves) continue;
          neighbors(node.pos).forEach(i => {
            if (seen.has(i) || !pass(tiles[i])) return;
            seen.add(i);
            const other = unitAt(i);
            if (other && other.side === u.side) return;
            result[i] = node.cost + 1;
            if (!other) queue.push({ pos:i, cost:node.cost + 1 });
          });
        }
        return result;
      }
      function canFound(u) {
        return u && u.side === 1 && u.moves > 0 && tiles[u.pos].kind === "grass" && !tiles[u.pos].hut &&
          countHuts(1) < 5 && !neighbors(u.pos).some(i => tiles[i].hut);
      }
      function render() {
        if (!view || stopped) return;
        const u = units.find(v => v.id === selected), reach = u && !busy ? reachable(u) : {};
        tiles.forEach((t, i) => {
          const b = view.cells[i], v = unitAt(i);
          b.className = "empires-cell empires-" + t.kind + (t.owner === 1 ? " empires-own" : t.owner === 2 ? " empires-enemy" : "") +
            (reach[i] ? " empires-reach" : "") + (u && u.pos === i ? " empires-selected" : "") + (cursor === i ? " empires-cursor" : "");
          const terrain = t.kind === "water" ? "≈" : t.kind === "mountain" ? "▲" : t.kind === "cartridge" ? "▣" : "·";
          b.innerHTML = '<span class="empires-terrain">' + terrain + '</span><span class="empires-piece">' + (t.hut ? (t.hq ? "★" : "⌂") : "") + '</span>' +
            (v ? '<span class="empires-unit' + (v.side === 2 ? " empires-lawyer" : "") + (v.moves ? "" : " empires-spent") + '">' + (v.side === 1 ? "H" : "L") + (v.side === 1 ? v.moves : "") + '</span>' : "");
          b.setAttribute("aria-label", "Column " + (i % W + 1) + ", row " + (Math.floor(i / W) + 1) + ", " + t.kind + ", " +
            (t.owner === 1 ? "your tile" : t.owner === 2 ? "John’s tile" : "unclaimed") +
            (t.hut ? (t.hq ? ", HQ" : ", Hut") + ", build " + t.build : "") +
            (v ? ", " + (v.side === 1 ? "Hacker, " + v.moves + " steps" : "Lawyer") : "") + (reach[i] ? ", reachable" : ""));
          b.setAttribute("aria-pressed", u && u.pos === i ? "true" : "false");
        });
        view.track.innerHTML = NAMES.map((n, i) => '<span class="empires-tech-step' + (i < level ? " empires-tech-done" : "") + '">' + (i < level ? "♥ " : "") + n + '</span>').join("");
        view.progress.value = research;
        view.research.textContent = research + "/" + (TECH[level] || 85) + " research · +" + income() + "/turn";
        view.counts.textContent = countHuts(1) + " Huts · " + tiles.filter(t => t.owner === 1 && t.kind === "cartridge").length + "/4 ▣";
        view.turn.textContent = "Turn " + turn + "/25";
        view.found.disabled = busy || !canFound(u);
        view.end.disabled = busy;
        view.end.textContent = busy ? (outcome ? "Cartridge check…" : "John is patching…") : "End turn [E]";
        view.info.textContent = busy ? (outcome ? outcome.headline : "John’s Lawyers are on the move…") : u ? "Hacker: " + u.moves + " steps. Tap a dashed tile." + (canFound(u) ? " Can found a Hut here." : "") : "Tap a pink H to select a Hacker. Dashed borders show legal moves.";
        view.log.textContent = lastLog;
        api.score((outcome ? finalScore : score(false)) + " pts");
      }
      function move(u, i, cost) {
        const defender = unitAt(i);
        if (defender) {
          const attack = (u.side === 1 ? 3 : 2) + Math.floor(Math.random() * 2);
          const defense = (defender.side === 1 ? 3 : 2) + (tiles[i].hut === defender.side ? 1 : 0) + Math.floor(Math.random() * 2);
          u.moves = 0;
          const won = attack > defense;
          say((u.side === 1 ? "Hack" : "DMCA") + " " + attack + " vs " + defense + " · " + (won ? "attacker wins!" : "defender holds!"));
          pop(i, attack + " vs " + defense + (won ? " ♡ poof!" : " ♡ held!"), won && u.side === 1 ? PINK : RED);
          units = units.filter(v => v.id !== (won ? defender.id : u.id));
          if (!won) return;
        } else u.moves -= cost;
        u.pos = i;
        const t = tiles[i];
        if (t.owner !== u.side && t.kind === "cartridge") { say(u.side === 1 ? "Cartridge claimed! Park a Hacker here for +2 research." : "John claimed a cartridge. How rude."); pop(i, "▣ claimed!", u.side === 1 ? PINK : RED); }
        t.owner = u.side;
        if (t.hut && t.hut !== u.side) {
          t.hut = u.side; t.build = 0;
          say(u.side === 1 ? "A Hut joins the homebrew party!" : "DMCA delivered! John took a Hut.");
          if (t.hq === 2 && u.side === 1) { finish(true, "John’s HQ runs homebrew now! ♡"); return; }
          if (!countHuts(1)) finish(false, "Last Hut DMCA’d. The cartridge remembers you. ♡");
        }
      }
      function select(i) {
        if (busy || stopped || !leader) return;
        const v = unitAt(i), u = units.find(n => n.id === selected);
        if (v && v.side === 1) { selected = v.id; render(); return; }
        const reach = u ? reachable(u) : {};
        if (u && reach[i]) move(u, i, reach[i]);
        else { selected = null; say("Choose a pink H. Mountains, water and friendly units block your path."); }
        render();
      }
      function found() {
        if (busy || stopped) return;
        const u = units.find(v => v.id === selected);
        if (!canFound(u)) { say("Found on grass with a step left, away from other Huts (max 5)."); return; }
        tiles[u.pos].hut = tiles[u.pos].owner = 1;
        tiles[u.pos].build = 0;
        units = units.filter(v => v.id !== u.id);
        selected = null;
        say("Cozy Hut founded! +2 research each turn. Your Hacker is now its resident.");
        pop(u.pos, "⌂ home sweet home", PINK); render();
      }
      function production(side) {
        tiles.forEach((t, i) => {
          if (t.hut !== side) return;
          const period = side === 1 && leader === "pepsipu" ? 2 : 3;
          t.build = Math.min(period, t.build + 1);
          if (t.build < period || units.filter(u => u.side === side).length >= 10) return;
          const spawn = [i].concat(neighbors(i)).find(j => pass(tiles[j]) && !unitAt(j) && (!tiles[j].hut || tiles[j].hut === side) && tiles[j].owner !== (side === 1 ? 2 : 1));
          if (spawn === undefined) return;
          t.build = 0; newUnit(spawn, side); tiles[spawn].owner = side;
          pop(spawn, side === 1 ? "+ Hacker ♡" : "+ Lawyer", side === 1 ? PINK : RED);
        });
      }
      function aiStep(u) {
        // Distance fields prefer unclaimed cartridges, then vulnerable Huts.
        const goals = [];
        tiles.forEach((t, i) => {
          if (t.kind === "cartridge" && t.owner !== 2) goals.push({ pos:i, value:0 });
          if (t.hut === 1) goals.push({ pos:i, value:2 });
        });
        if (!goals.length) return;
        const dist = new Array(48).fill(Infinity), queue = [];
        goals.forEach(g => { dist[g.pos] = g.value; queue.push(g.pos); });
        // Relaxation handles the small goal bias without requiring a heap.
        for (let q = 0; q < queue.length; q++) {
          const i = queue[q];
          neighbors(i).forEach(j => {
            if (pass(tiles[j]) && dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; queue.push(j); }
          });
        }
        const options = neighbors(u.pos).filter(i => {
          const v = unitAt(i);
          return pass(tiles[i]) && (!v || v.side === 1);
        });
        options.sort((a, b) => dist[a] - dist[b]);
        if (!options.length) return;
        // Only attack a Hacker when the Lawyer can win, or it blocks an objective.
        let target = options[0];
        const easy = options.find(i => !unitAt(i) && dist[i] <= dist[target] + 1);
        if (unitAt(target) && !tiles[target].hut && easy !== undefined && dist[easy] < dist[u.pos]) target = easy;
        move(u, target, 1);
      }
      function endTurn() {
        if (busy || stopped || !leader || Date.now() - lastTap < 250) return;
        lastTap = Date.now(); busy = true; selected = null;
        const lawyers = units.filter(u => u.side === 2).map(u => u.id);
        say("John Nintendo: ‘That cartridge looks suspiciously fun.’"); render();
        let at = 0;
        function next() {
          if (stopped || outcome) return;
          if (at < lawyers.length) {
            const u = units.find(v => v.id === lawyers[at++]);
            if (u) { u.moves = 1; aiStep(u); render(); }
            if (!outcome) api.after(reduced ? 35 : 110, next);
            return;
          }
          // AI expands from a Lawyer, sacrificing it to open another red Hut.
          if (turn % 4 === 0 && countHuts(2) < 3) {
            const settler = units.find(u => u.side === 2 && tiles[u.pos].kind === "grass" && !tiles[u.pos].hut && !neighbors(u.pos).some(i => tiles[i].hut));
            if (settler) { tiles[settler.pos].hut = 2; tiles[settler.pos].build = 0; units = units.filter(u => u.id !== settler.id); }
          }
          research = Math.min(85, research + income());
          while (level < 4 && research >= TECH[level]) { level++; say(NAMES[level - 1] + " unlocked! The cartridge sparkles. ♡"); }
          if (level === 4) { finish(true, "Untethered jailbreak achieved!"); return; }
          if (turn === 25) { finish(false, "Patch day! Your tiny empire made its mark. ♡"); return; }
          production(1); production(2);
          turn++;
          units.forEach(u => { u.moves = u.side === 1 ? 2 : 0; });
          busy = false; render(); tick();
        }
        api.after(reduced ? 35 : 110, next);
      }
      api.keys(e => {
        const k = String(e.key).toLowerCase();
        if (["arrowleft","arrowright","arrowup","arrowdown","enter","h","e","1","2"].indexOf(k) < 0) return;
        // Let normal Enter/Space activate focused native action and leader buttons.
        if (k === "enter" && e.target && e.target.tagName === "BUTTON" && !e.target.classList.contains("empires-cell")) return;
        e.preventDefault();
        if (e.repeat || stopped) return;
        if (!leader) { if (k === "1" || k === "2") begin(k === "1" ? "gezine" : "pepsipu"); return; }
        if (busy) return;
        if (k === "h") { found(); return; }
        if (k === "e") { endTurn(); return; }
        if (k === "enter") { select(cursor); return; }
        if (k === "arrowleft" && cursor % W > 0) cursor--;
        if (k === "arrowright" && cursor % W < W - 1) cursor++;
        if (k === "arrowup" && cursor >= W) cursor -= W;
        if (k === "arrowdown" && cursor < W * (H - 1)) cursor += W;
        render(); view.cells[cursor].focus({ preventScroll:true });
      });
    }
  });
})();
