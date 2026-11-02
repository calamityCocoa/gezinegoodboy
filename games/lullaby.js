(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy || !window.GezArcade) return;

  // Original composition: four 24-beat phrases, 80 BPM, no borrowed melody.
  // 64 notes. Perfect cap = 64 * 150 - 600 = 9000.
  // Minimum onset spacing .75s: sustained peak 200 points/s once combo is 25.
  // Fixed round: 3s count-in + 72s composition + 3s coda = 78s.
  const BEAT = 0.75, INTRO = 3, END = 78, PERFECT = 0.14, GOOD = 0.26;
  const LENGTHS = [1, 1, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2, 2, 2, 2];
  const PHRASES = [
    [60, 64, 67, 62, 65, 64, 69, 67, 64, 62, 65, 69, 67, 64, 62, 60],
    [65, 69, 67, 64, 62, 65, 72, 69, 67, 65, 64, 67, 62, 64, 65, 60],
    [69, 65, 72, 67, 64, 69, 65, 62, 67, 64, 60, 65, 69, 67, 62, 64],
    [67, 72, 69, 65, 67, 64, 62, 65, 64, 60, 62, 67, 65, 62, 64, 60]
  ];
  const WORDS = ["local", "false", "function", "print", "then", "nil", "return", "true", "pairs", "end", "require", "do"];

  window.GezArcade.register({
    id: "lullaby",
    title: "Lua Lullaby",
    art: "images/peek/pepsipu.png",
    blurb: "A little Lua in the save data, a little song at bedtime. Help pepsipu sing gezine to sleep!",
    unit: "points",
    board: true,
    pauses: true,
    controls: function (touch) {
      return touch ? "Tap the three lanes as word bubbles meet the ribbon. A quiet, original 78-second lullaby." :
        "Click the lanes, or use A S D / J K L / ← ↓ → as bubbles meet the ribbon. 78 seconds; quiet audio.";
    },
    start: function (api) {
      if (!document.getElementById("lullaby-style")) {
        const style = document.createElement("style");
        style.id = "lullaby-style";
        style.textContent = `
          .lullaby-root { width:100%; max-width:920px; height:100%; max-height:860px; min-height:300px; display:flex; flex-direction:column; color:#141a2b; background:#e6e4f6; border-radius:20px; overflow:hidden; font-family:"Nunito",sans-serif; position:relative; }
          .lullaby-hud { padding:8px 12px 5px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:4px 10px; font-size:13px; font-weight:800; background:#f4f2fb; }
          .lullaby-meter { width:95px; height:12px; vertical-align:middle; accent-color:#f06292; }
          .lullaby-mute { border:1px solid #7f86ac; border-radius:12px; padding:4px 9px; background:#e6f1fd; color:#141a2b; font:inherit; cursor:pointer; }
          .lullaby-field { flex:1; min-height:180px; position:relative; }
          .lullaby-canvas { display:block; width:100%; height:100%; }
          .lullaby-lanes { position:absolute; inset:0; display:flex; }
          .lullaby-lane { flex:1; border:0; background:transparent; color:transparent; touch-action:manipulation; cursor:pointer; -webkit-tap-highlight-color:transparent; }
          .lullaby-lane:focus-visible { outline:3px solid #f06292; outline-offset:-5px; }
          .lullaby-help { margin:0; padding:5px 8px 8px; background:#f4f2fb; text-align:center; font-size:12px; font-weight:700; }
          .lullaby-start { position:absolute; top:47%; left:10%; width:80%; padding:18px; border:2px solid #141a2b; border-radius:18px; background:#fde7ef; color:#141a2b; font:600 20px "Fredoka",sans-serif; cursor:pointer; }
          .lullaby-start[hidden] { display:none; }
          @media (prefers-reduced-motion:reduce) { .lullaby-root * { scroll-behavior:auto; } }
        `;
        document.head.appendChild(style);
      }
      const root = document.createElement("div");
      root.className = "lullaby-root";
      root.innerHTML = '<div class="lullaby-hud"><span class="lullaby-combo">0 combo · best 0</span><label>Sleepy <progress class="lullaby-meter" max="1" value="0" aria-label="Gezine sleepiness"></progress></label><button type="button" class="lullaby-mute" aria-pressed="false">Sound on</button></div>' +
        '<div class="lullaby-field"><canvas class="lullaby-canvas" role="img" aria-label="Pepsipu sings under the moon. Lua word bubbles descend to the three-lane ribbon."></canvas><div class="lullaby-lanes"><button type="button" class="lullaby-lane" aria-label="Left lane: A, J, left arrow">Left</button><button type="button" class="lullaby-lane" aria-label="Middle lane: S, K, down arrow">Middle</button><button type="button" class="lullaby-lane" aria-label="Right lane: D, L, right arrow">Right</button></div><button type="button" class="lullaby-start" hidden>Tap to start the quiet lullaby ♪</button></div>' +
        '<p class="lullaby-help">Meet the ribbon: A S D · J K L · ← ↓ → · or tap lanes</p>';
      api.stage.appendChild(root);
      const canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
      const comboEl = root.querySelector(".lullaby-combo"), meter = root.querySelector("progress");
      const mute = root.querySelector(".lullaby-mute"), startButton = root.querySelector(".lullaby-start");
      const buttons = Array.prototype.slice.call(root.querySelectorAll(".lullaby-lane"));
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pepsi = new Image(), gezine = new Image();
      pepsi.src = "images/peek/pepsipu.png"; gezine.src = "images/good/0.png";
      const chart = [];
      let beat = 0;
      PHRASES.forEach(function (phrase, p) {
        phrase.forEach(function (pitch, i) {
          chart.push({ time: INTRO + beat * BEAT, duration: LENGTHS[i] * BEAT,
            pitch: pitch, lane: (i + p + Math.floor(i / 3)) % 3,
            word: WORDS[(i + p * 3) % WORDS.length], judged: false });
          beat += LENGTHS[i];
        });
      });
      let audio = null, origin = 0, wallOrigin = 0, started = false, stopped = false, raf = 0;
      let score = 0, combo = 0, best = 0, earned = 0, muted = false, lastSecond = -1;
      let width = 0, height = 0, ratio = 1, lastTouch = -10;
      let message = "A Lua save-file serenade", messageUntil = 3, messageColor = "#fde7ef";
      const pulses = [-10, -10, -10], voices = [], listeners = [];
      function listen(el, event, fn, options) {
        el.addEventListener(event, fn, options);
        listeners.push(function () { el.removeEventListener(event, fn, options); });
      }
      function now() {
        if (!started) return 0;
        return audio ? audio.currentTime - origin : (performance.now() - wallOrigin) / 1000;
      }
      function hud() {
        api.score(score + " pts");
        comboEl.textContent = combo + " combo · best " + best;
        meter.value = earned / 6400;
      }
      function feedback(text, color, t) {
        message = text; messageColor = color; messageUntil = t + 0.85;
      }
      function miss(note, t) {
        note.judged = true; combo = 0;
        feedback("Miss · the moon still loves you", "#fde7ef", t); hud();
      }
      function expire(t) {
        chart.forEach(function (n) { if (!n.judged && t - n.time > GOOD) miss(n, t); });
      }
      function hit(lane) {
        if (!started || stopped) return;
        const t = now();
        if (t >= END) return;
        expire(t); pulses[lane] = t;
        let nearest = null, distance = GOOD + 0.001;
        chart.forEach(function (n) {
          const d = Math.abs(t - n.time);
          if (!n.judged && n.lane === lane && d <= GOOD && d < distance) { nearest = n; distance = d; }
        });
        if (!nearest) {
          // Empty taps break combo, preventing mash-to-win without punishing score.
          combo = 0; feedback(t < INTRO - GOOD ? "Follow the falling Lua ♪" : "Gently… wait for the ribbon", "#e6f1fd", t); hud(); return;
        }
        nearest.judged = true; combo++; best = Math.max(best, combo);
        const base = distance <= PERFECT ? 100 : 50;
        const points = base + Math.min(50, 2 * combo);
        score += points; earned += base;
        feedback((base === 100 ? "Perfect ♡" : "Good ♪") + " +" + points, base === 100 ? "#ffe6a6" : "#c9f4eb", t);
        hud();
      }
      buttons.forEach(function (button, lane) {
        listen(button, "touchstart", function (e) { e.preventDefault(); lastTouch = performance.now(); hit(lane); }, { passive: false });
        listen(button, "click", function () { if (performance.now() - lastTouch > 500) hit(lane); });
      });
      api.keys(function (e) {
        const key = String(e.key).toLowerCase();
        const map = { a: 0, j: 0, arrowleft: 0, s: 1, k: 1, arrowdown: 1, d: 2, l: 2, arrowright: 2 };
        if (Object.prototype.hasOwnProperty.call(map, key)) { e.preventDefault(); if (!e.repeat) hit(map[key]); }
      });
      function schedule() {
        chart.forEach(function (note) {
          const oscillator = audio.createOscillator(), gain = audio.createGain();
          const at = origin + note.time, duration = note.duration * 0.88;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note.pitch - 69) / 12), at);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.065, at + 0.035);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
          oscillator.connect(gain); gain.connect(audio.destination);
          oscillator.start(at); oscillator.stop(at + duration + 0.015);
          voices.push({ oscillator: oscillator, gain: gain });
        });
      }
      function begin() {
        if (started || stopped) return;
        started = true; origin = audio ? audio.currentTime : 0; wallOrigin = performance.now();
        startButton.hidden = true;
        if (audio) schedule();
      }
      function unlock() {
        if (stopped || started) return;
        if (!audio) { begin(); return; }
        try {
          const result = audio.resume();
          if (result && result.then) result.then(function () {
            if (stopped) return;
            if (audio.state === "running") begin(); else startButton.hidden = false;
          }).catch(function () { startButton.hidden = false; });
          else if (audio.state === "running") begin();
        } catch (e) { startButton.hidden = false; }
      }
      listen(startButton, "click", unlock);
      listen(mute, "click", function () {
        muted = !muted;
        // Disconnecting preserves the scheduled envelope and the shared audio clock.
        voices.forEach(function (v) { v.gain.disconnect(); if (!muted) v.gain.connect(audio.destination); });
        mute.textContent = muted ? "Sound off" : "Sound on"; mute.setAttribute("aria-pressed", String(muted));
      });
      function rounded(x, y, w, h, r, fill, stroke) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
      }
      function label(text, x, y, size, color) {
        ctx.fillStyle = color; ctx.font = '600 ' + size + 'px "Fredoka", sans-serif'; ctx.textAlign = "center"; ctx.fillText(text, x, y);
      }
      function character(img, x, y, w, h, name) {
        if (img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, h);
        else { rounded(x, y, w, h, 20, "#fde7ef", "#141a2b"); label(name, x + w / 2, y + h / 2, 14, "#141a2b"); }
      }
      function draw(t) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (width !== rect.width || height !== rect.height || ratio !== dpr) {
          width = Math.max(1, rect.width); height = Math.max(1, rect.height); ratio = dpr;
          canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const w = width, h = height, scene = Math.min(170, h * 0.34), top = scene + 14, line = h - 48, laneW = w / 3;
        const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#555782"); sky.addColorStop(1, "#d9cce8");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 23; i++) {
          const x = ((i * 79 + 29) % 997) / 997 * w, y = 12 + ((i * 37) % 113) / 113 * scene;
          label("✦", x, y, 8 + i % 5, "#f9eacc");
        }
        ctx.fillStyle = "#fff0c9"; ctx.beginPath(); ctx.arc(w / 2, scene * 0.35, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#555782"; ctx.beginPath(); ctx.arc(w / 2 + 10, scene * 0.35 - 6, 20, 0, Math.PI * 2); ctx.fill();
        const size = Math.min(w * 0.24, scene * 0.9), gx = w - size - 18, gy = scene - size;
        character(pepsi, 18, scene - size * 0.87, size, size * 0.87, "pepsipu");
        character(gezine, gx, gy, size, size * 1.05, "gezine");
        const sleep = earned / 6400;
        if (sleep > 0.15) {
          // The source eyes sit at about 31% / 47% width, 42% height.
          [0.31, 0.47].forEach(function (eye) {
            const ex = gx + size * eye, ey = gy + size * 1.05 * 0.40;
            rounded(ex - size * 0.067, ey, size * 0.135, size * 0.105 * Math.min(1, sleep / 0.65), 3, "#e1dee3");
            ctx.beginPath(); ctx.moveTo(ex - size * 0.062, ey + size * 0.1 * Math.min(1, sleep / 0.65));
            ctx.quadraticCurveTo(ex, ey + size * 0.14, ex + size * 0.062, ey + size * 0.1 * Math.min(1, sleep / 0.65));
            ctx.strokeStyle = "#343247"; ctx.lineWidth = 2; ctx.stroke();
          });
        }
        if (sleep > 0.42) {
          ctx.beginPath(); ctx.moveTo(gx + size * 0.16, gy + size * 0.23); ctx.lineTo(gx + size * 0.47, gy - size * 0.03); ctx.lineTo(gx + size * 0.69, gy + size * 0.24); ctx.closePath(); ctx.fillStyle = "#b4c8ed"; ctx.fill();
          rounded(gx + size * 0.14, gy + size * 0.2, size * 0.57, size * 0.07, 3, "#fde7ef");
          label("✦", gx + size * 0.48, gy + size * 0.03, 12, "#fff0c9");
        }
        if (sleep >= 0.65) label("z z Z", gx + size * 0.65, gy + size * 0.05, 16, "#fff0c9");
        label("pepsipu ♪", 18 + size / 2, scene + 9, 12, "#fff4fa");
        label(sleep >= 0.65 ? "gezine.sleep()" : "gezine", gx + size / 2, scene + 9, 12, "#fff4fa");
        if (t < 75) label(reduced ? "♪" : (Math.floor(t / BEAT) % 2 ? "♫" : "♪"), 28 + size, scene * 0.6, 22, "#ffe6a6");
        for (let lane = 0; lane < 3; lane++) {
          rounded(lane * laneW + 5, top, laneW - 10, h - top - 5, 13, lane % 2 ? "rgba(230,241,253,.24)" : "rgba(253,231,239,.24)");
          if (t - pulses[lane] < 0.16) rounded(lane * laneW + 7, line - 24, laneW - 14, 48, 14, "rgba(255,246,211,.55)");
          label(["A · J · ←", "S · K · ↓", "D · L · →"][lane], laneW * (lane + 0.5), h - 12, Math.min(14, laneW / 8), "#30364e");
        }
        ctx.strokeStyle = "#fff4fa"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(9, line); ctx.lineTo(w - 9, line); ctx.stroke();
        chart.forEach(function (note) {
          if (note.judged) return;
          const until = note.time - t;
          if (until > 2.7 || until < -GOOD) return;
          const y = line - until / 2.7 * (line - top - 19), x = laneW * (note.lane + 0.5), bw = Math.min(108, laneW - 16);
          rounded(x - bw / 2, y - 16, bw, 32, 12, ["#fde7ef", "#e6f1fd", "#e6f6e9"][note.lane], "#71769c");
          label(note.word, x, y + 5, Math.min(16, bw / 6), "#141a2b");
        });
        if (!started || t < INTRO - 0.35) {
          label(started ? "Ready… " + Math.max(1, Math.ceil((INTRO - t) / BEAT)) : "A little Lua, a lot of dreams", w / 2, top + 35, Math.min(22, w / 17), "#fff4fa");
        }
        if (t > 75) {
          rounded(15, top + 12, w - 30, 63, 16, "#f4f2fb");
          label(sleep >= 0.65 ? "Shhh… save file, sweet dreams ♡" : "One more bedtime story?", w / 2, top + 38, Math.min(20, w / 20), "#555782");
          label(sleep >= 0.65 ? "gezine is fast asleep." : "gezine is still wide awake!", w / 2, top + 59, 13, "#555782");
        } else if (t < messageUntil && t >= INTRO - 0.35) {
          rounded(15, top + 8, w - 30, 34, 12, "#555782");
          label(message, w / 2, top + 31, Math.min(19, w / 22), messageColor);
        }
      }
      function frame() {
        if (stopped) return;
        const t = now();
        if (started) {
          expire(t);
          const second = Math.floor(t);
          if (second !== lastSecond) { lastSecond = second; api.status(Math.max(0, Math.ceil(END - t)) + "s · 80 BPM"); }
        }
        draw(t);
        if (started && t >= END) {
          api.end(score, earned >= 4160 ? "Lua ran. Gezine slept. Sweet dreams ♡" : "return nil… gezine wants an encore!");
          return;
        }
        raf = requestAnimationFrame(frame);
      }
      api.onStop(function () {
        stopped = true; cancelAnimationFrame(raf);
        listeners.forEach(function (remove) { remove(); });
        voices.forEach(function (v) { try { v.oscillator.stop(); } catch (e) {} v.oscillator.disconnect(); v.gain.disconnect(); });
        if (audio) { try { const closed = audio.close(); if (closed && closed.catch) closed.catch(function () {}); } catch (e) {} }
      });
      hud(); api.status("78s · original lullaby");
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); } catch (e) {}
      if (audio) { startButton.hidden = false; unlock(); }
      else { mute.disabled = true; mute.textContent = "Silent lullaby"; begin(); }
      raf = requestAnimationFrame(frame);
    }
  });
})();
