// Good Boy Rush — fixed-length slots keep scores independent of tap speed.
(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy || !window.GezArcade) return;
  const NAMES = ["PAT!", "DODGE!", "BONK!", "TYPE!", "MATCH!", "PRESS!", "CATCH!", "DON'T UPDATE!", "PICK!", "EGGS?"];
  const POSES = ["images/headset/run0.png", "images/headset/jump2.png", "images/headset/wave2.png", "images/good/0.png"];
  const pick = (n) => Math.floor(Math.random() * n);
  const duration = (cleared, boss) => Math.max(2100, 4500 - Math.floor(cleared / 5) * 400) + (boss ? 2000 : 0);
  // A clear occupies 1000ms briefing + its full timer + 650ms result.
  // Speed cards add 850ms. Bosses replace clears 15, 30, 45. Cap: 6000pts.
  // Perfect run: >=223.55s, <=26.839634pts/s across the full round.
  // Peak award-to-award pace: 600 / (0.65 + 1 + 4.1) = 104.347827pts/s.
  // Failed bosses are retried after a different task, preserving no-repeat play.
  window.GezArcade.register({
    id: "rush", title: "Good Boy Rush", art: "images/pat/2.png", board: true, unit: "points",
    blurb: "Tiny tasks. Huge feelings. Survive a homebrew gauntlet with four hearts and absolutely no bag of eggs!",
    controls: (touch) => touch ? "Read each card! Tap choices, slide to move, use the letter pad to type. Four hearts; 45 clears wins." : "Read each card! Click or use Space, 1–3, arrows and X/A/B/Y. Type words or click letters. Four hearts; 45 clears wins.",
    start(api) {
      if (!document.getElementById("rush-style")) {
        const style = document.createElement("style");
        style.id = "rush-style";
        style.textContent = `
.rush-root{box-sizing:border-box;width:100%;max-width:960px;height:100%;min-height:310px;max-height:850px;display:flex;flex-direction:column;padding:10px;gap:7px;background:#f4f2fb;color:#141a2b;font:700 16px Nunito,sans-serif;position:relative;overflow:hidden;border-radius:18px;isolation:isolate}
.rush-root *{box-sizing:border-box}.rush-hud{display:flex;justify-content:space-between;align-items:center;gap:5px;font-size:clamp(12px,2.5vw,20px)}.rush-hearts{color:#c62828;letter-spacing:2px;white-space:nowrap}.rush-title{font:700 clamp(25px,5vw,48px) Fredoka,Nunito,sans-serif;margin:0;text-align:center;line-height:1.05}.rush-hint{text-align:center;margin:0;min-height:22px;font-size:clamp(13px,2vw,19px)}
.rush-clock{height:12px;background:#e6dbea;border:2px solid #141a2b;border-radius:10px;overflow:hidden;flex-shrink:0}.rush-fill{height:100%;width:100%;background:#f06292;transform-origin:left}.rush-arena{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;border:3px solid #141a2b;border-radius:22px;background:#fde7ef;overflow:hidden;padding:10px}.rush-footer{text-align:center;font-size:12px;margin:0}.rush-root button{font:700 clamp(16px,2.7vw,23px) Nunito,sans-serif;cursor:pointer;color:#141a2b;border:3px solid #141a2b;border-radius:16px;background:white;padding:8px;box-shadow:0 4px 0 #141a2b;touch-action:manipulation;min-height:44px}.rush-root button{transition:transform .13s ease,box-shadow .13s ease,background .16s ease}.rush-root button:hover{transform:translateY(-2px)}.rush-root button:active{box-shadow:none;transform:translateY(3px)}.rush-root button:focus-visible,.rush-input:focus{outline:4px solid #7c3aed;outline-offset:2px}.rush-root button:disabled{cursor:default;opacity:.75}.rush-root .rush-big{width:70%;max-width:260px;flex:1;min-height:0;background:#fff7fb}.rush-art{display:inline-flex;align-items:center;justify-content:center;position:relative;max-width:100%;height:100%;width:100%;min-height:0}.rush-art img{position:absolute;top:0;right:0;bottom:0;left:0;opacity:0;transition:opacity 80ms ease;width:100%;height:100%;object-fit:contain;z-index:1}.rush-fallback{position:absolute;inset:5%;display:flex;align-items:center;justify-content:center;text-align:center;background:#e6f1fd;border-radius:40%;font:700 clamp(15px,3vw,26px) Fredoka,sans-serif;padding:7px}.rush-row{display:flex;gap:8px;align-items:stretch;justify-content:center;width:100%;min-height:0}.rush-card{width:31%;height:clamp(85px,23vh,195px);display:flex;flex-direction:column;align-items:center;gap:5px}.rush-card .rush-art{flex:1}.rush-sample{height:clamp(65px,16vh,140px);width:130px;flex-shrink:1}.rush-label{font:700 clamp(24px,5vw,48px) Fredoka,sans-serif;text-align:center}.rush-progress{margin:0;font-size:21px;color:#ad2457}.rush-overlay{position:absolute;inset:0;background:#fde7ef;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:15px;text-align:center}.rush-overlay .rush-art{height:125px;width:150px}.rush-bounce{animation:rush-bounce .45s ease-out both}.rush-stamp{color:#c62828;border:5px solid #c62828;padding:4px 15px;transform:rotate(-9deg);font:700 40px Fredoka,sans-serif}.rush-field{position:absolute;inset:0;touch-action:none;user-select:none;background:linear-gradient(#e6f1fd 70%,#bce6cf 70%)}.rush-player{position:absolute;width:22%;height:28%;bottom:5%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;font-size:clamp(40px,9vw,80px)}.rush-drop{position:absolute;transform:translate(-50%,-50%);width:18%;height:18%;display:flex;align-items:center;justify-content:center;font-size:clamp(34px,8vw,65px)}.rush-letter{background:white;border:3px solid #c62828;border-radius:9px;color:#c62828;font-size:clamp(13px,3vw,25px);font-weight:900}.rush-movehint{position:absolute;bottom:1%;left:0;right:0;text-align:center;font-size:12px}.rush-diamond{display:grid;grid-template:repeat(3,54px)/repeat(3,64px);gap:5px}.rush-root .rush-X{grid-area:1/2;background:#7fb8f0}.rush-root .rush-A{grid-area:2/3;background:#f57878}.rush-root .rush-B{grid-area:3/2;background:#ffe37d}.rush-root .rush-Y{grid-area:2/1;background:#85dba5}.rush-input{font:700 22px monospace;text-align:center;width:90%;max-width:280px;padding:6px;border:3px solid #141a2b;border-radius:9px}.rush-keypad{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:440px}.rush-keypad button{min-width:44px;padding:3px}.rush-dialog{background:white;border:3px solid #141a2b;padding:12px;border-radius:14px;width:100%;max-width:430px;display:flex;align-items:center;flex-direction:column;gap:9px}.rush-root .rush-update{background:#7fb8f0;width:90%;min-height:65px}.rush-decoy{font-size:45px;flex:1;display:flex;align-items:center;justify-content:center;width:100%;border-radius:40%;background:#e6f1fd}.rush-root .rush-safe{background:#bce6cf}.rush-win{background:#d8f5df}.rush-warning{color:#c62828}
.rush-arena{display:block;padding:0;transition:background .16s ease}.rush-scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;padding:10px}.rush-scene-leaving{pointer-events:none}.rush-reaction{position:absolute;right:8px;bottom:23px;width:65px;height:65px;pointer-events:none;z-index:8}.rush-title,.rush-root> .rush-hint{display:grid}.rush-copy{grid-area:1/1}.rush-bounce{animation:none}.rush-art{transform-origin:50% 90%}.rush-overlay{opacity:0}.rush-player,.rush-drop{left:0;top:0}.rush-player{top:auto}.rush-clock{margin-right:72px}.rush-reaction{top:46px;bottom:auto}
@keyframes rush-bounce{0%{transform:scale(.8) rotate(-4deg)}65%{transform:scale(1.06) rotate(2deg)}100%{transform:scale(1)}}
@media(max-height:530px){.rush-root{gap:4px;padding:6px}.rush-title{font-size:25px}.rush-arena{padding:6px;gap:5px}.rush-card{height:100px}.rush-sample{height:65px}.rush-diamond{grid-template:repeat(3,44px)/repeat(3,54px);gap:3px}.rush-dialog{gap:6px;padding:6px}.rush-overlay .rush-art{height:90px}.rush-label{font-size:30px}}
@media(prefers-reduced-motion:reduce){.rush-bounce{animation:none}.rush-root button{transition:transform .13s ease,box-shadow .13s ease,background .16s ease}.rush-root button:hover{transform:translateY(-2px)}.rush-root button:active{transform:none}.rush-stamp{transform:none}}
`;
        document.head.appendChild(style);
      }
      const root = document.createElement("div");
      root.className = "rush-root";
      root.innerHTML = '<div class="rush-hud"><span class="rush-hearts" aria-label="4 hearts">♥♥♥♥</span><span class="rush-count">0 / 45 cleared</span><span class="rush-speed">SPEED 1</span></div><h2 class="rush-title"></h2><p class="rush-hint"></p><div class="rush-clock" role="progressbar" aria-label="Time remaining" aria-valuemin="0" aria-valuemax="100"><div class="rush-fill"></div></div><div class="rush-arena"></div><p class="rush-footer">4 hearts · bosses at 15 / 30 / 45 · 4 minute limit</p>';
      api.stage.appendChild(root);
      const arenaShell = root.querySelector(".rush-arena");
      let arena = document.createElement("div"); arena.className = "rush-scene"; arenaShell.appendChild(arena);
      const title = root.querySelector(".rush-title"), hint = root.querySelector(".rush-hint");
      const fill = root.querySelector(".rush-fill"), clock = root.querySelector(".rush-clock");
      let lives = 4, cleared = 0, bosses = 0, nextBossAt = 15, previous = -1, game = -1, boss = false;
      let stopped = false, phase = "", deadline = 0, slotStart = 0, slotLength = 0, outcome = null;
      let start = performance.now(), raf = 0, keyAction = null, move = null, tickGame = null, cleanGame = null;
      let taps = 0, playerX = 50, dropX = 50, target = 0, input = null;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const motion = [], pictures = [];
      let lastFrame = start, visualTime = 0, timerVisual = 1, displayedScore = 0;
      const smooth = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
      function enter(el, leaving) {
        let opacity = leaving ? 1 : 0;
        for (let i = motion.length - 1; i >= 0; i--) if (motion[i].el === el) {
          opacity = Number(el.style.opacity); motion.splice(i, 1);
        }
        motion.push({ el, age: 0, leaving: !!leaving, opacity });
        if (!leaving) { el.style.opacity = "0"; el.style.transform = "translateY(" + (reduced ? 3 : 18) + "px) scale(.97)"; }
      }
      function setLabel(el, value) {
        if (el.getAttribute("data-copy") === value) return;
        const old = el.querySelector(".rush-copy:last-child");
        if (old) enter(old, true);
        else el.textContent = "";
        const next = document.createElement("span"); next.className = "rush-copy"; next.textContent = value;
        el.appendChild(next); el.setAttribute("data-copy", value); enter(next);
      }
      const score = () => cleared * 100 + bosses * 500;
      function setArt(wrap, src) {
        if (wrap.getAttribute("data-src") === src) return;
        wrap.setAttribute("data-src", src);
        let img = [].slice.call(wrap.querySelectorAll("img")).filter((im) => im.getAttribute("data-src") === src)[0];
        if (!img) {
          img = document.createElement("img"); img.alt = ""; img.setAttribute("data-src", src);
          img.addEventListener("load", () => selectArt(wrap));
          img.addEventListener("error", () => selectArt(wrap));
          wrap.appendChild(img); img.src = src;
        }
        selectArt(wrap);
      }
      function selectArt(wrap) {
        const src = wrap.getAttribute("data-src"), frames = [].slice.call(wrap.querySelectorAll("img"));
        const wanted = frames.filter((im) => im.getAttribute("data-src") === src)[0];
        const ready = wanted && wanted.complete && wanted.naturalWidth;
        // Keep the previous image until its replacement has decoded.
        if (wanted && !wanted.complete) return;
        frames.forEach((im) => { im.style.opacity = im === wanted && ready ? "1" : "0"; });
        wrap.querySelector(".rush-fallback").style.opacity = ready ? "0" : "1";
      }
      function art(src, label) {
        const wrap = document.createElement("span"); wrap.className = "rush-art";
        wrap.setAttribute("role", "img"); wrap.setAttribute("aria-label", label);
        const fallback = document.createElement("span"); fallback.className = "rush-fallback"; fallback.textContent = label;
        fallback.style.transition = "opacity 80ms ease";
        wrap.appendChild(fallback); setArt(wrap, src); pictures.push(wrap); return wrap;
      }
      const reaction = document.createElement("div"); reaction.className = "rush-reaction";
      const reactionArt = art("images/rush/gezine/2.png", "Hyped gezine"); reaction.appendChild(reactionArt); root.appendChild(reaction); reaction.style.opacity = "0";
      // Load every reaction locally before its first timed appearance.
      [0, 1, 2, 3].forEach((i) => { const im = new Image(); im.src = "images/rush/gezine/" + i + ".png"; });
      let reactionState = 2, reactionScale = .9, reactionVelocity = 0, reactionOpacity = 0;
      function react(index) {
        if (reactionState === index) return;
        reactionState = index; setArt(reactionArt, "images/rush/gezine/" + index + ".png");
        reactionArt.setAttribute("aria-label", ["Victorious gezine", "Panicking gezine", "Hyped gezine", "Scared gezine"][index]); reactionVelocity -= reduced ? .5 : 2.8;
      }
      function text(s, cls, parent) {
        const el = document.createElement("div"); el.className = cls || "rush-label"; el.textContent = s; (parent || arena).appendChild(el); return el;
      }
      function button(label, fn, cls, parent) {
        const el = document.createElement("button"); el.type = "button"; el.className = cls || ""; el.textContent = label;
        el.addEventListener("click", () => { if (phase === "play" && outcome === null) { if (performance.now() >= deadline) return; fn(); } });
        (parent || arena).appendChild(el); return el;
      }
      function hud() {
        const hearts = root.querySelector(".rush-hearts"); hearts.textContent = "♥".repeat(lives) + "♡".repeat(4 - lives); hearts.setAttribute("aria-label", lives + " hearts");
        root.querySelector(".rush-count").textContent = cleared + " / 45 cleared";
        root.querySelector(".rush-speed").textContent = "SPEED " + (1 + Math.floor(cleared / 5));

      }
      function resetArena() {
        if (cleanGame) cleanGame(); cleanGame = null; keyAction = null; move = null; tickGame = null; input = null;
        const outgoing = arena;
        outgoing.classList.add("rush-scene-leaving"); outgoing.setAttribute("aria-hidden", "true");
        [].slice.call(outgoing.querySelectorAll("button,input")).forEach((el) => { el.disabled = true; });
        enter(outgoing, true);
        arena = document.createElement("div"); arena.className = "rush-scene"; arenaShell.appendChild(arena); enter(arena);
        arenaShell.classList.remove("rush-win");
      }
      function overlay(big, small, src, failure) {
        const el = document.createElement("div"); el.className = "rush-overlay";
        if (src) el.appendChild(art(src, failure ? "Scared gezine" : "gezine"));
        text(big, failure ? "rush-stamp" : "rush-label rush-bounce", el);
        text(small, "rush-hint", el); arena.appendChild(el); enter(el);
      }
      function resolve(ok, message) {
        if (phase !== "play" || outcome !== null) return;
        outcome = ok; if (input) input.blur();
        arenaShell.classList.toggle("rush-win", ok); react(ok ? 0 : 3);
        overlay(ok ? "GOOD BOY!" : "DMCA!", message || (ok ? "Tiny task. Massive talent." : "John filed a skill issue."), "images/rush/gezine/" + (ok ? 0 : 3) + ".png", !ok);
      }
      function finish(headline, now) {
        resetArena(); phase = "end";
        if (now - start < 30000) {
          phase = "cooldown"; deadline = start + 30000;
          setLabel(title, "MAILROOM TIMEOUT"); setLabel(hint, "John is processing your four tiny infractions.");
          overlay("ALL HEARTS FILED", "Score sealed: " + score() + " · next run, fewer letters!", "images/arcade/john-head.png", false);
          raf = requestAnimationFrame(frame);
        } else { stopped = true; cancelAnimationFrame(raf); api.end(score(), headline); }
      }
      function briefing(now) {
        resetArena(); hud(); outcome = null;
        boss = cleared + 1 >= nextBossAt && previous !== 10;
        if (boss) game = 10;
        else { do { game = pick(10); } while (game === previous); }
        previous = game;
        react(2);
        phase = "brief"; deadline = now + 1000;
        setLabel(title, boss ? "BOSS · BONK!" : NAMES[game]); setLabel(hint, "Read it. Do it. Be a good boy.");
        overlay(boss ? "BOSS · BONK!" : NAMES[game], lives + " hearts · " + cleared + " cleared", "images/rush/gezine/2.png", false);

      }
      function choiceRow(sources, labels, correct) {
        const row = document.createElement("div"); row.className = "rush-row"; arena.appendChild(row);
        const choose = (i) => resolve(i === correct, i === correct ? "Excellent choice!" : "That was the decoy!");
        sources.forEach((src, i) => {
          const b = button("", () => choose(i), "rush-card", row);
          if (src) b.appendChild(art(src, labels[i]));
          else text(i === 0 ? "◉ᴥ◉" : "△ᴗ△", "rush-decoy", b);
          const caption = document.createElement("span"); caption.textContent = (i + 1) + ". " + labels[i]; b.appendChild(caption);
        });
        keyAction = (k) => { if (/^[123]$/.test(k)) choose(Number(k) - 1); };
      }
      function movingGame(catching) {
        setLabel(hint, catching ? "Slide / arrows: put the headset under the note!" : "Slide / arrows: stay away from the DMCA!");
        const field = document.createElement("div"); field.className = "rush-field"; arena.appendChild(field);
        const actor = document.createElement("div"); actor.className = "rush-player"; field.appendChild(actor);
        if (catching) { actor.textContent = "🎧"; actor.setAttribute("aria-label", "Headset"); }
        else actor.appendChild(art("images/headset/run0.png", "gezine"));
        const drop = document.createElement("div"); drop.className = "rush-drop" + (catching ? "" : " rush-letter"); drop.textContent = catching ? "♫" : "DMCA"; field.appendChild(drop);
        text("← slide anywhere →", "rush-movehint", field);
        playerX = 50; dropX = 20 + pick(3) * 30;
        let visualX = 50;
        const position = (x) => { playerX = Math.max(12, Math.min(88, x)); };
        position(playerX);
        actor.style.transform = "translateX(" + (visualX / 22 * 100 - 50) + "%)";
        drop.style.transform = "translate(" + (dropX / 18 * 100 - 50) + "%, -6%)";
        move = (clientX) => { const r = field.getBoundingClientRect(); position((clientX - r.left) / Math.max(1, r.width) * 100); };
        let held = false;
        const mouseDown = (e) => { held = true; move(e.clientX); e.preventDefault(); };
        const mouseMove = (e) => { if (held && phase === "play" && outcome === null) move(e.clientX); };
        const mouseUp = () => { held = false; };
        const touch = (e) => { if (e.touches.length && phase === "play" && outcome === null) { e.preventDefault(); move(e.touches[0].clientX); } };
        field.addEventListener("mousedown", mouseDown); window.addEventListener("mousemove", mouseMove); window.addEventListener("mouseup", mouseUp);
        field.addEventListener("touchstart", touch, { passive: false }); field.addEventListener("touchmove", touch, { passive: false });
        cleanGame = () => { window.removeEventListener("mousemove", mouseMove); window.removeEventListener("mouseup", mouseUp); field.removeEventListener("mousedown", mouseDown); field.removeEventListener("touchstart", touch); field.removeEventListener("touchmove", touch); };
        keyAction = (k) => { if (k === "ArrowLeft") position(playerX - 16); if (k === "ArrowRight") position(playerX + 16); };
        let landed = false, visualFall = 0;
        tickGame = (fraction, dt) => {
          visualX += (playerX - visualX) * (1 - Math.exp(-dt * 24));
          actor.style.transform = "translate(" + (visualX / 22 * 100 - 50) + "%, " + (Math.sin(visualTime * 14) * (reduced ? 0.3 : 1.5)) + "%) rotate(" + ((playerX - visualX) * (reduced ? 0.06 : 0.3)) + "deg)";
          visualFall += Math.min(dt, Math.max(0, Math.min(1, fraction / .88) - visualFall));
          drop.style.transform = "translate(" + (dropX / 18 * 100 - 50) + "%, " + ((8 + visualFall * 69) / 18 * 100 - 50) + "%) rotate(" + (Math.sin(visualTime * 3) * (reduced ? 1 : 5)) + "deg)";
          if (fraction >= .88 && !landed) { landed = true; const hit = Math.abs(playerX - dropX) < 18; resolve(catching ? hit : !hit, catching ? (hit ? "Headset full of tunes!" : "The note missed your headset.") : (hit ? "Special delivery. Ouch." : "Return to sender!")); }
        };
      }
      function play(now) {
        resetArena(); phase = "play"; outcome = null; taps = 0;
        slotStart = now; slotLength = duration(cleared, boss); deadline = now + slotLength;
        setLabel(title, boss ? "BOSS · BONK!" : NAMES[game]);
        if (game === 0 || boss) {
          const needed = boss ? 12 : 5;
          setLabel(hint, boss ? "12 bonks before John stamps! Tap / Space." : "Five headpats! Tap gezine / Space.");
          const b = button("", tap, "rush-big"); b.setAttribute("aria-label", boss ? "Bonk John Nintendo" : "Pat gezine");
          const sprite = art(boss ? "images/arcade/john-head.png" : "images/good/0.png", boss ? "John Nintendo" : "gezine"); b.appendChild(sprite);
          const progress = text("0 / " + needed, "rush-progress");
          function tap() {
            taps++; progress.textContent = taps + " / " + needed;
            if (!boss) setArt(sprite, "images/pat/" + (taps % 4) + ".png");
            if (taps >= needed) resolve(true, boss ? "Stamp revoked! +500 boss bonus" : "Headpats successfully installed.");
          }
          keyAction = (k) => { if (k === " " || k === "Enter") tap(); };
        } else if (game === 1 || game === 6) movingGame(game === 6);
        else if (game === 2) {
          setLabel(hint, "Bonk John. Spare gezine. Tap / keys 1–3.");
          target = pick(3);
          choiceRow([0, 1, 2].map((i) => i === target ? "images/arcade/john-head.png" : "images/arcade/gezine-head.png"), ["Window", "Window", "Window"], target);
        } else if (game === 3) {
          const word = ["VAR", "PRINT", "GOTO", "VSYNC"][pick(4)];
          setLabel(hint, "Type this word, or tap its letters. Case doesn't matter.");
          text(word);
          input = document.createElement("input"); input.className = "rush-input"; input.type = "text"; input.maxLength = 8;
          input.autocomplete = "off"; input.setAttribute("autocapitalize", "characters"); input.spellcheck = false; input.setAttribute("aria-label", "Type " + word); arena.appendChild(input);
          const check = () => { if (phase === "play" && outcome === null && performance.now() < deadline && input.value.toUpperCase() === word) resolve(true, "SmileBASIC says: GOOD BOY"); };
          input.addEventListener("input", check);
          const pad = document.createElement("div"); pad.className = "rush-keypad"; arena.appendChild(pad);
          word.split("").filter((c, i, a) => a.indexOf(c) === i).sort().forEach((c) => button(c, () => { input.value += c; check(); }, "", pad));
          button("⌫", () => { input.value = input.value.slice(0, -1); }, "", pad);
          keyAction = (k) => { if (/^[a-z]$/i.test(k)) { input.value += k; check(); } if (k === "Backspace") input.value = input.value.slice(0, -1); };
          // The tap pad avoids summoning a phone keyboard over a four-second task.
        } else if (game === 4) {
          setLabel(hint, "Same pose, please! Tap / keys 1–3.");
          const pool = POSES.slice(); pool.sort(() => Math.random() - .5);
          const cards = pool.slice(0, 3); target = pick(3);
          const sample = document.createElement("div"); sample.className = "rush-sample"; sample.appendChild(art(cards[target], "Match this pose")); arena.appendChild(sample);
          choiceRow(cards, ["Pose", "Pose", "Pose"], target);
        } else if (game === 5) {
          const names = ["X", "A", "B", "Y"], wanted = names[pick(4)];
          setLabel(hint, "Tap " + wanted + ", press its key, or use its arrow.");
          text(wanted);
          const diamond = document.createElement("div"); diamond.className = "rush-diamond"; arena.appendChild(diamond);
          const press = (k) => resolve(k === wanted, k === wanted ? "Button bliss!" : "Wrong button, tiny catastrophe.");
          names.forEach((k) => button(k, () => press(k), "rush-" + k, diamond));
          keyAction = (k) => { const arrows = { ArrowUp: "X", ArrowRight: "A", ArrowDown: "B", ArrowLeft: "Y" }; const v = arrows[k] || k.toUpperCase(); if (names.indexOf(v) >= 0) press(v); };
        } else if (game === 7) {
          setLabel(hint, "Decline the update! Tap / 1 = decline, 2 = update.");
          const dialog = document.createElement("div"); dialog.className = "rush-dialog"; arena.appendChild(dialog);
          text("SYSTEM UPDATE", "rush-progress", dialog); text("New feature: fewer homebrew feelings.", "rush-hint", dialog);
          const update = button("Update now", () => resolve(false, "Your homebrew feelings were updated away."), "rush-update", dialog);
          button("Do not update", () => resolve(true, "Version: still yours."), "rush-safe", dialog);
          let lastHop = -1, shift = 0, stretch = 1;
          tickGame = (f, dt) => {
            const hop = Math.floor(f * (3 + Math.floor(cleared / 5)));
            lastHop = hop;
            const a = 1 - Math.exp(-dt * 20);
            shift += ([-8.5 / .9, 2.5 / .9, 0][lastHop % 3] - shift) * a;
            stretch += ([83 / 90, 95 / 90, 88 / 90][lastHop % 3] - stretch) * a;
            update.style.transform = "translateX(" + shift + "%) scaleX(" + stretch + ")";
          };
          keyAction = (k) => { if (k === "1") resolve(true, "Version: still yours."); if (k === "2") resolve(false, "You pressed Update now."); };
        } else if (game === 8) {
          setLabel(hint, "Who made ns2jb? Pick pepsipu! Tap / keys 1–3.");
          target = pick(3);
          choiceRow([0, 1, 2].map((i) => i === target ? "images/peek/pepsipu.png" : null), [0, 1, 2].map((i) => i === target ? "pepsipu" : (i % 2 ? "Toast bot" : "Moon bean")), target);
        } else {
          setLabel(hint, "Do NOT take the eggs. Hands off until the timer ends!");
          const eggs = button("", () => resolve(false, "you don't get a bag of eggs"), "rush-big"); eggs.setAttribute("aria-label", "Take the eggs (do not take them)");
          eggs.appendChild(art("images/eggs/bag-of-eggs.png", "A suspicious bag of eggs"));
          text("Wait. Resist. Be eggless.", "rush-progress");
          keyAction = (k) => { if (k === " " || k === "Enter") resolve(false, "you don't get a bag of eggs"); };
        }
      }
      function complete(now) {
        if (outcome === null) resolve(game === 9, game === 9 ? "You don't get a bag of eggs. Perfect." : "The timer sent a cease-and-desist.");
        if (outcome) { cleared++; if (boss) { bosses++; nextBossAt += 15; } } else lives--;
        hud(); phase = "result"; deadline = now + 650;
      }
      function frame(now) {
        if (stopped) return;
        const dt = Math.max(0, Math.min(.05, (now - lastFrame) / 1000)); lastFrame = now; visualTime += dt;
        // Substep the spring itself; gameplay continues to use the original clock.
        const steps = Math.max(1, Math.ceil(dt / .008)), step = dt / steps;
        for (let i = 0; i < steps; i++) {
          reactionVelocity += ((1 - reactionScale) * 230 - reactionVelocity * 20) * step;
          reactionScale += reactionVelocity * step;
        }
        reactionOpacity = Math.min(1, reactionOpacity + dt / .16);
        reaction.style.opacity = String(smooth(reactionOpacity));
        reaction.style.transform = "scale(" + reactionScale + ")";
        for (let i = motion.length - 1; i >= 0; i--) {
          const m = motion[i]; m.age += dt;
          const f = Math.min(1, m.age / (m.leaving ? .14 : .2)), e = smooth(f);
          const spring = 1 - Math.exp(-8 * f) * Math.cos(10 * f);
          m.el.style.opacity = String(m.leaving ? m.opacity * (1 - e) : e);
          m.el.style.transform = "translateY(" + ((m.leaving ? -e : 1 - e) * (reduced ? 3 : 18)) + "px) scale(" + (m.leaving ? 1 - .025 * e : 1 + (spring - 1) * (reduced ? .015 : .08) * (1 - e)) + ")";
          if (f >= 1) { if (m.leaving) m.el.remove(); else { m.el.style.opacity = "1"; m.el.style.transform = ""; } motion.splice(i, 1); }
        }
        for (let i = pictures.length - 1; i >= 0; i--) {
          const pic = pictures[i];
          if (!root.contains(pic)) { pictures.splice(i, 1); continue; }
          pic.style.transform = "translateY(" + (Math.sin(visualTime * 3) * (reduced ? .3 : 1.5)) + "px) scaleY(" + (1 + Math.sin(visualTime * 3) * (reduced ? .004 : .015)) + ")";
        }
        const desiredTimer = phase === "play" ? Math.max(0, 1 - (now - slotStart) / slotLength) : phase === "result" ? 0 : 1;
        timerVisual += (desiredTimer - timerVisual) * (1 - Math.exp(-dt * 24));
        fill.style.transform = "scaleX(" + timerVisual + ")";
        displayedScore += (score() - displayedScore) * (1 - Math.exp(-dt * 20)); api.score(Math.round(displayedScore) + " pts");
        const elapsed = now - start;
        if (phase === "cooldown") {
          api.status("Next run in " + Math.max(0, Math.ceil((deadline - now) / 1000)) + "s");
          if (now >= deadline) { finish("John stamped your heart out!", now); return; }
        } else if (elapsed >= 240000) { finish("Rush hour is over!", now); return; }
        else if (phase === "brief" && now >= deadline) play(now);
        else if (phase === "speed" && now >= deadline) briefing(now);
        else if (phase === "play") {
          const f = Math.min(1, (now - slotStart) / slotLength);
          if (outcome === null) react(f >= .7 ? 1 : 2);
          clock.setAttribute("aria-valuenow", Math.round(100 * (1 - f)));
          api.status(((1 - f) * slotLength / 1000).toFixed(1) + "s · " + cleared + " cleared");
          if (outcome === null && tickGame) tickGame(f, dt);
          if (now >= deadline) complete(now);
        } else if (phase === "result" && now >= deadline) {
          if (!lives || cleared >= 45) { finish(lives ? "45 clears! Certified good boy!" : "John stamped your heart out!", now); return; }
          if (outcome && cleared % 5 === 0) {
            resetArena(); phase = "speed"; deadline = now + 850;
            setLabel(title, "SPEED UP!"); setLabel(hint, "Smaller timer. Bigger feelings.");
            overlay("SPEED UP!", "Speed " + (1 + Math.floor(cleared / 5)), "images/rush/gezine/2.png", false);
            react(2);
          } else briefing(now);
        }
        if (!stopped) raf = requestAnimationFrame(frame);
      }
      api.keys((e) => {
        if (phase !== "play" || outcome !== null || performance.now() >= deadline || !keyAction) return;
        const k = e.key;
        if (/^[a-z123]$/i.test(k) || [" ", "Enter", "Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(k) >= 0) {
          e.preventDefault();
          if (!e.repeat || game === 1 || game === 6) keyAction(k);
        }
      });
      api.onStop(() => { stopped = true; cancelAnimationFrame(raf); if (cleanGame) cleanGame(); motion.length = 0; pictures.length = 0; root.remove(); });
      hud(); briefing(start); raf = requestAnimationFrame(frame);
    }
  });
})();
