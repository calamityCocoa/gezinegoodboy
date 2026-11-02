# Writing a game for gezine's Arcade

Each extra game is ONE self-contained file, `games/<id>.js`, loaded by `index.html` as
`<script type="module" src="games/<id>.js">`. It registers itself with the arcade, which
handles everything else: the menu card, the title screen, the game window, the game-over
screen, personal bests and the global leaderboard.

## The site (read this first)

- Satire site about gezine, a console hacker, and "John Nintendo", a cartoon red box with the
  Nintendo logo who sends DMCA letters. Tone: kawaii (cute, pastel, sparkly), silly, a parody
  of Nintendo and of Switch 2 jailbreak drama. Punch up at Nintendo, never at real people.
  Never mention piracy as a good thing; jailbreaking/homebrew is the theme, not piracy.
- Characters and art already in the repo (transparent PNGs):
  - gezine, chibi cat-ear girl drawing with a fluffy cat headset:
    `images/headset/run0..3.png`, `jump0..3`, `trip0..3`, `wave0..3` (about 300px tall, feet at bottom)
    `images/peek/gezine.png` (head + hands peeking up over an edge)
    `images/good/0..3.png` (tracker idle), `images/pat/0..3.png` (being patted)
  - John Nintendo: `images/arcade/john-head.png` (head/torso), `images/peek/john.png`,
    `images/john/0..3.png` (looming over gezine, 423x420)
  - pepsipu (a fluffy white plush, made the ns2jb jailbreak): `images/peek/pepsipu.png`
  - New art you may reference (it may not exist yet, so ALWAYS have a drawn fallback, e.g. a
    coloured circle with a letter, if an image fails to load):
    `images/empires/gezine-leader.png`, `images/empires/pepsipu-leader.png`, `images/empires/john-leader.png`
- Colours: ink `#141a2b`, pink `#f06292`, soft pink `#fde7ef`, blue `#7fb8f0`, soft blue `#e6f1fd`,
  background `#f4f2fb`, red `#c62828`. Fonts already loaded: "Fredoka" (headings), "Nunito" (text).

## The file

```js
// games/<id>.js
(function () {
  "use strict";
  const DEV = window.GEZ_DEVICE || {};
  if (DEV.legacy || !window.GezArcade) return;

  window.GezArcade.register({
    id: "<id>",                       // lowercase letters only, matches the file name
    title: "Game Title",
    art: "images/peek/gezine.png",   // picture for the menu card and title screen
    blurb: "One or two short sentences shown on the menu card and title screen.",
    unit: "points",                   // word shown under the score on the game-over screen
    board: true,                      // has a global leaderboard
    controls: (touch) => touch ? "How to play with touch." : "How to play with keyboard/mouse.",
    start(api) { /* build the game inside api.stage and run it */ },
  });
})();
```

## The `api` your `start(api)` gets

- `api.stage`: an empty `<div>` filling the game window (below a title bar). Put everything in it.
  It is a flex container that centres its children; it can scroll. Size things with CSS so they
  fit anything from a 320x480 phone to a 1920x1080 TV. Use `api.stage.clientWidth/clientHeight`.
- `api.score(text)`: set the score text in the title bar, e.g. `api.score(120 + " pts")`.
- `api.status(text)`: set the status text in the title bar, e.g. a timer.
- `api.after(ms, fn)` / `api.every(ms, fn)`: setTimeout / setInterval that are cleared automatically
  when the game stops. Use these instead of the raw ones.
- `api.keys(fn)`: receive keydown events while playing (not when typing in an input). Call
  `e.preventDefault()` for keys you use. Escape is reserved (it closes the game).
- `api.onStop(fn)`: called when the game stops for any reason (finished, closed, left). Cancel
  your requestAnimationFrame loop, remove listeners you added to window/document, close AudioContexts.
- `api.end(score, headline)`: finish the game. `score` is an integer >= 0. `headline` is a short
  funny line ("John Nintendo caught you!"). After this the arcade shows the game-over screen.
