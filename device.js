/* Works out what the page is running on (Switch 2, Switch 1, Wii U, 3DS, PlayStation,
 * Xbox, Steam Deck, TVs, Kindles, phones, cars...) and gives each one its own greeting,
 * accent colour and tweaks.
 *
 * Written in old-fashioned JavaScript (no let/const, arrow functions etc.) on purpose,
 * so the 3DS, Wii U and other old browsers can run it too.
 *
 * Exposes window.GEZ_DEVICE = { id, name, family, legacy, tv, eink, touch, greeting, ... }
 * and adds classes to <html>: dev-<id>, fam-<family>, and legacy / tv / eink when they apply.
 * Add ?device=<id> to the address to preview any device, and ?classic=1 for the old-browser version.
 */
(function () {
  var ua = navigator.userAgent || "";
  var W = (window.screen && screen.width) || 0, H = (window.screen && screen.height) || 0;
  var longSide = W > H ? W : H, shortSide = W > H ? H : W;
  var touchPoints = navigator.maxTouchPoints || 0;
  var has = function (re) { return re.test(ua); };

  // id, name, family, accent colour, what gezine says, and how you control the game
  var D = {
    "switch2":   ["Nintendo Switch 2", "nintendo", "#e60012", "You're on a Switch 2! The very console this bootstrap.bas is for. John Nintendo can probably see you right now.", "Touch the screen, or move the cursor with the stick."],
    "switch1":   ["Nintendo Switch", "nintendo", "#e60012", "A Switch 1 in the wild! Old reliable. gezine's CivSwitch says hi.", "Touch the screen, or move the cursor with the stick."],
    "wiiu":      ["Wii U", "nintendo", "#009ac7", "A Wii U?! Respect. Nintendo shut the eShop, but gezine never forgets.", "Use the GamePad's touch screen."],
    "new3ds":    ["New Nintendo 3DS", "nintendo", "#ce181e", "New 3DS spotted. Pocket-sized good boy tracking.", "Tap the bottom screen."],
    "3ds":       ["Nintendo 3DS", "nintendo", "#ce181e", "A 3DS (or 2DS)! Two screens, zero DMCAs.", "Tap the bottom screen."],
    "dsi":       ["Nintendo DSi", "nintendo", "#a4a4a4", "A DSi. Opera on a DSi in this day and age. Legendary.", "Tap the screen."],
    "wii":       ["Wii", "nintendo", "#34bedd", "Browsing on a Wii! Point the Wii Remote and pray.", "Point the Wii Remote."],
    "ps5":       ["PlayStation 5", "playstation", "#0070d1", "A PS5? gezine made Y2JB for that. He's been busy.", "Move the cursor with the stick."],
    "ps4":       ["PlayStation 4", "playstation", "#003791", "A PS4! gezine's ftpsrv works on those, you know.", "Move the cursor with the stick."],
    "ps3":       ["PlayStation 3", "playstation", "#1f1f1f", "A PS3. The browser is slow, but so is John Nintendo's legal team. Wait, no it isn't.", "Move the cursor with the stick."],
    "vita":      ["PlayStation Vita", "playstation", "#003791", "A Vita! Gone too soon, like every homebrew scene's free time.", "Tap the screen."],
    "psp":       ["PSP", "playstation", "#1f1f1f", "A PSP. You absolute legend.", "Move the cursor with the stick."],
    "xbox":      ["Xbox", "xbox", "#107c10", "An Xbox. gezine is a Nintendo and PlayStation man, but he'll allow it.", "Use the controller, or move the cursor."],
    "steamdeck": ["Steam Deck", "pc", "#1a9fff", "A Steam Deck! Verified good boy.", "Touch the screen, or use the controls."],
    "quest":     ["Meta Quest", "vr", "#1c2b33", "Reading this in VR. gezine is life-size now.", "Point and pull the trigger."],
    "tesla":     ["Tesla", "car", "#cc0000", "Please don't play Headset Hero while driving. gezine needs you alive.", "Tap the screen (parked only, please)."],
    "firetv":    ["Fire TV", "tv", "#ff9900", "On a Fire TV! Big gezine energy.", "Use the remote's arrows and select."],
    "chromecast":["Google TV", "tv", "#4285f4", "On a TV! Big gezine energy.", "Use the remote's arrows and select."],
    "lgtv":      ["LG TV", "tv", "#a50034", "On an LG TV! Big gezine energy.", "Use the remote's arrows and OK."],
    "samsungtv": ["Samsung TV", "tv", "#1428a0", "On a Samsung TV! Big gezine energy.", "Use the remote's arrows and OK."],
    "tv":        ["smart TV", "tv", "#444444", "On a TV! Big gezine energy.", "Use the remote's arrows and OK."],
    "kindle":    ["Kindle", "ereader", "#000000", "A Kindle! gezine in glorious e-ink.", "Tap the screen."],
    "kaios":     ["KaiOS phone", "phone", "#6f02b5", "A KaiOS phone. Tiny screen, huge commitment.", "Use the D-pad."],
    "iphone":    ["iPhone", "phone", "#111111", "", "Drag, or tap where you want her to run."],
    "ipad":      ["iPad", "tablet", "#111111", "", "Drag, or tap where you want her to run."],
    "android":   ["Android phone", "phone", "#3ddc84", "", "Drag, or tap where you want her to run."],
    "androidtab":["Android tablet", "tablet", "#3ddc84", "", "Drag, or tap where you want her to run."],
    "chromeos":  ["Chromebook", "pc", "#4285f4", "", "Move the mouse, or use the arrow keys."],
    "mac":       ["Mac", "pc", "#111111", "", "Move the mouse, or use the arrow keys."],
    "windows":   ["Windows PC", "pc", "#0078d4", "", "Move the mouse, or use the arrow keys."],
    "linux":     ["Linux PC", "pc", "#111111", "A Linux user. Of course you are.", "Move the mouse, or use the arrow keys."],
    "bot":       ["bot", "bot", "#111111", "", ""],
    "unknown":   ["mystery device", "unknown", "#111111", "gezine can't tell what you're on. Very sneaky.", "Use whatever you've got."]
  };

  function detect() {
    if (has(/bot|crawl|spider|slurp|facebookexternalhit|Discordbot|Twitterbot|TelegramBot|WhatsApp|Slackbot|Embedly|preview/i)) return "bot";
    // Nintendo
    if (has(/Nintendo ?Switch ?2|NintendoSwitch2|Switch2/i)) return "switch2";
    if (has(/Nintendo Switch/i)) {
      // Switch 2 may say "Nintendo Switch" too: its browser screen is 1080p, Switch 1's is 720p
      return shortSide >= 1000 ? "switch2" : "switch1";
    }
    if (has(/Nintendo WiiU|Nintendo Wii U/i)) return "wiiu";
    if (has(/New Nintendo 3DS/i)) return "new3ds";
    if (has(/Nintendo 3DS/i)) return "3ds";
    if (has(/Nintendo DSi/i)) return "dsi";
    if (has(/Nintendo Wii/i)) return "wii";
    // PlayStation / Xbox
    if (has(/PlayStation 5/i)) return "ps5";
    if (has(/PlayStation 4/i)) return "ps4";
    if (has(/PLAYSTATION 3/i)) return "ps3";
    if (has(/PlayStation Vita/i)) return "vita";
    if (has(/PlayStation Portable|\bPSP\b/i)) return "psp";
    if (has(/Xbox/i)) return "xbox";
    // other gadgets
    if (has(/Steam ?Deck|Valve Steam/i) || (has(/Linux x86_64/) && !has(/Android/) && longSide === 1280 && shortSide === 800 && (touchPoints > 0 || "ontouchstart" in window))) return "steamdeck";
    if (has(/OculusBrowser|Quest|Pico/i)) return "quest";
    if (has(/Tesla|QtCarBrowser/i)) return "tesla";
    if (has(/AFT[A-Z]|Fire ?TV/i)) return "firetv";
    if (has(/CrKey|GoogleTV|Google TV|Android TV|BRAVIA|AndroidTV/i)) return "chromecast";
    if (has(/Web0S|webOS.*TV|NetCast/i)) return "lgtv";
    if (has(/Tizen.*TV|SMART-TV.*Samsung|SamsungBrowser.*TV/i)) return "samsungtv";
    if (has(/SMART-TV|SmartTV|HbbTV|VIDAA|Viera|Roku|AppleTV|tvOS|\bTV\b.*Safari/i)) return "tv";
    if (has(/Kindle|Kobo/i) && !has(/Silk/i)) return "kindle";
    if (has(/KAIOS/i)) return "kaios";
    // everyday devices
    if (has(/iPad/) || (has(/Macintosh/) && touchPoints > 1)) return "ipad";
    if (has(/iPhone|iPod/)) return "iphone";
    if (has(/Android/)) return has(/Mobile/) ? "android" : "androidtab";
    if (has(/CrOS/)) return "chromeos";
    if (has(/Macintosh|Mac OS X/)) return "mac";
    if (has(/Windows/)) return "windows";
    if (has(/Linux|X11|BSD/)) return "linux";
    return "unknown";
  }

  var q = location.search || "";
  var forced = /[?&]device=([a-z0-9]+)/i.exec(q);
  var id = forced && D[forced[1].toLowerCase()] ? forced[1].toLowerCase() : detect();
  var d = D[id];

  // which browsers get the lightweight "classic" page: no ES2017 / modules, e-ink, or ?classic=1
  var modern = "noModule" in document.createElement("script") && !!window.Promise && !!window.fetch;
  var legacy = !modern || d[1] === "ereader" || id === "kaios" || /[?&]classic=1/.test(q);

  // id -> name, for showing which device each leaderboard score was set on
  var names = {};
  for (var k in D) if (D.hasOwnProperty(k)) names[k] = D[k][0];
  window.GEZ_DEVICE_NAMES = names;

  var dev = window.GEZ_DEVICE = {
    id: id, name: d[0], family: d[1], accent: d[2], greeting: d[3], controls: d[4],
    legacy: legacy, modern: modern,
    nintendo: d[1] === "nintendo", tv: d[1] === "tv" || id === "xbox" || id === "ps4" || id === "ps5" || id === "ps3",
    eink: d[1] === "ereader", car: d[1] === "car",
    touch: touchPoints > 0 || "ontouchstart" in window,
    // big video in the background: not on old consoles, e-ink, cars or data-saver
    allowVideo: !legacy && d[1] !== "car" && id !== "3ds" && id !== "new3ds" && id !== "dsi" && id !== "wii" && id !== "psp" && id !== "vita"
  };

  var root = document.documentElement;
  root.className += " dev-" + id + " fam-" + d[1] + (legacy ? " legacy" : " modern") +
    (dev.tv ? " tv" : "") + (dev.eink ? " eink" : "") + (dev.touch ? " touch" : "") + (dev.allowVideo ? "" : " novideo");
  if (root.style && root.style.setProperty) root.style.setProperty("--accent", d[2]);

  // fill in the device line once the page is there
  function fill() {
    var el = document.getElementById("device-line");
    if (!el || id === "bot") return;
    var name = (/^[aeiou]/i.test(d[0]) ? "an " : "a ") + d[0];
    var text = d[3] || ("Hi from " + name + "! gezine sees you.");
    el.innerHTML = "";
    var b = document.createElement("b");
    b.appendChild(document.createTextNode("Detected: " + d[0] + ". "));
    el.appendChild(b);
    el.appendChild(document.createTextNode(text));
    el.style.display = "block";
    // and a line in the breaking news ticker
    var m = document.getElementsByTagName("marquee")[0];
    if (m) m.appendChild(document.createTextNode(" \u2022\u2022\u2022 BREAKING: gezine has been spotted on " + name + " \u2022\u2022\u2022"));
  }
  if (document.readyState === "loading" || document.readyState === "uninitialized") {
    if (document.addEventListener) document.addEventListener("DOMContentLoaded", fill, false);
    else window.onload = fill;
  } else fill();

  // a module-capable browser forced into classic mode won't run the nomodule script, so load it here
  if (legacy && modern) {
    var s = document.createElement("script");
    s.src = "legacy.js";
    document.getElementsByTagName("head")[0].appendChild(s);
  }
})();
