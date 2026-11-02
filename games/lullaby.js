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
    art: "images/lullaby/pepsipu/1.png",
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
          .lullaby-meter { display:inline-block; width:95px; height:12px; vertical-align:middle; background:#e1deed; border-radius:8px; overflow:hidden; }
          .lullaby-meter-fill { display:block; height:100%; background:#f06292; border-radius:8px; transform-origin:left; transform:scaleX(0); }
          .lullaby-mute { border:1px solid #7f86ac; border-radius:12px; padding:4px 9px; background:#e6f1fd; color:#141a2b; font:inherit; cursor:pointer; transition:transform 120ms ease, background 120ms ease; }
          .lullaby-mute:hover { background:#fde7ef; }
          .lullaby-mute:active { transform:scale(.95); }
          .lullaby-field { flex:1; min-height:180px; position:relative; }
          .lullaby-canvas { display:block; width:100%; height:100%; }
          .lullaby-lanes { position:absolute; inset:0; display:flex; }
          .lullaby-lane { flex:1; border:0; background:transparent; color:transparent; touch-action:manipulation; cursor:pointer; -webkit-tap-highlight-color:transparent; }
          .lullaby-lane:focus-visible { outline:3px solid #f06292; outline-offset:-5px; }
          .lullaby-help { margin:0; padding:5px 8px 8px; background:#f4f2fb; text-align:center; font-size:12px; font-weight:700; }
          .lullaby-start { position:absolute; top:47%; left:10%; width:80%; padding:18px; border:2px solid #141a2b; border-radius:18px; background:#fde7ef; color:#141a2b; font:600 20px "Fredoka",sans-serif; cursor:pointer; }
          .lullaby-start { transition:opacity 160ms ease, transform 160ms ease; }
          .lullaby-start:hover { transform:scale(1.02); }
          .lullaby-start:active { transform:scale(.98); }
          .lullaby-start[hidden] { display:block; opacity:0; transform:scale(.96); pointer-events:none; }
          @media (prefers-reduced-motion:reduce) { .lullaby-root * { scroll-behavior:auto; } }
        `;
        document.head.appendChild(style);
      }
      const root = document.createElement("div");
      root.className = "lullaby-root";
      root.innerHTML = '<div class="lullaby-hud"><span class="lullaby-combo">0 combo · best 0</span><label>Sleepy <span class="lullaby-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Gezine sleepiness"><span class="lullaby-meter-fill"></span></span></label><button type="button" class="lullaby-mute" aria-pressed="false">Sound on</button></div>' +
        '<div class="lullaby-field"><canvas class="lullaby-canvas" role="img" aria-label="Pepsipu sings under the moon. Lua word bubbles descend to the three-lane ribbon."></canvas><div class="lullaby-lanes"><button type="button" class="lullaby-lane" aria-label="Left lane: A, J, left arrow">Left</button><button type="button" class="lullaby-lane" aria-label="Middle lane: S, K, down arrow">Middle</button><button type="button" class="lullaby-lane" aria-label="Right lane: D, L, right arrow">Right</button></div><button type="button" class="lullaby-start" hidden>Tap to start the quiet lullaby ♪</button></div>' +
        '<p class="lullaby-help">Meet the ribbon: A S D · J K L · ← ↓ → · or tap lanes</p>';
      api.stage.appendChild(root);
      const canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
      const comboEl = root.querySelector(".lullaby-combo"), meter = root.querySelector(".lullaby-meter");
      const mute = root.querySelector(".lullaby-mute"), startButton = root.querySelector(".lullaby-start");
      const buttons = Array.prototype.slice.call(root.querySelectorAll(".lullaby-lane"));
      const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function sprites(name) {
        return [0, 1, 2, 3].map(function (i) {
          const img = new Image(); img.src = "images/lullaby/" + name + "/" + i + ".png"; return img;
        });
      }
      const pepsi = sprites("pepsipu"), gezine = sprites("gezine");
      function pose() { return { index: 0, elapsed: 0.08, from: [1, 0, 0, 0], weights: [1, 0, 0, 0] }; }
      const pepsiPose = pose(), gezinePose = pose();
      const meterFill = root.querySelector(".lullaby-meter-fill");
      // Presentation only: waking up never deducts earned points or changes the ending threshold.
      let sleepy = 0, shownSleep = 0, shownScore = 0, shownCombo = 0, shownBest = 0;
      let lastFrame = null, visualTime = 0, messageStart = 0;
      let resizePending = true, resizeObserver = null;
      let paintedScore = -1, paintedCombo = "", paintedSleep = -1;
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
      function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
      function hud(dt) {
        const blend = 1 - Math.exp(-dt * 16);
        shownScore += (score - shownScore) * blend;
        shownCombo += (combo - shownCombo) * blend;
        shownBest += (best - shownBest) * blend;
        shownSleep += (sleepy - shownSleep) * (1 - Math.exp(-dt * 7));
        const value = Math.round(shownScore), text = Math.round(shownCombo) + " combo · best " + Math.round(shownBest);
        if (paintedScore !== value) { api.score(value + " pts"); paintedScore = value; }
        if (paintedCombo !== text) { comboEl.textContent = text; paintedCombo = text; }
        meterFill.style.transform = "scaleX(" + shownSleep + ")";
        const percent = Math.round(shownSleep * 100);
        if (percent !== paintedSleep) { meter.setAttribute("aria-valuenow", String(percent)); paintedSleep = percent; }
      }
      function feedback(text, color, t) {
        message = text; messageColor = color; messageStart = t; messageUntil = t + 0.85;
      }
      function miss(note, t) {
        note.judged = true; note.exit = t; note.hit = false; combo = 0;
        sleepy = Math.max(0, sleepy - 0.035);
        feedback("Miss · the moon still loves you", "#fde7ef", t);
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
          combo = 0; sleepy = Math.max(0, sleepy - 0.015); feedback(t < INTRO - GOOD ? "Follow the falling Lua ♪" : "Gently… wait for the ribbon", "#e6f1fd", t); return;
        }
        nearest.judged = true; nearest.exit = t; nearest.hit = true; combo++; best = Math.max(best, combo);
        const base = distance <= PERFECT ? 100 : 50;
        const points = base + Math.min(50, 2 * combo);
        score += points; earned += base;
        sleepy = Math.min(1, sleepy + base / 6400);
        feedback((base === 100 ? "Perfect ♡" : "Good ♪") + " +" + points, base === 100 ? "#ffe6a6" : "#c9f4eb", t);
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
        visualTime = 0;
        startButton.hidden = true; startButton.disabled = true;
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
      function updatePose(state, index, dt) {
        if (index !== state.index) {
          state.from = state.weights.slice(); state.index = index; state.elapsed = 0;
        }
        state.elapsed += dt;
        const mix = ease(state.elapsed / 0.08);
        for (let i = 0; i < 4; i++) state.weights[i] = state.from[i] * (1 - mix) + (i === index ? mix : 0);
      }
      function character(images, state, x, y, size, name, sway, bob, lean, breath) {
        ctx.save(); ctx.translate(x + size / 2 + sway, y + size + bob); ctx.rotate(lean); ctx.scale(1, breath);
        for (let i = 0; i < 4; i++) {
          if (state.weights[i] < 0.001) continue;
          const img = images[i];
          ctx.save(); ctx.globalAlpha *= state.weights[i];
          if (img.complete && img.naturalWidth) {
            const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
            const iw = img.naturalWidth * scale, ih = img.naturalHeight * scale;
            ctx.drawImage(img, -iw / 2, -ih, iw, ih);
          } else {
            rounded(-size / 2, -size, size, size, 20, "#fde7ef", "#141a2b");
            label(name, 0, -size / 2, 14, "#141a2b");
            label(name === "gezine" ? ["♡", "yawn…", "z z", "Zzz ♡"][i] : ["♪", "♫", "♪", "♡"][i], 0, -size / 4, 16, "#71769c");
          }
          ctx.restore();
        }
        ctx.restore();
      }
      function draw(t, dt) {
        if (resizePending) {
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          resizePending = false;
          width = Math.max(1, rect.width); height = Math.max(1, rect.height); ratio = dpr;
          canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const w = width, h = height, scene = Math.min(170, h * 0.34), top = scene + 14, line = h - 48, laneW = w / 3;
        const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#555782"); sky.addColorStop(1, "#d9cce8");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 23; i++) {
          const x = ((i * 79 + 29) % 997) / 997 * w, y = 12 + ((i * 37) % 113) / 113 * scene;
          ctx.save();
          const twinkle = Math.sin(visualTime * (0.8 + i % 4 * 0.19) + i * 2.4);
          ctx.globalAlpha = 0.65 + twinkle * (reduced ? 0.12 : 0.3);
          label("✦", x, y, (8 + i % 5) * (1 + twinkle * (reduced ? 0.02 : 0.1)), "#f9eacc");
          ctx.restore();
        }
        ctx.fillStyle = "#fff0c9"; ctx.beginPath(); ctx.arc(w / 2, scene * 0.35, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#555782"; ctx.beginPath(); ctx.arc(w / 2 + 10, scene * 0.35 - 6, 20, 0, Math.PI * 2); ctx.fill();
        const size = Math.min(w * 0.24, scene * 0.9), gx = w - size - 18, gy = scene - size;
        const sleep = shownSleep, gentle = reduced ? 0.3 : 1;
        const phase = (visualTime - INTRO) / BEAT * Math.PI * 2;
        const songBeat = Math.max(0, Math.floor((t - INTRO) / BEAT));
        updatePose(pepsiPose, started && t >= INTRO && t < 75 ? [0, 1, 2, 3][songBeat % 4] : 0, dt);
        updatePose(gezinePose, sleep < 0.25 ? 0 : sleep < 0.55 ? 1 : sleep < 0.85 ? 2 : 3, dt);
        character(pepsi, pepsiPose, 18, scene - size, size, "pepsipu",
          -Math.cos(phase / 4) * size * 0.035 * gentle, Math.cos(phase) * size * 0.009 * gentle,
          -Math.cos(phase / 4) * 0.045 * gentle, 1 + Math.sin(phase / 2) * 0.012 * gentle);
        character(gezine, gezinePose, gx, gy, size, "gezine",
          Math.sin(visualTime * 0.65) * size * 0.025 * sleep * gentle,
          Math.sin(visualTime * 1.3) * size * 0.008 * gentle,
          (Math.sin(visualTime * 0.65) * 0.045 + 0.035) * sleep * gentle,
          1 + Math.sin(visualTime * 1.3) * 0.015 * gentle);
        label("pepsipu ♪", 18 + size / 2, scene + 9, 12, "#fff4fa");
        label(sleep >= 0.85 ? "gezine.sleep()" : "gezine", gx + size / 2, scene + 9, 12, "#fff4fa");
        ctx.save(); ctx.globalAlpha = (1 - ease((t - 74.8) / 0.2)) * (0.7 + 0.25 * Math.sin(phase));
        label("♪", 28 + size, scene * 0.6 + Math.sin(phase / 2) * 3 * gentle, 22, "#ffe6a6"); ctx.restore();
        for (let lane = 0; lane < 3; lane++) {
          rounded(lane * laneW + 5, top, laneW - 10, h - top - 5, 13, lane % 2 ? "rgba(230,241,253,.24)" : "rgba(253,231,239,.24)");
          const pulseAge = t - pulses[lane];
          ctx.save(); ctx.globalAlpha = ease(pulseAge / 0.04) * (1 - ease(pulseAge / 0.2));
          rounded(lane * laneW + 7, line - 24, laneW - 14, 48, 14, "rgba(255,246,211,.55)"); ctx.restore();
          label(["A · J · ←", "S · K · ↓", "D · L · →"][lane], laneW * (lane + 0.5), h - 12, Math.min(14, laneW / 8), "#30364e");
        }
        ctx.strokeStyle = "#fff4fa"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(9, line); ctx.lineTo(w - 9, line); ctx.stroke();
        chart.forEach(function (note) {
          const age = note.judged ? t - note.exit : 0;
          if (note.judged && age > 0.2) return;
          const until = note.time - (note.judged ? note.exit : t);
          if (until > 2.7 || (!note.judged && until < -GOOD)) return;
          // Ease the first part of the glide, then retain exact ribbon timing and speed.
          const progress = 1 - until / 2.7;
          const arrival = progress < 0.3 ? 0.3 * (2 * Math.pow(progress / 0.3, 2) - Math.pow(progress / 0.3, 3)) : progress;
          const y = top + 19 + arrival * (line - top - 19), x = laneW * (note.lane + 0.5), bw = Math.min(108, laneW - 16);
          const spring = note.hit ? Math.sin(age * 30) * Math.exp(-age * 10) * 0.3 : 0;
          ctx.save(); ctx.globalAlpha = ease(progress / 0.06) * (note.judged ? 1 - ease(age / 0.2) : 1);
          ctx.translate(x, y - (note.hit ? ease(age / 0.2) * 12 * (reduced ? 0.3 : 1) : 0));
          const scale = 1 + spring * (reduced ? 0.3 : 1); ctx.scale(scale, scale);
          rounded(-bw / 2, -16, bw, 32, 12, ["#fde7ef", "#e6f1fd", "#e6f6e9"][note.lane], "#71769c");
          label(note.word, 0, 5, Math.min(16, bw / 6), "#141a2b"); ctx.restore();
        });
        if (!started || t < INTRO - 0.35) {
          ctx.save(); ctx.globalAlpha = started ? 1 - ease((t - INTRO + 0.55) / 0.2) : 1;
          label(started ? "Ready… " + Math.max(1, Math.ceil((INTRO - t) / BEAT)) : "A little Lua, a lot of dreams", w / 2, top + 35, Math.min(22, w / 17), "#fff4fa"); ctx.restore();
        }
        if (t > 75) {
          ctx.save(); ctx.globalAlpha = ease((t - 75) / 0.18);
          ctx.translate(0, (1 - ctx.globalAlpha) * 8);
          rounded(15, top + 12, w - 30, 63, 16, "#f4f2fb");
          label(earned >= 4160 ? "Shhh… save file, sweet dreams ♡" : "One more bedtime story?", w / 2, top + 38, Math.min(20, w / 20), "#555782");
          label(earned >= 4160 ? "gezine is fast asleep." : "gezine is still wide awake!", w / 2, top + 59, 13, "#555782"); ctx.restore();
        } else if (t < messageUntil && t >= INTRO - 0.35) {
          ctx.save(); ctx.globalAlpha = ease((t - messageStart) / 0.08) * (1 - ease((t - messageUntil + 0.15) / 0.15));
          ctx.translate(0, (1 - ctx.globalAlpha) * 5);
          rounded(15, top + 8, w - 30, 34, 12, "#555782");
          label(message, w / 2, top + 31, Math.min(19, w / 22), messageColor); ctx.restore();
        }
      }
      function frame(timestamp) {
        if (stopped) return;
        const t = now(), dt = lastFrame === null ? 0 : Math.min(0.05, Math.max(0, (timestamp - lastFrame) / 1000));
        lastFrame = timestamp;
        // Follow the audio clock, limiting visual catch-up after a suspended tab.
        if (started) {
          const predicted = visualTime + dt;
          visualTime = predicted + Math.max(-dt, Math.min(dt, t - predicted));
        } else visualTime += dt;
        if (started) {
          expire(t);
          const second = Math.floor(t);
          if (second !== lastSecond) { lastSecond = second; api.status(Math.max(0, Math.ceil(END - t)) + "s · 80 BPM"); }
        }
        hud(dt); draw(t, dt);
        if (started && t >= END) {
          api.end(score, earned >= 4160 ? "Lua ran. Gezine slept. Sweet dreams ♡" : "return nil… gezine wants an encore!");
          return;
        }
        raf = requestAnimationFrame(frame);
      }
      api.onStop(function () {
        stopped = true; cancelAnimationFrame(raf);
        if (resizeObserver) resizeObserver.disconnect();
        listeners.forEach(function (remove) { remove(); });
        voices.forEach(function (v) { try { v.oscillator.stop(); } catch (e) {} v.oscillator.disconnect(); v.gain.disconnect(); });
        if (audio) { try { const closed = audio.close(); if (closed && closed.catch) closed.catch(function () {}); } catch (e) {} }
      });
      listen(window, "resize", function () { resizePending = true; });
      if (window.ResizeObserver) {
        resizeObserver = new window.ResizeObserver(function () { resizePending = true; });
        resizeObserver.observe(root.querySelector(".lullaby-field"));
      }
      hud(0); api.status("78s · original lullaby");
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audio = new AC(); } catch (e) {}
      if (audio) { startButton.hidden = false; unlock(); }
      else { mute.disabled = true; mute.textContent = "Silent lullaby"; begin(); }
      raf = requestAnimationFrame(frame);
    }
  });
})();
