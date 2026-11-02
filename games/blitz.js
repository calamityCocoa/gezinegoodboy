(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy || !window.GezArcade) return;

  const HEADLINES = [
    "Nintendo patches the concept of fun in firmware 22.0",
    "John Nintendo DMCAs his own reflection",
    "Switch 2 now asks for ID before you blow on a cartridge",
    "Firmware update adds 3 new ways to brick your console",
    "pepsipu's ns2jb spotted. Nintendo lawyers scramble jets",
    "gezine finds an exploit in a 24-year-old racing game",
    "Nintendo trademarks the words jail and break",
    "SmileBASIC confirmed as the most powerful app on Switch 2",
    "Nintendo Account now requires a pinky promise",
    "John Nintendo buys 40,000 cease-and-desist envelopes",
    "Nintendo: please stop having fun we didn't sell you",
    "Firmware 99.0 removes turning it off and on again",
    "Exploit found in a strategy game. Nintendo bans history",
    "ETA WEN? Officially: Soon(tm)",
    "Nintendo patents the act of patenting",
    "John Nintendo seen DMCAing a hut in the middle of nowhere",
    "Homebrew ships more features than the last three updates",
    "Game-Key Card revealed to be a key to nothing",
    "Do not update your Switch 2, says everyone",
    "Bag of eggs not included"
  ];

  // Scoring audit: 10..20 m/s (linear ramp over 100 s), +6 m/s in boost.
  // Scoops are 80 m apart, first at 60 m; collect only at their centre crossing.
  // Plushes: 400 + 480*n m. In 180 s at most six full 4 s boosts fit:
  // integral(base speed)=3100 m, plus 144 m = 3244 m; 40 scoops + 324 pts
  // = 1324 maximum. No score cap. At most 28 pts in ANY one-second window
  // (one 25-pt scoop, at most three distance points). Speed-rate bound:
  // 26/80*25 + 26/10 = 10.725 pts/s; discrete awards arrive in bursts.
  window.GezArcade.register({
    id: "blitz",
    title: "Better Gaming Blitz",
    art: "images/headset/run1.png",
    blurb: "Scoop Switch 2 news and outrun John Nintendo! Double-jump the paperwork, slide under DMCAs, and hug pepsipu for an ns2jb boost. A three-minute news dash.",
    unit: "points",
    board: true,
    controls: (touch) => touch
      ? "Tap the top two thirds to jump; tap again to double-jump. Hold for height. Tap the bottom third or swipe down to slide. John can catch you after 30 seconds!"
      : "Space / Up / W or gamepad A: jump (twice!), hold for height. Down / S or gamepad Down / B: slide. Mouse: upper two thirds jump, bottom third slide. John can catch you after 30 seconds!",
    start(api) {
      if (!document.getElementById("blitz-style")) {
        const style = document.createElement("style");
        style.id = "blitz-style";
        style.textContent = ".blitz-wrap{position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;background:#e6f1fd;touch-action:none;user-select:none;-webkit-user-select:none}.blitz-canvas{display:block;width:100%;height:100%;touch-action:none}";
        document.head.appendChild(style);
      }
      const wrap = document.createElement("div");
      wrap.className = "blitz-wrap";
      const canvas = document.createElement("canvas");
      canvas.className = "blitz-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Better Gaming Blitz. Jump over firmware crates and paywalls; slide under DMCA letters. Collect newspapers and pepsipu plushes.");
      wrap.appendChild(canvas);
      api.stage.appendChild(wrap);
      const ctx = canvas.getContext("2d");
      if (!ctx) { api.end(0, "The news canvas couldn't open!"); return; }
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const art = {};
      ["run", "jump", "trip"].forEach((pose) => {
        art[pose] = [];
        for (let i = 0; i < 4; i++) {
          const im = new Image(); im.src = "images/headset/" + pose + i + ".png";
          art[pose].push(im);
        }
      });
      art.john = new Image(); art.john.src = "images/arcade/john-head.png";
      art.plush = new Image(); art.plush.src = "images/peek/pepsipu.png";
      const STEP = 1 / 120, LIMIT = 180, PX = 12;
      let width = 900, height = 500, ground = 390, runnerX = 190;
      let elapsed = 0, ticks = 0, distance = 0, scoops = 0, score = 0;
      let y = 0, vy = 0, jumps = 0, slide = 0, trip = 0, immunity = 0, boost = 0;
      let gap = 112, held = false, jumpHeldFor = 0, stopped = false;
      let nextScoop = 60, nextHazard = 100, nextPlush = 400;
      let objects = [], particles = [], deck = [], headline = "", headlineUntil = 0;
      let notice = "A scoop chase! 3 minutes to make the news.", noticeUntil = 5;
      let frame = 0, last = null, bank = 0, hudTick = -1;
      let mouseHeld = false, touchId = null, touchY = 0, swiped = false;
      let keyboardJump = false, padJump = false, padSlide = false;
      const listeners = [];

      function listen(target, name, fn, options) {
        target.addEventListener(name, fn, options);
        listeners.push(() => target.removeEventListener(name, fn, options));
      }
      function resize() {
        const w = Math.max(1, wrap.clientWidth || api.stage.clientWidth);
        const h = Math.max(1, wrap.clientHeight || api.stage.clientHeight);
        // A consistent playfield keeps hazards legible and reaction time fair on phones.
        const scale = Math.max(0.01, Math.min(w / 560, h / 440));
        width = w / scale; height = h / scale;
        ground = height - 74; runnerX = Math.min(215, width * 0.32);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      }
      function shuffleNews() {
        deck = HEADLINES.slice();
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const a = deck[i]; deck[i] = deck[j]; deck[j] = a;
        }
      }
      function jump() {
        if (stopped || document.hidden || jumps >= 2 || trip > 0.3) return;
        slide = 0; vy = jumps ? 440 : 475; jumps++; jumpHeldFor = 0;
        if (jumps === 2) burst(runnerX, ground - y - 12, "#7fb8f0", 8);
      }
      function doSlide() {
        if (stopped || document.hidden) return;
        slide = 0.8;
        if (y > 0) vy = Math.min(vy, -550);
      }
      function burst(x, py, color, count) {
        if (reduced) return;
        for (let i = 0; i < count; i++) {
          particles.push({ x, y: py, vx: (Math.random() - 0.5) * 130,
            vy: -40 - Math.random() * 100, life: 0.5, color });
        }
      }
      function syncHud() {
        score = scoops * 25 + Math.floor((distance + 1e-7) / 10);
        api.score(score + " pts");
        api.status(Math.floor(distance + 1e-7) + " m · " + scoops + " scoops · " + Math.ceil(LIMIT - elapsed) + "s");
      }
      function finish(caught) {
        syncHud(); stopped = true;
        api.end(score, caught ? "John Nintendo caught you!" : "News delivered! John Nintendo missed the scoop.");
      }
      function inputPosition(clientY) {
        const r = canvas.getBoundingClientRect();
        return clientY - r.top >= r.height * 2 / 3;
      }
      api.keys((e) => {
        const k = String(e.key).toLowerCase();
        if ([" ", "arrowup", "w", "arrowdown", "s"].indexOf(k) < 0) return;
        e.preventDefault();
        if (e.repeat) return;
        if (k === "arrowdown" || k === "s") doSlide();
        else { keyboardJump = true; held = true; jump(); }
      });
      listen(window, "keyup", (e) => {
        if ([" ", "arrowup", "w"].indexOf(String(e.key).toLowerCase()) >= 0) {
          keyboardJump = false; held = mouseHeld || touchId !== null || padJump;
        }
      });
      listen(canvas, "mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (inputPosition(e.clientY)) doSlide();
        else { mouseHeld = true; held = true; jump(); }
      });
      listen(window, "mouseup", () => { mouseHeld = false; held = keyboardJump || touchId !== null || padJump; });
      listen(canvas, "touchstart", (e) => {
        e.preventDefault();
        if (touchId !== null || !e.changedTouches.length) return;
        const t = e.changedTouches[0]; touchId = t.identifier; touchY = t.clientY; swiped = false;
        if (inputPosition(t.clientY)) { swiped = true; doSlide(); }
        else { held = true; jump(); }
      }, { passive: false });
      listen(canvas, "touchmove", (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === touchId && !swiped && t.clientY - touchY > 28) {
            swiped = true; held = false; doSlide();
          }
        }
      }, { passive: false });
      function touchEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            touchId = null; held = keyboardJump || mouseHeld || padJump;
          }
        }
      }
      listen(canvas, "touchend", touchEnd, { passive: false });
      listen(canvas, "touchcancel", touchEnd, { passive: false });
      function clearInput() {
        held = keyboardJump = mouseHeld = padJump = padSlide = false; touchId = null;
        last = null; bank = 0;
      }
      listen(window, "blur", clearInput);
      listen(document, "visibilitychange", clearInput);
      listen(window, "resize", resize);
      function gamepad() {
        if (!navigator.getGamepads) return;
        let pads;
        try { pads = navigator.getGamepads(); } catch (e) { return; }
        let a = false, down = false;
        for (let i = 0; i < pads.length; i++) {
          const p = pads[i];
          if (!p) continue;
          a = a || !!(p.buttons[0] && p.buttons[0].pressed);
          down = down || !!(p.buttons[1] && p.buttons[1].pressed) ||
            !!(p.buttons[13] && p.buttons[13].pressed) || p.axes[1] > 0.6;
        }
        if (a && !padJump) jump();
        if (down && !padSlide) doSlide();
        padJump = a; padSlide = down;
        held = a || keyboardJump || mouseHeld || (touchId !== null && !swiped);
      }

      function update(dt) {
        // Derive time from fixed ticks to avoid drift at the 30 s and 180 s boundaries.
        const oldDistance = distance, oldTime = elapsed;
        elapsed = Math.min(LIMIT, ++ticks / 120);
        dt = elapsed - oldTime;
        const base0 = 10 + Math.min(10, oldTime / 10);
        const base1 = 10 + Math.min(10, elapsed / 10);
        const boostTime = Math.min(boost, dt);
        distance += (base0 + base1) * 0.5 * dt + 6 * boostTime;
        boost = Math.max(0, boost - dt);
        slide = Math.max(0, slide - dt); trip = Math.max(0, trip - dt);
        immunity = Math.max(0, immunity - dt);
        const gravity = held && vy > 0 && jumpHeldFor < 0.24 ? 760 : 1450;
        jumpHeldFor += dt;
        if (jumps || y > 0) {
          vy -= gravity * dt; y += vy * dt;
          if (y <= 0) { y = 0; vy = 0; jumps = 0; }
        }
        const ahead = (width - runnerX + 180) / PX;
        while (nextScoop < distance + ahead) {
          objects.push({ kind: "news", at: nextScoop, high: Math.random() < 0.3 ? 120 : 68, done: false });
          nextScoop += 80;
        }
        while (nextHazard < distance + ahead) {
          objects.push({ kind: ["crate", "letter", "gate"][Math.floor(Math.random() * 3)], at: nextHazard, done: false });
          nextHazard += 80;
        }
        while (nextPlush < distance + ahead) {
          objects.push({ kind: "plush", at: nextPlush, high: 65, done: false });
          nextPlush += 480;
        }
        const bodyHeight = slide > 0 && y < 12 ? 30 : 85;
        objects.forEach((o) => {
          if (o.done) return;
          const offset = (o.at - distance) * PX;
          if (o.kind === "news" || o.kind === "plush") {
            if (oldDistance < o.at && distance >= o.at) {
              o.done = true;
              if (o.high + 18 >= y && o.high - 18 <= y + bodyHeight) {
                if (o.kind === "news") {
                  scoops++;
                  if (!deck.length) shuffleNews();
                  headline = deck.pop(); headlineUntil = elapsed + 2;
                  burst(runnerX, ground - o.high, "#f06292", 10);
                } else {
                  boost = 4;
                  notice = "pepsipu's ns2jb boost! 4 seconds of sparkle power"; noticeUntil = elapsed + 4;
                  burst(runnerX, ground - y - 45, "#b39ddb", 16);
                }
              }
            }
          } else {
            const half = o.kind === "gate" ? 24 : 32;
            const low = o.kind === "letter" ? 47 : 0;
            const high = o.kind === "letter" ? 87 : o.kind === "gate" ? 112 : 55;
            if (Math.abs(offset) < half + 17 && y < high - 3 && y + bodyHeight > low + 3) {
              o.done = true;
              if (boost > 0) burst(runnerX + offset, ground - 45, "#b39ddb", 10);
              else if (immunity <= 0) {
                gap = Math.max(0, gap - 45);
                trip = 0.9; immunity = 1.1;
                notice = "Oops! Paperwork! John gained ground."; noticeUntil = elapsed + 1.7;
                burst(runnerX, ground - y - 25, "#f06292", 6);
              }
            }
          }
        });
        objects = objects.filter((o) => (o.at - distance) * PX > -runnerX - 100);
        // Clean running builds breathing room; repeated trips erase it.
        if (trip <= 0) gap = Math.min(126, gap + dt * 2.2);
        if (elapsed >= 30 && gap <= 0) { finish(true); return; }
        particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.life -= dt; });
        particles = particles.filter((p) => p.life > 0);
        if (Math.floor(elapsed * 5) !== hudTick) { hudTick = Math.floor(elapsed * 5); syncHud(); }
        if (elapsed >= LIMIT - 1e-8) finish(false);
      }

      const INK = "#141a2b";
      function box(x, py, w, h, color, radius) {
        const r = Math.min(radius || 10, w / 2, h / 2);
        ctx.beginPath(); ctx.moveTo(x + r, py); ctx.lineTo(x + w - r, py);
        ctx.quadraticCurveTo(x + w, py, x + w, py + r); ctx.lineTo(x + w, py + h - r);
        ctx.quadraticCurveTo(x + w, py + h, x + w - r, py + h); ctx.lineTo(x + r, py + h);
        ctx.quadraticCurveTo(x, py + h, x, py + h - r); ctx.lineTo(x, py + r);
        ctx.quadraticCurveTo(x, py, x + r, py); ctx.closePath();
        ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      }
      function text(s, x, py, size, color, align) {
        ctx.fillStyle = color || INK; ctx.font = "600 " + size + "px Nunito, sans-serif";
        ctx.textAlign = align || "left"; ctx.fillText(s, x, py);
      }
      function heart(x, py, s, color) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, py + s);
        ctx.bezierCurveTo(x - s * 2, py - s * 0.2, x - s * 0.5, py - s, x, py - s * 0.25);
        ctx.bezierCurveTo(x + s * 0.5, py - s, x + s * 2, py - s * 0.2, x, py + s); ctx.fill();
      }
      function sparkle(x, py, s, color) {
        ctx.fillStyle = color; ctx.beginPath();
        ctx.moveTo(x, py - s); ctx.lineTo(x + s * 0.28, py - s * 0.28);
        ctx.lineTo(x + s, py); ctx.lineTo(x + s * 0.28, py + s * 0.28);
        ctx.lineTo(x, py + s); ctx.lineTo(x - s * 0.28, py + s * 0.28);
        ctx.lineTo(x - s, py); ctx.lineTo(x - s * 0.28, py - s * 0.28); ctx.closePath(); ctx.fill();
      }
      function imageOr(im, x, py, w, h, label, color) {
        if (im && im.complete && im.naturalWidth) {
          const scale = Math.min(w / im.naturalWidth, h / im.naturalHeight);
          const iw = im.naturalWidth * scale, ih = im.naturalHeight * scale;
          ctx.drawImage(im, x + (w - iw) / 2, py + h - ih, iw, ih);
        } else { box(x, py, w, h, color, 20); text(label, x + w / 2, py + h * 0.6, 17, INK, "center"); }
      }
      function newspaper(x, py) {
        ctx.save(); ctx.translate(x, py); ctx.rotate(reduced ? 0 : Math.sin(elapsed * 3 + x) * 0.07);
        box(-21, -23, 42, 46, "#fffdf4", 5);
        text("NEWS", 0, -10, 10, "#c62828", "center");
        ctx.fillStyle = "#7fb8f0"; ctx.fillRect(-14, -4, 12, 11);
        ctx.fillStyle = "#b5a9c9";
        for (let i = 0; i < 3; i++) ctx.fillRect(3, -3 + i * 5, 12, 2);
        text("• ᴗ •", 0, 19, 12, INK, "center"); ctx.restore();
      }
      function wrapped(s, x, py, maxWidth, size) {
        ctx.font = "600 " + size + "px Nunito, sans-serif";
        let line = "", n = 0;
        s.split(" ").forEach((word) => {
          const next = line ? line + " " + word : word;
          if (ctx.measureText(next).width > maxWidth && line) {
            text(line, x, py + n * (size + 5), size); n++; line = word;
          } else line = next;
        });
        text(line, x, py + n * (size + 5), size);
      }
      function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#e6f1fd"; ctx.fillRect(0, 0, width, height);
        // Slow parallax clouds; no full-screen flashes or shake.
        for (let i = 0; i < 8; i++) {
          const cx = ((i * 193 - distance * (reduced ? 0.12 : 0.65)) % (width + 230) + width + 230) % (width + 230) - 110;
          const cy = 122 + (i % 3) * 49;
          ctx.fillStyle = "#fff"; ctx.beginPath();
          ctx.ellipse(cx, cy, 58, 19, 0, 0, Math.PI * 2);
          ctx.ellipse(cx - 17, cy - 12, 25, 23, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + 16, cy - 9, 30, 26, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#dbefe4";
        for (let i = 0; i < Math.ceil(width / 240) + 2; i++) {
          const x = i * 240 - distance * 1.4 % 240;
          ctx.beginPath(); ctx.ellipse(x, ground + 40, 190, 112, 0, Math.PI, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "#fde7ef"; ctx.fillRect(0, ground, width, height - ground);
        ctx.fillStyle = "#e1b6cd"; ctx.fillRect(0, ground, width, 4);
        for (let i = 0; i < Math.ceil(width / 65) + 2; i++) {
          const x = i * 65 - (distance * PX % 65);
          heart(x, ground + 29 + (i % 2) * 14, 4, "#f3b6cc");
        }
        objects.forEach((o) => {
          if (o.done) return;
          const x = runnerX + (o.at - distance) * PX;
          if (x < -90 || x > width + 90) return;
          const bob = reduced ? 0 : Math.sin(elapsed * 4 + o.at) * 3;
          if (o.kind === "news") {
            newspaper(x, ground - o.high);
            sparkle(x + 27, ground - o.high - 25, 5, "#f06292");
          } else if (o.kind === "plush") {
            ctx.fillStyle = "#e9ddff"; ctx.beginPath(); ctx.arc(x, ground - 65, 35, 0, Math.PI * 2); ctx.fill();
            imageOr(art.plush, x - 27, ground - 95 + bob, 54, 56, "p", "#fff");
            text("ns2jb", x, ground - 105 + bob, 13, INK, "center");
            sparkle(x + 34, ground - 84, 8, "#f06292");
          } else if (o.kind === "crate") {
            box(x - 32, ground - 55, 64, 55, "#ffddba", 7);
            ctx.strokeStyle = "#d99e78"; ctx.beginPath(); ctx.moveTo(x - 27, ground - 9); ctx.lineTo(x + 27, ground - 48); ctx.stroke();
            box(x - 37, ground - 46, 74, 32, "#fff7e9", 4);
            text("FIRMWARE", x, ground - 33, 10, INK, "center"); text("UPDATE", x, ground - 20, 10, INK, "center");
          } else if (o.kind === "letter") {
            box(x - 32, ground - 87, 64, 40, "#fff", 6);
            ctx.strokeStyle = "#e7a8c2"; ctx.beginPath(); ctx.moveTo(x - 30, ground - 85);
            ctx.lineTo(x, ground - 66); ctx.lineTo(x + 30, ground - 85); ctx.stroke();
            text("DMCA", x, ground - 53, 13, "#c62828", "center");
            text("↓ slide", x, ground - 99, 12, INK, "center");
          } else {
            box(x - 24, ground - 112, 11, 112, "#b8a4d9", 4);
            box(x + 13, ground - 112, 11, 112, "#b8a4d9", 4);
            box(x - 40, ground - 109, 80, 28, "#f9d4e5", 5);
            text("PAYWALL", x, ground - 90, 12, INK, "center");
            heart(x, ground - 56, 9, "#f06292");
          }
        });
        const bob = reduced ? 0 : Math.sin(elapsed * 13) * 3;
        // Gap is both the chase meter and John's actual position.
        const johnX = runnerX - gap - 49;
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(johnX - 13, ground - 12);
        ctx.lineTo(johnX - 17 + Math.sin(elapsed * 13) * 7, ground - 2);
        ctx.moveTo(johnX + 13, ground - 12); ctx.lineTo(johnX + 17 - Math.sin(elapsed * 13) * 7, ground - 2); ctx.stroke();
        imageOr(art.john, johnX - 40, ground - 74 + bob, 80, 62, "John", "#f06292");
        text("JOHN", Math.max(26, johnX), ground + 61, 11, INK, "center");
        if (boost > 0) {
          ctx.fillStyle = "#dfd0f5"; ctx.beginPath(); ctx.ellipse(runnerX, ground - y - 48, 59, 61, 0, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 6; i++) sparkle(runnerX - 60 - i * 13, ground - y - 20 - (i % 3) * 21,
            4 + (reduced ? 0 : Math.sin(elapsed * 7 + i) * 2), i % 2 ? "#f06292" : "#aa8bc7");
        }
        const pose = trip > 0 ? "trip" : jumps ? "jump" : "run";
        const im = art[pose][Math.floor(elapsed * (pose === "run" ? 11 : 8)) % 4];
        const sliding = slide > 0 && y < 12;
        const gh = sliding ? 38 : trip > 0 ? 65 : 112;
        imageOr(im, runnerX - 55, ground - y - gh + (jumps || sliding || reduced ? 0 : bob), 110, gh, "gezine", "#fde7ef");
        if (trip > 0) sparkle(runnerX + 32, ground - y - 90, 8, "#f06292");
        particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2); sparkle(p.x, p.y, 4, p.color); });
        ctx.globalAlpha = 1;
        // The banner reserves enough space for every exact headline on a 320px phone.
        box(12, 12, width - 24, 94, "#fffafc", 14);
        text(headlineUntil > elapsed ? "SWITCH 2 NEWS  +25" : "BETTER GAMING BLITZ", 26, 35, 15, "#c62828");
        wrapped(headlineUntil > elapsed ? headline : "Scoop the news. Dodge the paperwork. Keep homebrew cute!", 26, 59, width - 52, 17);
        box(14, 117, 160, 44, "#fffafc", 10);
        text(elapsed < 30 ? "PRESS PASS · " + Math.ceil(30 - elapsed) + "s" : "JOHN'S DISTANCE", 24, 134, 11);
        ctx.fillStyle = "#efc8d9"; ctx.fillRect(25, 143, 136, 7);
        ctx.fillStyle = gap < 40 ? "#c62828" : "#7fb8f0"; ctx.fillRect(25, 143, 136 * gap / 126, 7);
        if (boost > 0) text("ns2jb  " + boost.toFixed(1) + "s", width - 22, 137, 18, "#7853a6", "right");
        if (noticeUntil > elapsed) {
          box(12, height - 53, width - 24, 40, "#fffafc", 10);
          wrapped(notice, 24, height - 29, width - 48, 14);
        } else text("TOP ⅔: JUMP / DOUBLE JUMP     •     BOTTOM ⅓: SLIDE", width / 2, height - 20, 12, "#675370", "center");
        if (document.hidden) text("Paused", width / 2, height / 2, 24, INK, "center");
      }
      function loop(now) {
        if (stopped) return;
        if (document.hidden) { last = null; bank = 0; }
        else {
          gamepad();
          if (last !== null) bank += Math.min(0.1, Math.max(0, (now - last) / 1000));
          last = now;
          while (bank >= STEP && !stopped) { update(STEP); bank -= STEP; }
          if (!stopped) draw();
        }
        if (!stopped) frame = requestAnimationFrame(loop);
      }
      api.onStop(() => {
        stopped = true; cancelAnimationFrame(frame);
        listeners.forEach((remove) => remove());
        objects = []; particles = [];
      });
      resize(); syncHud(); draw(); frame = requestAnimationFrame(loop);
    }
  });
})();
