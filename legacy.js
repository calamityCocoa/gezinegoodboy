/* The "classic" page for old browsers (3DS, Wii U, Vita, Kindle, KaiOS...): live verdict,
 * reports, headpats and ETA, without the background video, animations or the game.
 * Old-fashioned JavaScript on purpose (no let/const/arrow functions/fetch/promises).
 * Loaded by <script nomodule> in old browsers, or by device.js for ?classic=1.
 */
(function () {
  var started = false;
  var BAD = "I've been a bad boy!";
  var GOOD = "I'm living in a hut in the middle of nowhere and not helping the hacking community with their Switch 2 fun and i'm boring and sad and enabled emails so nintendo could DMCA me and stuff";
  var ETAS = ["Soon(tm)", "2 weeks", "When it's ready", "Every time you ask it gets delayed a week",
    "When John Nintendo stops watching", "gezine is busy in his hut, try again later",
    "After the next firmware update patches it", "Never. Go outside."];

  function $(id) { return document.getElementById(id); }
  function show(id, text) {
    var el = $(id);
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createTextNode(String(text)));
  }
  function parse(text) {
    if (window.JSON && JSON.parse) return JSON.parse(text);
    return null; // too old to read the data safely
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function day(iso) {
    // old browsers can't always parse ISO dates, so do it by hand
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "unknown";
  }
  function daysSince(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return "never";
    var then = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return Math.floor((new Date().getTime() - then) / 86400000);
  }

  // ---------- gezine's picture ----------
  var mood = "good", patTimer = null;
  function setPic(src) { var img = $("gezine-img"); if (img) img.src = src; }
  function idle() { setPic(mood === "bad" ? "images/bad/0.png" : "images/good/0.png"); }
  function patAnim() {
    if (mood !== "good") return;
    var i = 0;
    clearTimeout(patTimer);
    (function step() {
      if (i > 3) { idle(); return; }
      setPic("images/pat/" + i + ".png");
      i++;
      patTimer = setTimeout(step, 250);
    })();
  }

  // ---------- the data ----------
  function render(data) {
    var bad = !!data.badBoy;
    mood = bad ? "bad" : "good";
    show("verdict", bad ? "No. He has been a bad boy." : "Yes. For now.");
    show("bubble", bad ? BAD : GOOD);
    show("mood-btn", bad ? "Press F to pay respects" : "Give gezine headpats");
    show("count", data.nintendoCount);
    show("total", data.total);
    show("days", data.lastNintendoAt ? daysSince(data.lastNintendoAt) : "never");
    document.body.className = (document.body.className || "").replace(/\b(good|bad)\b/g, "") + " " + mood;
    idle();

    var body = $("reports");
    if (body) {
      while (body.firstChild) body.removeChild(body.firstChild);
      var list = data.reports || [];
      for (var i = 0; i < list.length; i++) {
        var r = list[i], tr = document.createElement("tr");
        if (r.isNintendo) tr.className = "nintendo";
        var cells = [r.title || "Secret undisclosed report", r.company || "hidden",
          r.disclosed ? "disclosed" : "not disclosed", r.activityAt ? day(r.activityAt) : "unknown"];
        for (var k = 0; k < cells.length; k++) {
          var td = document.createElement("td");
          if (k === 0 && r.url) {
            var a = document.createElement("a");
            a.href = r.url;
            a.appendChild(document.createTextNode(cells[k]));
            td.appendChild(a);
          } else td.appendChild(document.createTextNode(cells[k]));
          tr.appendChild(td);
        }
        body.appendChild(tr);
      }
      if (!list.length) { var row = document.createElement("tr"), c = document.createElement("td"); c.colSpan = 4; c.appendChild(document.createTextNode("No reports found")); row.appendChild(c); body.appendChild(row); }
    }
    if (data.checkedAt) {
      var t = new Date();
      show("checked", "Last checked: " + day(data.checkedAt) + " (" + pad(t.getHours()) + ":" + pad(t.getMinutes()) + " your time)");
    }
  }

  function failed() {
    show("verdict", "Couldn't check right now, try again later.");
    var body = $("reports");
    if (body) { while (body.firstChild) body.removeChild(body.firstChild); var row = document.createElement("tr"), c = document.createElement("td"); c.colSpan = 4; c.appendChild(document.createTextNode("Couldn't load reports")); row.appendChild(c); body.appendChild(row); }
  }

  function check() {
    var xhr;
    try { xhr = new XMLHttpRequest(); } catch (e) { failed(); return; }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = null;
      try { data = xhr.status === 200 ? parse(xhr.responseText) : null; } catch (e) { data = null; }
      if (data && !data.error) render(data); else failed();
    };
    try { xhr.open("GET", "/api/gezine", true); xhr.send(null); } catch (e) { failed(); }
  }

  // ---------- buttons ----------
  var pats = 0, fs = 0;
  function start() {
    if (started) return;
    started = true;
    var moodBtn = $("mood-btn"), etaBtn = $("eta-btn");
    if (moodBtn) moodBtn.onclick = function () {
      if (mood === "bad") { fs++; show("mood-count", "F x" + fs + " (respects paid)"); }
      else { pats++; show("mood-count", "headpats given: " + pats); patAnim(); }
      return false;
    };
    if (etaBtn) etaBtn.onclick = function () { show("eta", ETAS[Math.floor(Math.random() * ETAS.length)]); return false; };
    show("mood-btn", "Give gezine headpats");
    check();
    setInterval(check, 600000);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") start();
  else if (document.addEventListener) document.addEventListener("DOMContentLoaded", start, false);
  if (window.addEventListener) window.addEventListener("load", start, false);
  else window.onload = start;
})();