- `api.pop(x, y, text, color)`: floating text that rises and fades, at stage coordinates.

The arcade asks the server for a run id when the game starts and submits the score at the end;
you do not touch the network for scores. Scores must be plausible for the time played: tell the
lead developer the maximum points per second a perfect player could earn.

## Hard requirements

1. Runs in the Nintendo Switch 1 browser (about Safari 12). So: ES2018 at most. NO optional
   chaining `?.`, NO `??`, NO `matchAll`, NO `replaceAll`, NO class fields, NO `Array.prototype.at`,
   NO top-level await. Check: `npx acorn --ecma2018 --module games/<id>.js` must parse.
2. No Pointer Events without a fallback. Prefer `click` for buttons; for drag/hold input use
   `touchstart/touchmove/touchend` (with `{ passive: false }` + preventDefault) AND mouse events.
3. Works with touch, mouse AND keyboard. Gamepads optional (`navigator.getGamepads`).
4. No network requests except same-origin files, and https://gitlab.com or
   https://raw.githubusercontent.com if truly needed. No external scripts, fonts, CDNs or images.
5. All styles in one `<style>` element the game adds once (prefix every class with the game id,
   e.g. `.blitz-hud`). No inline event handler attributes (`onclick="..."`), they are blocked by CSP.
6. Never leave anything running after `api.onStop`: rAF loops, listeners, audio.
7. Sound is optional and must be quiet (gain <= 0.08) and only start after the player pressed Play.
8. Performance: 60fps on a phone. Canvas is fine; scale it with devicePixelRatio (cap at 2).
9. If `matchMedia("(prefers-reduced-motion: reduce)")` matches, tone down screen shake/flashing.
10. localStorage only under keys starting with `<id>-`, wrapped in try/catch.
11. A round should last 30 seconds to 5 minutes. Make it fun, cute and readable.
12. Only edit `games/<id>.js` and add images under `images/<id>/`. Do not touch other files.

## Fluid motion (hard requirement: "smooth as water")

The owner wants EVERY animation to be perfectly fluid. Drawn sprite sheets only have a few frames,
so fluidity has to come from continuous motion on top of them:

1. One `requestAnimationFrame` loop driven by real elapsed time (performance.now / rAF timestamp).
   Never move things in steps from `setInterval`/`setTimeout`; use timers only for game logic, not motion.
2. Every on-screen position, scale, rotation and opacity changes continuously and is EASED
   (ease-out for arrivals, ease-in-out for loops, springs/overshoot for pops). Nothing teleports or snaps:
   if something must appear/disappear, fade/scale it over 80-200ms.
3. Characters always have secondary motion at 60fps, layered over the sprite frames: idle breathing
   (scale y 1 +/- 1.5%), a body bob tied to the run/walk cycle, a lean into the direction of movement,
   squash on landing, stretch on take-off, a slight overshoot when they stop.
4. When a sprite frame changes, CROSSFADE from the old frame to the new one over about 60-90ms
   (draw both, old with decreasing alpha), unless the change is a deliberate impact frame.
5. Physics on a fixed timestep must be RENDERED INTERPOLATED between the last two steps.
6. Cap the per-frame delta (e.g. 50ms) so tab switches don't cause jumps; no layout thrashing; animate
   with transforms/opacity in the DOM (never top/left/width) and `will-change` sparingly.
7. UI also flows: buttons ease on hover/press, score numbers count up smoothly, banners/panels slide or
   fade with easing, progress bars animate their width/transform.
8. 60fps on a mid-range phone; if `prefers-reduced-motion` is set, keep motion gentle (no shake,
   smaller bobs, shorter distances) but still smooth.

## Testing it yourself

`python3 -m http.server 8000` in the repo root, open `http://localhost:8000/?play=<id>`
(the API calls will fail locally, which is fine: the game must still be playable).
