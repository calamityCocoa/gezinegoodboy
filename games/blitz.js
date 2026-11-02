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
  const INK = "#141a2b", NAVY = "#1f2a4d", WHITE = "#fdfdfd";
  const HAIR = "#d9d9de", PINK = "#f4a7c0", SKIN = "#fff1ea";
  const TAU = Math.PI * 2;
  // Contact, down, passing, up; mirrored for the other foot. Angles are
  // authored joints, not frame images. The drawing is held at 12 poses/sec.
  const RUN = [
    [0.95, -0.35, -0.9, 0.45, 0], [0.65, 0.85, -0.65, 0.25, 3],
    [-0.3, 1.55, 0.05, 0.08, -1], [-0.8, 1.05, 0.7, 0.2, -4],
    [-0.9, 0.45, 0.95, -0.35, 0], [-0.65, 0.25, 0.65, 0.85, 3],
    [0.05, 0.08, -0.3, 1.55, -1], [0.7, 0.2, -0.8, 1.05, -4]
  ];
  // Anchors copied from images/blitz/meta.json; use one scale for every pose.
  const SPRITES = {
    run: { w: 298, h: 292, anchorX: 158.5, groundY: 288.1 },
    jump: { w: 270, h: 334, anchorX: 135.5, groundY: 330.2 },
    moves: { w: 353, h: 290, anchorX: 204.5, groundY: 285.7 },
    trip: { w: 342, h: 300, anchorX: 180, groundY: 296.2 },
    jrun: { w: 537, h: 392, anchorX: 329, groundY: 385.2 },
    jgrab: { w: 496, h: 507, anchorX: 294.5, groundY: 501.7 }
  };
  const SPRITE_SCALE = 120 / 280;
  let spritesLoaded = 0, spritesFailed = false;
  Object.keys(SPRITES).forEach(function (name) {
    const sheet = SPRITES[name]; sheet.frames = [];
    for (let i = 0; i < 4; i++) {
      const image = new Image(); sheet.frames.push(image);
      image.onload = function () {
        if (image.naturalWidth !== sheet.w || image.naturalHeight !== sheet.h) spritesFailed = true;
        spritesLoaded++;
        if (spritesReady()) updateMenuArt();
      };
      image.onerror = function () { spritesFailed = true; };
      image.src = "images/blitz/" + name + "/" + i + ".png";
    }
  });
  function spritesReady() { return spritesLoaded === 24 && !spritesFailed; }
  function sprite(name, frame, x, y, lean, squash) {
    const sheet = SPRITES[name];
    ctx.save(); ctx.translate(x, y);
    if (lean) ctx.rotate(lean);
    ctx.scale(SPRITE_SCALE * (squash ? 1.08 : 1), SPRITE_SCALE * (squash ? 0.9 : 1));
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sheet.frames[frame], -sheet.anchorX, -sheet.groundY, sheet.w, sheet.h);
    ctx.restore();
  }
  function shadow(x, y, radius) {
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.ellipse(x, y + 3, radius, 4, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  let ctx, drawing = 0, mark = 0;
  function wobble(n) {
    const v = Math.sin(n * 127.1 + drawing * 37.7) * 43758.5453;
    return (v - Math.floor(v) - 0.5) * 0.35;
  }
  function outline(color) {
    mark++;
    ctx.fillStyle = color; ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6 + wobble(mark * 4); ctx.lineJoin = ctx.lineCap = "round";
  }
  function oval(x, y, rx, ry, color) {
    outline(color); x += wobble(mark); y += wobble(mark + 1);
    ctx.beginPath(); ctx.ellipse(x, y, rx + wobble(mark + 2), ry + wobble(mark + 3), 0, 0, TAU);
    ctx.fill(); ctx.stroke();
  }
  function box(x, y, w, h, color, r) {
    outline(color); x += wobble(mark); y += wobble(mark + 1);
    r = Math.min(r || 6, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function poly(color) {
    outline(color); ctx.beginPath();
    for (let i = 1; i < arguments.length; i += 2) {
      const x = arguments[i] + wobble(mark + i), y = arguments[i + 1] + wobble(mark + i + 1);
      if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function line(x, y, x2, y2, color, width) {
    mark++; const j = wobble(mark);
    ctx.lineCap = "round"; ctx.strokeStyle = color || INK;
    ctx.lineWidth = (width || 2.5) + j;
    ctx.beginPath(); ctx.moveTo(x + j, y); ctx.lineTo(x2, y2 + j); ctx.stroke();
  }
  function label(s, x, y, size, color, align) {
    ctx.font = "700 " + size + "px Nunito, sans-serif";
    ctx.fillStyle = color || INK; ctx.textAlign = align || "center"; ctx.fillText(s, x, y);
  }
  function star(x, y, r, color) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, d = i % 2 ? r * 0.28 : r;
      if (!i) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath(); ctx.fill();
  }
  function heart(x, y, r) {
    ctx.fillStyle = PINK; ctx.beginPath(); ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x - r * 2, y, x - r, y - r * 1.5, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r, y - r * 1.5, x + r * 2, y, x, y + r); ctx.fill();
  }
  function limb(x, y, len, a, bend, color, shoe) {
    const kx = x + Math.sin(a) * len, ky = y + Math.cos(a) * len;
    const ex = kx + Math.sin(a + bend) * len, ey = ky + Math.cos(a + bend) * len;
    line(x, y, kx, ky, INK, 10); line(kx, ky, ex, ey, INK, 9);
    line(x, y, kx, ky, color, 5.5); line(kx, ky, ex, ey, color, 5);
    if (shoe) oval(ex + 3, ey, 9, 4.5, WHITE);
    else oval(ex, ey, 4.5, 4.5, SKIN);
  }
  // Feet at (0,0), crown at -116. Every pose shares the same little rig.
  function girl(x, y, t, mode, phase, boost, reduced, speed) {
    phase = Math.floor(phase * 12) / 12;
    const qt = Math.floor(t * 12) / 12;
    const pace = (speed || 10) / 10, pose = RUN[Math.floor(t * (12 + Math.min(1.6, pace - 1) * 3)) % 8];
    let a = pose[0], b = pose[1], c = pose[2], d = pose[3], bob = pose[4];
    let lean = 0.045 + Math.min(1.6, pace - 1) * 0.045, squash = 1, arm = -a * 0.85, otherArm = -c * 0.85;
    let head = 0, trail = -3 - pace * 2 + Math.sin(qt * 9 - 0.8) * 3, rotate = 0;
    const swing = reduced ? 0 : Math.sin(qt * 9 - 1.1) * 3;
    if (mode === "idle") {
      a = -0.08; b = 0.12; c = 0.13; d = -0.15; arm = 0.1; otherArm = -0.15;
      bob = Math.sin(qt * 3) * 1.2; lean = 0; trail = Math.sin(qt * 3) * 2;
    } else if (mode === "anticipate" || mode === "land") {
      a = -0.8; b = 1.5; c = 0.6; d = -0.8; squash = 0.82; bob = 10;
      arm = -0.9; otherArm = 0.6; head = 3;
    } else if (mode === "rise") {
      a = -0.4; b = 0.9; c = 0.3; d = 0.3; squash = 1.07; bob = 0;
      arm = -2.5; otherArm = -1.8; trail = -8;
    } else if (mode === "apex" || mode === "spin") {
      a = -1.2; b = 1.9; c = 1.1; d = -1.8; arm = -1.8; otherArm = 1.7;
      bob = 0; trail = 8; lean = -0.1;
      if (mode === "spin") rotate = reduced ? -0.12 : -TAU * Math.min(1, phase / 0.42);
    } else if (mode === "fall") {
      a = -0.45; b = 0.6; c = 0.55; d = -0.5; arm = -1.4; otherArm = 1.5;
      trail = 10; bob = 0; lean = -0.1;
    } else if (mode === "slide") {
      a = 1.25; b = -0.05; c = -1.2; d = 1.5; arm = -2.4; otherArm = 0.9;
      rotate = -0.95; bob = 38; lean = 0.3; trail = -14;
    } else if (mode === "trip") {
      rotate = phase < 0.22 ? 0.7 : phase < 0.57 ? 1.38 : (0.9 - phase) * 2;
      bob = phase < 0.22 ? 10 : phase < 0.57 ? 48 : 22;
      a = -1; b = 1.2; c = 0.7; d = 0.8; arm = -1.8; otherArm = -1.9;
    } else if (mode === "caught") {
      rotate = -0.3; bob = -5; a = 0.8; b = 0.7; c = -0.9; d = 1.1;
      arm = -2.2 + Math.sin(qt * 25) * 0.5; otherArm = 2.3; trail = -8;
    }
    ctx.save(); ctx.translate(x, y + bob); ctx.translate(0, -46); ctx.rotate(rotate);
    ctx.scale(1 / squash, squash); ctx.translate(0, 46); ctx.rotate(lean);
    // Back hair and trailing locks, then back limbs.
    oval(-5 + trail * 0.5, -77 + head, 31, 32, HAIR);
    // Soft trailing locks overlap the main hair mass; only their tips lag.
    outline(HAIR); ctx.beginPath(); ctx.moveTo(-28, -94);
    ctx.bezierCurveTo(-42, -78, -36 + trail, -50, -24 + trail, -47);
    ctx.quadraticCurveTo(-18 + trail, -56, -13, -77); ctx.closePath(); ctx.fill(); ctx.stroke();
    outline(HAIR); ctx.beginPath(); ctx.moveTo(17, -95);
    ctx.bezierCurveTo(36, -81, 33 + trail, -53, 22 + trail, -49);
    ctx.quadraticCurveTo(15 + trail, -59, 12, -78); ctx.closePath(); ctx.fill(); ctx.stroke();
    line(-29 + trail * 0.5, -72, -26 + trail, -55, "#b8b8c5", 1.3);
    line(25 + trail * 0.5, -74, 23 + trail, -57, "#b8b8c5", 1.3);
    limb(-8, -36, 15, c, d, NAVY, true);
    function armRig(ax, angle) {
      ctx.save(); ctx.translate(ax, -66); ctx.rotate(-angle);
      oval(0, 7, 6, 10, NAVY);
      box(-6, 11, 12, 6, WHITE, 3); oval(0, 19, 5, 5, SKIN);
      ctx.restore();
    }
    armRig(-15, otherArm);
    limb(7, -36, 15, a, b, NAVY, true);
    // One A-line silhouette with a connected scalloped petticoat underneath.
    const hem = swing + trail * 0.12;
    outline(WHITE); ctx.beginPath(); ctx.moveTo(-23 + hem, -42);
    ctx.quadraticCurveTo(hem, -38, 24 + hem, -42); ctx.lineTo(25 + hem, -35);
    for (let i = 0; i < 6; i++) {
      const hx = 25 + hem - i * 8;
      ctx.quadraticCurveTo(hx - 4, -29, hx - 8, -35);
    }
    ctx.lineTo(-23 + hem, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
    outline(NAVY); ctx.beginPath(); ctx.moveTo(-13, -73);
    ctx.quadraticCurveTo(0, -78, 13, -73);
    ctx.bezierCurveTo(15, -60, 18 + hem, -48, 24 + hem, -40);
    ctx.quadraticCurveTo(hem, -35, -23 + hem, -40);
    ctx.bezierCurveTo(-19 + hem, -49, -16, -62, -13, -73);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    poly(WHITE, -10, -73, 0, -65, 10, -73, 0, -76);
    line(-8, -59, -12 + hem, -44, "#465478", 1.7);
    line(8, -58, 13 + hem, -44, "#465478", 1.5);
    armRig(15, arm);
    ctx.save(); ctx.translate(0, head);
    poly(HAIR, -28, -98, -27, -120, -9, -107);
    poly(HAIR, 10, -108, 27, -120, 29, -96);
    poly(PINK, -25, -111, -24, -102, -16, -105);
    poly(PINK, 17, -105, 24, -112, 25, -101);
    oval(0, -89, 27, 24, SKIN);
    // Swept fringe with three individually drawn strands.
    poly(HAIR, -29, -91, -27, -105, -13, -113, 10, -111, 27, -103,
      29, -86, 19, -91, 14, -102, 7, -91, 1, -96, -9, -86, -10, -98, -23, -86);
    line(-21, -104, -16, -96, "#b8b8c5", 1.4);
    line(-3, -108, -6, -100, "#b8b8c5", 1.4);
    line(16, -106, 21, -97, "#b8b8c5", 1.4);
    // Cat headphones, fluffy ear pads and navy bow with trailing ribbons.
    ctx.beginPath(); ctx.ellipse(0, -96, 31, 20, 0, Math.PI, TAU);
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = WHITE; ctx.stroke();
    oval(-28, -90, 6, 10, WHITE); oval(29, -90, 6, 10, WHITE);
    poly(NAVY, -31, -108, -45 + trail * 0.3, -116, -45, -100, -32, -103);
    poly(NAVY, -31, -108, -21, -117, -18, -102, -31, -103);
    poly(NAVY, -34, -104, -42 + trail, -90, -34, -93, -28, -103);
    oval(-31, -106, 4, 4, NAVY);
    oval(-16, -80, 5, 2, PINK); oval(17, -80, 5, 2, PINK);
    const blink = mode === "idle" && qt % 3.7 < 0.16;
    if (mode === "caught" || mode === "trip") {
      line(-14, -89, -8, -85); line(-8, -85, -14, -81);
      line(14, -89, 8, -85); line(8, -85, 14, -81);
    } else if (blink) {
      line(-16, -85, -7, -85); line(7, -85, 16, -85);
    } else {
      oval(-11, -85, 5, 7, NAVY); oval(12, -85, 5, 7, NAVY);
      // Eye shines are flat little ink-free dots.
      ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(-12, -88, 2, 0, TAU);
      ctx.arc(11, -88, 2, 0, TAU); ctx.fill();
      if (boost) { line(-17, -95, -6, -92); line(6, -92, 17, -95); }
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-5, -77);
    ctx.quadraticCurveTo(-2, -72, 0, -77); ctx.quadraticCurveTo(3, -72, 5, -77); ctx.stroke();
    ctx.restore(); ctx.restore();
    if (mode === "trip") {
      for (let i = 0; i < 3; i++) star(x + Math.cos(t * 7 + i * 2) * 30,
        y - 65 + Math.sin(t * 7 + i * 2) * 9, 5, "#e8ae40");
      label("!", x + 35, y - 78, 23, "#e3402f");
    }
    if (mode === "spin") {
      for (let i = 0; i < 4; i++) star(x + Math.cos(t * 8 + i * 1.6) * 48,
        y - 55 + Math.sin(t * 8 + i * 1.6) * 42, 5, PINK);
    }
  }
  function john(x, y, t, gap, catching) {
    const qt = Math.floor(t * 12) / 12, step = Math.sin(qt * 23), stretch = 1 + step * 0.045;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 / stretch, stretch);
    limb(-15, -17, 8, step * 0.8, 0.2, "#e3402f", true);
    limb(15, -17, 8, -step * 0.8, 0.2, "#e3402f", true);
    const reach = catching ? 78 : 46 + (120 - gap) * 0.15;
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(26, -57);
    ctx.bezierCurveTo(54, -85 + step * 6, 20, -25, reach, -56); ctx.stroke();
    ctx.strokeStyle = "#e3402f"; ctx.lineWidth = 5; ctx.stroke();
    oval(reach, -56, 7, 7, WHITE);
    box(-34, -83, 68, 65, "#e3402f", 19);
    box(-29, -76, 58, 18, WHITE, 9); label("Nintendo", 0, -63, 11, "#e3402f");
    line(-22, -51, -9, -47, INK, 4); line(9, -47, 22, -51, INK, 4);
    oval(-15, -43, 2.5, 3.5, INK); oval(16, -43, 2.5, 3.5, INK);
    box(-16, -35, 34, 11, WHITE, 5);
    for (let i = -8; i <= 10; i += 9) line(i, -34, i, -25, INK, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-28, -55);
    ctx.bezierCurveTo(-47, -25, 20, -8, reach - 8, -38 + step * 6); ctx.stroke();
    ctx.strokeStyle = "#e3402f"; ctx.lineWidth = 4.5; ctx.stroke();
    oval(reach - 8, -38 + step * 6, 7, 6, WHITE);
    if (gap > 85) {
      poly("#7fb8f0", -41, -83, -47, -70, -36, -71);
      poly("#7fb8f0", -48, -61, -52, -50, -43, -51);
    } else label("!", 20, -91, 25, "#e3402f");
    ctx.restore();
  }
  function plush(x, y) {
    // Twelve overlapping tufts make a fluffy silhouette, not a white ball.
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      oval(x + Math.cos(a) * 18, y + Math.sin(a) * 17, 8, 8, WHITE);
    }
    oval(x, y, 21, 19, WHITE);
    oval(x - 7, y - 3, 1.5, 2, INK); oval(x + 7, y - 3, 1.5, 2, INK);
    label(":3", x, y + 11, 12);
    poly("#f5d679", x - 10, y - 20, x - 12, y - 32, x - 4, y - 27,
      x, y - 36, x + 5, y - 27, x + 12, y - 32, x + 9, y - 20);
  }

  function updateMenuArt() {
    const previousContext = ctx, fallbackArt = menuArt;
    ctx = portrait.getContext("2d");
    if (!ctx) { ctx = previousContext; return; }
    ctx.fillStyle = "#fde7ef"; ctx.fillRect(0, 0, 260, 160);
    heart(45, 36, 10); star(213, 35, 12, "#7fb8f0");
    ctx.save(); ctx.translate(65, 144); ctx.scale(0.8, 0.8);
    sprite("jrun", 0, 0, 0, 0, false); ctx.restore();
    sprite("run", 0, 158, 146, 0, false);
    menuArt = portrait.toDataURL("image/jpeg", 0.93); game.art = menuArt;
    ctx = previousContext;
    const pictures = document.querySelectorAll("img");
    for (let i = 0; i < pictures.length; i++) {
      if (pictures[i].getAttribute("src") === fallbackArt) pictures[i].setAttribute("src", menuArt);
    }
  }
  // The shell also switches its portrait only after all frames load successfully.
  const portrait = document.createElement("canvas"); portrait.width = 260; portrait.height = 160;
  ctx = portrait.getContext("2d");
  let menuArt = "";
  if (ctx) {
    ctx.fillStyle = "#fde7ef"; ctx.fillRect(0, 0, 260, 160);
    heart(45, 36, 10); star(213, 35, 12, "#7fb8f0");
    john(65, 144, 0.1, 110, false); girl(158, 146, 1, "idle", 0, false, false);
    menuArt = portrait.toDataURL("image/jpeg", 0.93);
  }

  // Score proof (any rolling one-second window, not just clock buckets):
  // speed <= 26 m/s => at most 3 distance points. News are 80 m apart,
  // hence at most one award, worth 25 + min(2, streak-1) <= 27. Total <=30.
  // Perfect 180s: integral(10 + min(10,t/10)) = 3100m. Six 4s boosts
  // at 400+480n add 144m => 3244m, 40 bulletins at 60+80n, score
  // 324 + 25 + 26 + 38*27 = 1401. Trips never award points.
  // Catch protection lasts exactly 30s, including a short final grab animation.
  const game = {
    id: "blitz", title: "Better Gaming Blitz", art: menuArt,
    blurb: "A hand-drawn homebrew news dash! news by Better Gaming (youtube.com/@yu-gg). Help gezine collect Switch 2 bulletins and outrun John Nintendo for three minutes.",
    unit: "points", board: true,
    controls: (touch) => touch
      ? "Tap/click upper ⅔ to jump; hold for height, tap again to double-jump. Lower ⅓ or swipe down: slide for 0.6s. John can catch you after 30s."
      : "Space / Up / W / gamepad A: jump; release for a short hop, press again to double-jump. Hold Down / S / B to slide. Mouse: upper ⅔ jump, lower ⅓ slide. John can catch you after 30s.",
    start(api) {
      if (!document.getElementById("blitz-style")) {
        const style = document.createElement("style"); style.id = "blitz-style";
        style.textContent = ".blitz-wrap{position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;background:#e6f1fd;touch-action:none;user-select:none;-webkit-user-select:none}.blitz-canvas{display:block;width:100%;height:100%;touch-action:none}";
        document.head.appendChild(style);
      }
      const wrap = document.createElement("div"), canvas = document.createElement("canvas");
      wrap.className = "blitz-wrap"; canvas.className = "blitz-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Collect Better Gaming news. Jump over firmware crates and paywalls; slide under flying DMCA envelopes. Upper area jumps; lower area slides.");
      wrap.appendChild(canvas); api.stage.appendChild(wrap); ctx = canvas.getContext("2d");
      if (!ctx) { api.end(0, "The drawing desk couldn't open!"); return; }
      const main = ctx;
      const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      const STEP = 1 / 120, LIMIT = 180, PX = 12;
      let width = 800, height = 460, ground = 380, runnerX = 180, transform = 1;
      let ticks = 0, time = 0, distance = 0, previousDistance = 0;
      let y = 0, previousY = 0, vy = 0, gap = 100, previousGap = 100;
      let jumps = 0, buffer = 0, coyote = 0.09, windup = 0, land = 0;
      let slide = 0, trip = 0, immunity = 0, boost = 0, spin = 0, shake = 0;
      let streak = 0, scoops = 0, newsPoints = 0, score = 0, bonus = 0;
      let comboUntil = 0, headlineUntil = 0, headlineIndex = -1, bannerLines = [];
      let caughtAt = -1, stopped = false, frame = 0, last = null, bank = 0, hudTick = -1;
      let keyboardJump = false, keyboardSlide = false, mouseJump = false;
      let touchId = null, touchStartY = 0, touchJump = false, swiped = false;
      let padJump = false, padSlide = false, touchStamp = -1000;
      let dustClock = 0, showHint = true, jumpAt = -1;
      try { showHint = !localStorage.getItem("blitz-hint"); localStorage.setItem("blitz-hint", "1"); } catch (e) { /* storage is optional */ }
      const listeners = [], objects = [], particles = [], deck = [];
      for (let at = 60; at <= 3300; at += 80) objects.push({ kind: "news", at: at, done: false });
      // Reserve the middle of an 80m news interval for each obstacle. As
      // speed rises, skip a slot whenever needed to retain >=3.25s recovery,
      // even at the fastest possible boosted speed at that distance.
      for (let at = 100, n = 0; at <= 3300; n++) {
        objects.push({ kind: ["crate", "letter", "gate"][n % 3], at: at, done: false });
        const fastest = Math.min(20, Math.sqrt(100 + at * 0.2)) + 6;
        at += Math.ceil(fastest * 3.25 / 80) * 80;
      }
      for (let at = 400; at <= 3300; at += 480) objects.push({ kind: "plush", at: at, done: false });
      for (let i = 0; i < 96; i++) particles.push({ life: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, color: WHITE, star: false });
      const hills = document.createElement("canvas"), scenery = document.createElement("canvas");
      const clouds = document.createElement("canvas"), turf = document.createElement("canvas");
      let sky, uiWidth = 800, uiHeight = 460, uiTransform = 1, bannerWidth = 460;
      function listen(target, event, fn, options) {
        target.addEventListener(event, fn, options);
        listeners.push(function () { target.removeEventListener(event, fn, options); });
      }
      function wrapHeadline() {
        bannerLines = [];
        if (headlineIndex < 0) return;
        ctx.font = "700 16px Nunito, sans-serif";
        const words = HEADLINES[headlineIndex].split(" "); let s = "";
        for (let i = 0; i < words.length; i++) {
          const next = s ? s + " " + words[i] : words[i];
          if (s && ctx.measureText(next).width > bannerWidth - 30) { bannerLines.push(s); s = words[i]; }
          else s = next;
        }
        if (s) bannerLines.push(s);
        if (bannerLines.length > 2) {
          let lastLine = bannerLines.slice(1).join(" ");
          while (lastLine.length && ctx.measureText(lastLine + "…").width > bannerWidth - 30) lastLine = lastLine.slice(0, -1);
          bannerLines = [bannerLines[0], lastLine.trim() + "…"];
        }
      }
      function cacheLayers() {
        drawing = 0; mark = 0;
        hills.width = 960; hills.height = 200; ctx = hills.getContext("2d");
        oval(160, 220, 260, 180, "#d4e9e1"); oval(590, 240, 320, 220, "#c8dfdf");
        clouds.width = 1000; clouds.height = 240; ctx = clouds.getContext("2d");
        for (let i = 0; i < 4; i++) {
          const x = 80 + i * 250, cy = 60 + (i % 3) * 52;
          oval(x - 25, cy, 28, 18, WHITE); oval(x, cy - 10, 35, 27, WHITE); oval(x + 36, cy, 34, 18, WHITE);
          ctx.fillStyle = WHITE; ctx.fillRect(x - 35, cy - 7, 77, 18);
        }
        scenery.width = 1200; scenery.height = 230; ctx = scenery.getContext("2d");
        box(110, 120, 126, 108, "#fff1ea", 8);
        poly(NAVY, 91, 126, 171, 53, 254, 126); box(151, 173, 30, 55, PINK, 12);
        box(195, 148, 26, 26, WHITE, 4); line(208, 150, 208, 172); line(197, 161, 218, 161);
        label("gezine's hut", 173, 144, 12); heart(168, 102, 9);
        for (let i = 0; i < 2; i++) {
          const x = 520 + i * 440;
          line(x - 38, 175, x - 38, 230, INK, 5); line(x + 38, 175, x + 38, 230, INK, 5);
          box(x - 84, 94, 168, 85, NAVY, 22); box(x - 61, 101, 122, 71, WHITE, 6);
          box(x - 81, 100, 18, 72, "#7fb8f0", 12); box(x + 63, 100, 18, 72, PINK, 12);
          oval(x - 72, 123, 3, 3, INK); oval(x + 72, 148, 3, 3, INK);
          label(i ? "HOMEBREW ♥" : "BETTER GAMING", x, 127, 12);
          label(i ? "made with love" : "Switch 2 news!", x, 151, 12);
        }
        turf.width = 512; turf.height = 82; ctx = turf.getContext("2d");
        ctx.fillStyle = "#f7dfe9"; ctx.fillRect(0, 0, 512, 82);
        line(0, 2, 512, 2, INK, 3);
        for (let i = 0; i < 12; i++) {
          const x = i * 44 + 6, cy = 13 + (i % 3) * 22;
          if (i % 3 === 0) heart(x, cy + 8, 3);
          else { line(x - 4, cy, x, cy + 5, "#90b4a2", 2); line(x, cy + 5, x + 3, cy - 3, "#90b4a2", 2); }
        }
        ctx = main;
      }
      function resize() {
        const w = Math.max(1, wrap.clientWidth || api.stage.clientWidth), h = Math.max(1, wrap.clientHeight || api.stage.clientHeight);
        // Fit the 120-unit rig by height while retaining room for both runners.
        // The width guard keeps very tall phones playable without changing physics.
        const scale = Math.max(0.01, Math.min(h * (h > w ? 0.18 : 0.20) / 120, w / 340));
        width = w / scale; height = h / scale; ground = height * 0.75; runnerX = Math.min(210, width * 0.60);
        const dpr = Math.min(window.devicePixelRatio || 1, 2); transform = dpr * scale;
        const uiScale = Math.max(0.01, Math.min(1, w / 390, h / 360));
        uiWidth = w / uiScale; uiHeight = h / uiScale; uiTransform = dpr * uiScale;
        bannerWidth = w < 600 ? uiWidth - 24 : Math.min(560, uiWidth * 0.60);
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(transform, 0, 0, transform, 0, 0);
        sky = ctx.createLinearGradient(0, 0, 0, ground);
        sky.addColorStop(0, "#e4e9fa"); sky.addColorStop(0.75, "#fff2ed"); sky.addColorStop(1, "#fbe9ef");
        wrapHeadline();
      }
      function held() { return keyboardJump || mouseJump || touchJump || padJump; }
      function sliding() { return keyboardSlide || padSlide || slide > 0; }
      function jumpPress() { if (!stopped && !document.hidden && caughtAt < 0) buffer = 0.13; }
      function slidePress() {
        if (caughtAt >= 0) return;
        slide = 0.6; windup = 0;
        if (y > 0) vy = Math.min(vy, -560);
      }
      function lower(clientY) {
        const r = canvas.getBoundingClientRect(); return clientY - r.top >= r.height * 2 / 3;
      }
      api.keys(function (e) {
        const k = String(e.key).toLowerCase();
        if ([" ", "arrowup", "w", "arrowdown", "s"].indexOf(k) < 0) return;
        e.preventDefault(); if (e.repeat) return;
        if (k === "arrowdown" || k === "s") keyboardSlide = true;
        else { keyboardJump = true; jumpPress(); }
      });
      listen(window, "keyup", function (e) {
        const k = String(e.key).toLowerCase();
        if (k === " " || k === "arrowup" || k === "w") { keyboardJump = false; e.preventDefault(); }
        if (k === "arrowdown" || k === "s") { keyboardSlide = false; e.preventDefault(); }
      });
      listen(canvas, "mousedown", function (e) {
        if (e.button !== 0 || time - touchStamp < 0.7) return;
        e.preventDefault(); if (lower(e.clientY)) slidePress(); else { mouseJump = true; jumpPress(); }
      });
      listen(window, "mouseup", function () { mouseJump = false; });
      listen(canvas, "touchstart", function (e) {
        e.preventDefault(); touchStamp = time;
        if (touchId !== null || !e.changedTouches.length) return;
        const t = e.changedTouches[0]; touchId = t.identifier; touchStartY = t.clientY; swiped = false;
        if (lower(t.clientY)) { slidePress(); swiped = true; }
        else { touchJump = true; jumpPress(); }
      }, { passive: false });
      listen(canvas, "touchmove", function (e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === touchId && !swiped && t.clientY - touchStartY > 26) {
            swiped = true; touchJump = false; slidePress();
          }
        }
      }, { passive: false });
      function touchEnd(e) {
        e.preventDefault(); touchStamp = time;
        for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === touchId) { touchId = null; touchJump = false; }
      }
      listen(canvas, "touchend", touchEnd, { passive: false }); listen(canvas, "touchcancel", touchEnd, { passive: false });
      function clearInput() {
        keyboardJump = keyboardSlide = mouseJump = touchJump = padJump = padSlide = false;
        touchId = null; buffer = slide = windup = 0; last = null; bank = 0;
      }
      listen(window, "blur", clearInput); listen(document, "visibilitychange", clearInput); listen(window, "resize", resize);
      function pollPad() {
        if (!navigator.getGamepads) return;
        let pads; try { pads = navigator.getGamepads(); } catch (e) { return; }
        let a = false, b = false;
        for (let i = 0; i < pads.length; i++) {
          const p = pads[i]; if (!p) continue;
          a = a || !!(p.buttons[0] && p.buttons[0].pressed);
          b = b || !!(p.buttons[1] && p.buttons[1].pressed) || !!(p.buttons[13] && p.buttons[13].pressed) || p.axes[1] > 0.6;
        }
        if (a && !padJump) jumpPress(); padJump = a; padSlide = b;
      }
      function puff(x, py, color, count, stars) {
        if (reduced) count = Math.min(count, 3);
        let used = 0;
        for (let i = 0; i < particles.length && used < count; i++) {
          const p = particles[i]; if (p.life > 0) continue;
          const n = (ticks * 17 + i * 37) % 101 / 100;
          p.x = p.px = x; p.y = p.py = py; p.vx = -30 - n * 100;
          p.vy = -25 - ((i * 23) % 65); p.life = 0.4 + n * 0.2; p.color = color; p.star = stars; used++;
        }
      }
      function nextNews() {
        if (!deck.length) {
          for (let i = 0; i < HEADLINES.length; i++) deck.push(i);
          for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)), temp = deck[i]; deck[i] = deck[j]; deck[j] = temp;
          }
        }
        headlineIndex = deck.pop(); headlineUntil = time + 2; wrapHeadline();
      }
      function hud() {
        score = newsPoints + Math.floor((distance + 1e-7) / 10);
        api.score(score + " pts"); api.status(Math.floor(distance) + " m · " + scoops + " news · " + Math.ceil(LIMIT - time) + "s");
      }
      function finish(caught) {
        if (stopped) return;
        hud(); stopped = true; api.end(score, caught ? "John Nintendo caught you!" : "You out-ran John Nintendo!");
      }
      function update() {
        previousDistance = distance; previousY = y; previousGap = gap;
        const before = time; time = Math.min(LIMIT, ++ticks / 120);
        const dt = time - before;
        distance += (10 + Math.min(10, before / 10) + 10 + Math.min(10, time / 10)) * dt / 2 + 6 * Math.min(boost, dt);
        boost = Math.max(0, boost - dt); slide = Math.max(0, slide - dt);
        trip = Math.max(0, trip - dt); immunity = Math.max(0, immunity - dt);
        land = Math.max(0, land - dt); spin = Math.max(0, spin - dt); shake = Math.max(0, shake - dt);
        coyote = y <= 0 ? 0.09 : Math.max(0, coyote - dt);
        if (buffer > 0 && trip < 0.3 && caughtAt < 0 && !windup) {
          if (coyote > 0 && jumps === 0) { windup = 0.0334; buffer = 0; slide = 0; }
          else if (jumps < 2 && y > 0) {
            vy = 470; jumps = 2; spin = 0.42; buffer = 0; slide = 0;
            puff(runnerX, ground - y - 30, PINK, 12, true);
          }
        }
        buffer = Math.max(0, buffer - dt);
        if (windup > 0) {
          windup -= dt;
          if (windup <= 0) { windup = 0; vy = 525; jumps = 1; coyote = 0; jumpAt = time; puff(runnerX, ground, WHITE, 5, false); }
        }
        if (jumps > 0 || y > 0) {
          // A clean release cut, quick rise/fall, and a small soft zone at the apex.
          if (!held() && vy > 210) vy = 210;
          const gravity = Math.abs(vy) < 80 && held() ? 1000 : vy > 0 ? 1550 : 1950;
          vy -= gravity * dt; y += vy * dt;
          if (y <= 0) { y = 0; vy = 0; jumps = 0; land = 0.1; puff(runnerX, ground, WHITE, 9, false); }
        }
        const bodyHeight = sliding() && y < 8 && !windup ? 29 : 83;
        for (let i = 0; i < objects.length; i++) {
          const o = objects[i]; if (o.done) continue;
          const offset = (o.at - distance) * PX;
          if (o.kind === "news" || o.kind === "plush") {
            if (previousDistance < o.at && distance >= o.at) {
              o.done = true;
              const high = o.kind === "news" ? 57 : 58;
              if (caughtAt < 0 && y <= high + 20 && y + bodyHeight >= high - 20) {
                if (o.kind === "news") {
                  streak++; scoops++; bonus = Math.min(2, streak - 1); newsPoints += 25 + bonus;
                  comboUntil = time + 1.1; nextNews(); puff(runnerX, ground - 60, PINK, 14, true);
                } else { boost = 4; puff(runnerX, ground - y - 40, WHITE, 18, true); }
              } else if (o.kind === "news") streak = 0;
            }
          } else if (caughtAt < 0) {
            const half = o.kind === "gate" ? 20 : 26;
            const low = o.kind === "letter" ? 47 : 0, high = o.kind === "letter" ? 86 : o.kind === "gate" ? 105 : 51;
            if (Math.abs(offset) < half + 12 && y + 5 < high && y + bodyHeight - 7 > low) {
              o.done = true;
              if (boost > 0) puff(runnerX + offset, ground - 40, "#c3afe5", 12, true);
              else if (immunity <= 0) {
                gap = Math.max(0, gap - 50); trip = 0.9; immunity = 1.25; streak = 0; shake = 0.3;
                puff(runnerX, ground - y - 8, WHITE, 10, false);
              }
            }
          }
        }
        if (trip <= 0 && gap > 0) gap = Math.min(120, gap + dt * 2);
        if (gap <= 0 && time >= 29.4 && caughtAt < 0) caughtAt = time;
        if (caughtAt >= 0 && time >= 30 && time - caughtAt >= 0.6 - 1e-7) { finish(true); return; }
        dustClock += dt;
        if (dustClock > (boost > 0 ? 0.06 : 0.16) && y === 0 && caughtAt < 0) {
          dustClock = 0; puff(runnerX - 10, ground - 4, boost > 0 ? PINK : WHITE, 2, boost > 0);
        }
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]; if (p.life <= 0) continue;
          p.px = p.x; p.py = p.y; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 190; p.life -= dt;
        }
        if (Math.floor(time * 5) !== hudTick) { hudTick = Math.floor(time * 5); hud(); }
        if (time >= LIMIT) finish(false);
      }
      function tile(layer, offset, py) {
        const period = layer.width, start = -(offset % period);
        for (let x = start - period; x < width; x += period) ctx.drawImage(layer, x, py);
      }
      function obstacle(o, x, t) {
        if (o.kind === "news") {
          const py = ground - 57 + (reduced ? 0 : Math.sin(t * 4 + o.at) * 3);
          ctx.save(); ctx.translate(x, py); ctx.rotate(reduced ? 0 : Math.sin(t * 3 + o.at) * 0.065);
          box(-22, -25, 44, 47, WHITE, 9); box(-17, -19, 34, 27, "#c6e6f1", 4);
          label("BG", 0, 1, 17, NAVY); line(-6, 15, 6, 15, INK, 2);
          star(29, -25, 6, PINK); star(-30, 6, 4, "#e3bc62"); ctx.restore();
        } else if (o.kind === "plush") {
          const py = ground - 58 + (reduced ? 0 : Math.sin(t * 4) * 3);
          plush(x, py); star(x - 35, py - 28, 7, PINK); label("pepsipu · BOOST", x, py - 46, 11);
        } else if (o.kind === "crate") {
          box(x - 32, ground - 57, 64, 57, "#f1c79e", 6);
          line(x - 25, ground - 6, x + 26, ground - 51, "#c79679", 3);
          box(x - 39, ground - 48, 78, 33, "#fff2df", 4);
          label("FIRMWARE", x, ground - 34, 10); label("UPDATE", x, ground - 21, 10);
          label("↑ JUMP", x, ground - 73, 12, NAVY);
        } else if (o.kind === "letter") {
          const py = ground - 89 + (reduced ? 0 : Math.sin(t * 8) * 2);
          line(x - 56, py + 8, x - 41, py + 8, "#a5b4ca", 2);
          line(x - 49, py + 21, x - 38, py + 21, "#a5b4ca", 2);
          box(x - 33, py, 66, 45, WHITE, 5);
          line(x - 31, py + 2, x, py + 21, PINK, 2); line(x, py + 21, x + 31, py + 2, PINK, 2);
          label("DMCA", x, py + 35, 13, "#e3402f"); label("↓ SLIDE / ↑ JUMP", x, py - 13, 11, NAVY);
        } else {
          box(x - 26, ground - 113, 10, 113, "#b1a3d3", 4);
          box(x + 16, ground - 113, 10, 113, "#b1a3d3", 4);
          for (let i = 0; i < 3; i++) box(x - 21, ground - 33 - i * 28, 43, 9, PINK, 3);
          box(x - 43, ground - 113, 86, 25, WHITE, 5); label("PAYWALL", x, ground - 96, 12);
          label("↑ JUMP", x, ground - 128, 12, NAVY);
        }
      }
      function draw(alpha) {
        const t = Math.max(0, time - STEP + alpha * STEP);
        const dist = previousDistance + (distance - previousDistance) * alpha;
        const gy = previousY + (y - previousY) * alpha;
        const dg = previousGap + (gap - previousGap) * alpha;
        drawing = reduced ? 0 : Math.floor(t * 20); mark = 0;
        ctx.setTransform(transform, 0, 0, transform, 0, 0);
        ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
        // Distribute distant layers through the visible sky, including tall views.
        for (let i = 0; i < 18; i++) {
          const period = width + 80;
          const sx = ((i * 137.3 - dist * 0.16) % period + period) % period - 40;
          star(sx, ground * (0.08 + (i % 5) * 0.105), 2 + i % 3, i % 2 ? "#c5bcdf" : "#fffafc");
        }
        ctx.globalAlpha = 0.45;
        tile(clouds, dist * 0.2 + 120, ground * 0.08 - 50);
        ctx.globalAlpha = 0.8;
        tile(clouds, dist * (reduced ? 0.12 : 0.65) + t * 1.5, ground * 0.40 - 55);
        ctx.globalAlpha = 1;
        tile(hills, dist * 1.25, ground - 175);
        tile(scenery, dist * 3.5, ground - 229);
        ctx.fillStyle = "#f7dfe9"; ctx.fillRect(0, ground, width, height - ground);
        tile(turf, dist * PX, ground);
        ctx.save();
        if (!reduced && shake > 0) ctx.translate(Math.sin(t * 130) * shake * 9, Math.cos(t * 100) * shake * 5);
        for (let i = 0; i < objects.length; i++) {
          const o = objects[i]; if (o.done) continue;
          const x = runnerX + (o.at - dist) * PX;
          if (x > -90 && x < width + 90) obstacle(o, x, t);
        }
        const catching = caughtAt >= 0;
        const johnX = catching ? runnerX - 76 : runnerX - 52 - dg;
        const useSprites = spritesReady();
        const runFrame = Math.floor(dist * 1.1) % 4;
        const grabFrame = Math.min(3, Math.floor(Math.max(0, t - caughtAt) / 0.15));
        shadow(johnX, ground, 35);
        if (!useSprites) john(johnX, ground, t, dg, catching);
        else if (!catching) sprite("jrun", runFrame, johnX,
          ground - (reduced ? 0 : Math.sin(t * 11) * 2), 0, false);
        shadow(runnerX, ground, Math.max(13, 30 - gy * 0.07));
        let mode = t < 0.65 ? "idle" : "run", phase = 0;
        if (land > 0) mode = "land";
        if (windup > 0) mode = "anticipate";
        if (y > 0) mode = spin > 0 ? "spin" : vy > 90 ? "rise" : vy < -90 ? "fall" : "apex";
        if (spin > 0) phase = 0.42 - spin;
        if (sliding() && gy < 8 && !windup) mode = "slide";
        if (trip > 0) { mode = "trip"; phase = 0.9 - trip; }
        if (catching) mode = "caught";
        if (boost > 0) {
          for (let i = 0; i < 6; i++) {
            const x = runnerX - 45 - i * 15;
            star(x, ground - gy - 20 - i % 3 * 19, 3 + (i % 2), i % 2 ? PINK : "#a68ac8");
            if (!reduced) line(x - 18, ground - gy - 32 - i * 8, x, ground - gy - 32 - i * 8, "#b4a7d6", 2);
          }
        }
        if (useSprites) {
          let sheet = "run", pose = runFrame;
          if (windup > 0 || (y > 0 && t - jumpAt < 0.07)) { sheet = "jump"; pose = 0; }
          else if (y > 0) {
            sheet = "jump"; pose = vy > 90 ? 1 : vy < -90 ? 3 : 2;
          }
          if (spin > 0.12 && y > 0) { sheet = "moves"; pose = Math.floor((0.42 - spin) * 12) % 2; }
          if (sliding() && gy < 8 && !windup) { sheet = "moves"; pose = 2 + Math.floor(t * 6) % 2; }
          // Recovery is visual only: the trip and invulnerability clocks stay unchanged.
          if (immunity > 0) { sheet = "trip"; pose = Math.min(3, Math.floor((1.25 - immunity) * 4 / 1.25)); }
          if (catching) { sheet = "trip"; pose = 1; }
          sprite(sheet, pose, runnerX, catching ? ground : ground - gy,
            boost > 0 && sheet === "run" ? -Math.PI / 30 : 0,
            sheet === "run" && land > 0.02);
          // Draw the reaching hands/stamp over the face-plant pose.
          if (catching) sprite("jgrab", grabFrame, johnX, ground, 0, false);
        } else {
          girl(runnerX, ground - gy, t, mode, phase, boost > 0, reduced, 10 + Math.min(10, t / 10) + (boost > 0 ? 6 : 0));
        }
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]; if (p.life <= 0) continue;
          ctx.globalAlpha = Math.min(1, p.life * 3);
          const x = p.px + (p.x - p.px) * alpha, py = p.py + (p.y - p.py) * alpha;
          if (p.star) star(x, py, 4, p.color); else oval(x, py, (0.7 - p.life) * 11, 3, p.color);
        }
        ctx.globalAlpha = 1; ctx.restore();
        if (comboUntil > time) {
          const age = 1.1 - (comboUntil - time), scale = reduced ? 1 : 1 + Math.max(0, 0.18 - age) * 1.2;
          ctx.save(); ctx.translate(runnerX + 55, ground - gy - 132); ctx.scale(scale, scale);
          label("+" + (25 + bonus) + (streak > 1 ? "  x" + Math.min(3, streak) : "  POP!"), 0, 0, 20, "#b93970");
          if (streak > 1) label("streak bonus +" + bonus, 0, 16, 10, NAVY);
          ctx.restore();
        }
        // Screen-space UI remains compact and readable at every world zoom.
        ctx.setTransform(uiTransform, 0, 0, uiTransform, 0, 0);
        drawing = 0; mark = 100;
        box(12, 10, 216, 36, WHITE, 18);
        label("JOHN", 23, 25, 10, NAVY, "left");
        ctx.fillStyle = "#efd9e4"; ctx.fillRect(58, 18, 61, 7);
        ctx.fillStyle = dg < 40 ? "#e3402f" : "#7fb8f0"; ctx.fillRect(58, 18, 61 * dg / 120, 7);
        label(time < 30 ? "PRESS PASS · " + Math.ceil(30 - time) + "s" : "KEEP RUNNING!", 128, 25, 10, NAVY, "left");
        if (boost > 0) label("pepsipu BOOST · " + boost.toFixed(1) + "s", 23, 39, 10, "#795698", "left");
        // The title retires after 2.5 seconds; bulletins have their own 2s lifetime.
        if (headlineUntil > time) {
          const fade = reduced ? 1 : Math.min(1, (headlineUntil - time) / 0.25);
          ctx.save(); ctx.globalAlpha = fade;
          box(12, 56, bannerWidth, 73, "#fffafc", 12);
          label("BETTER GAMING NEWS", 27, 76, 12, "#bb416c", "left");
          for (let i = 0; i < bannerLines.length; i++) label(bannerLines[i], 27, 97 + i * 20, 16, INK, "left");
          ctx.restore();
        } else if (t < 2.5) {
          const fade = Math.min(1, (2.5 - t) / 0.5);
          ctx.save(); ctx.globalAlpha = fade; ctx.translate(0, reduced ? 0 : -16 * (1 - fade));
          const cardWidth = Math.min(uiWidth - 24, 480);
          box(12, 56, cardWidth, 88, "#fffafc", 13);
          label("BETTER GAMING BLITZ", 27, 81, 18, NAVY, "left");
          label("news by Better Gaming (youtube.com/@yu-gg)", 27, 104, 13, INK, "left");
          label("Fresh bulletins. Cute homebrew. Very angry paperwork.", 27, 126, 12, "#765c77", "left");
          ctx.restore();
        }
        if (caughtAt >= 0) label("THE LONG ARM OF JOHN!", uiWidth / 2, uiHeight - 30, 17, NAVY);
        else if (showHint && time < 3) {
          box(12, uiHeight - 67, uiWidth - 24, 54, WHITE, 9);
          label("↑ SPACE / W / TAP UPPER AREA: JUMP + DOUBLE JUMP", uiWidth / 2, uiHeight - 45, 11);
          label("↓ HOLD S / DOWN: SLIDE · TAP LOWER AREA / SWIPE ↓", uiWidth / 2, uiHeight - 25, 11);
        } else label("↑ JUMP / DOUBLE JUMP     ·     ↓ SLIDE     ·     BG = NEWS", uiWidth / 2, uiHeight - 20, 11, NAVY);
      }
      function loop(now) {
        if (stopped) return;
        if (document.hidden) { last = null; bank = 0; }
        else {
          pollPad();
          if (last !== null) bank += Math.max(0, Math.min(0.1, (now - last) / 1000));
          last = now;
          while (bank + 1e-10 >= STEP && !stopped) { bank -= STEP; update(); }
          if (!stopped) draw(Math.max(0, bank / STEP));
        }
        if (!stopped) frame = requestAnimationFrame(loop);
      }
      api.onStop(function () {
        stopped = true; cancelAnimationFrame(frame);
        for (let i = 0; i < listeners.length; i++) listeners[i]();
      });
      cacheLayers(); resize(); hud(); draw(0); frame = requestAnimationFrame(loop);
    }
  };
  window.GezArcade.register(game);
})();
