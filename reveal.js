(function () {
  "use strict";

  var openBtn = document.getElementById("reveal-open");
  var dlg = document.getElementById("reveal");
  if (!openBtn || !dlg || !dlg.showModal) return;

  var api = ((window.SITE_CONFIG || {}).revealApi || "").replace(/\/$/, "");
  var $ = function (id) { return document.getElementById(id); };
  var panes = [$("rv-1"), $("rv-2"), $("rv-3"), $("rv-4")];
  var help = $("reveal-help"), msg = $("reveal-msg");
  var addr = $("reveal-addr"), hp = $("reveal-hp");
  var digits = Array.prototype.slice.call(dlg.querySelectorAll(".rv-code input"));
  var nameIn = $("rv-name"), msgIn = $("rv-msg");
  var email = "", token = "", edited = false, busy = false;

  function say(text, bad) { msg.textContent = text; msg.className = "reveal-msg" + (bad ? " bad" : ""); }

  function show(n) {
    panes.forEach(function (p, i) { p.hidden = i !== n; });
    var step = Math.min(n + 1, 3);
    $("rv-fill").style.width = (n === 3 ? 100 : step * 33.3) + "%";
    $("rv-step").textContent = n === 3 ? "Done" : step + " of 3";
    dlg.querySelector(".rv-bar").setAttribute("aria-valuenow", step);
    say("");
  }

  function draft() {
    var n = nameIn.value.trim() || "[your name]";
    return "Hi Aubs,\n\nMy name is " + n + ". I saw your website and loved your event photography.\n\nI'd like to talk about ";
  }

  function reset() {
    email = token = ""; edited = false; busy = false;
    digits.forEach(function (d) { d.value = ""; });
    nameIn.value = ""; msgIn.value = draft();
    show(0);
    $("reveal-send").hidden = !api;
    help.textContent = api ? "I'll send you a 6-digit code first. It keeps the bots out."
      : "The message form isn't switched on yet. Message me on Instagram @y.rey_info in the meantime.";
  }

  function post(path, body) {
    return fetch(api + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }

  function guard(btn, fn) {
    if (busy) return;
    busy = true; btn.disabled = true;
    fn(function () { busy = false; btn.disabled = false; });
  }

  openBtn.addEventListener("click", function () {
    reset(); dlg.showModal();
    (api ? addr : dlg.querySelector(".lb-close")).focus();
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  $("reveal-again").addEventListener("click", function () { show(0); addr.focus(); });

  // Step 1: ask for a code
  $("reveal-send").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = addr.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say("That doesn't look like an email address.", true); return; }
    guard(e.target.querySelector(".btn"), function (done) {
      say("Sending...");
      post("/send", { email: v, website: hp.value }).then(function (j) {
        done();
        if (j.ok) {
          email = v;
          $("rv-sent").textContent = "Enter the 6-digit code sent to " + v + ". It lasts 10 minutes, and it may be in spam.";
          show(1); digits[0].focus();
        } else say(j.error || "Couldn't send that. Try again in a minute.", true);
      }).catch(function () { done(); say("Couldn't reach the server. Try again in a minute.", true); });
    });
  });

  // Step 2: six boxes, with auto-advance, backspace and paste
  digits.forEach(function (d, i) {
    d.addEventListener("input", function () {
      d.value = d.value.replace(/\D/g, "").slice(-1);
      if (d.value && digits[i + 1]) digits[i + 1].focus();
      if (digits.every(function (x) { return x.value; })) $("reveal-check").requestSubmit();
    });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !d.value && digits[i - 1]) { digits[i - 1].focus(); digits[i - 1].value = ""; }
      if (e.key === "ArrowLeft" && digits[i - 1]) digits[i - 1].focus();
      if (e.key === "ArrowRight" && digits[i + 1]) digits[i + 1].focus();
    });
    d.addEventListener("paste", function (e) {
      var t = ((e.clipboardData || window.clipboardData).getData("text") || "").replace(/\D/g, "").slice(0, 6);
      if (!t) return;
      e.preventDefault();
      digits.forEach(function (x, k) { x.value = t[k] || ""; });
      digits[Math.min(t.length, 5)].focus();
      if (t.length === 6) $("reveal-check").requestSubmit();
    });
  });

  $("reveal-check").addEventListener("submit", function (e) {
    e.preventDefault();
    var c = digits.map(function (d) { return d.value; }).join("");
    if (c.length !== 6) { say("The code is 6 digits.", true); return; }
    guard(e.target.querySelector(".btn"), function (done) {
      say("Checking...");
      post("/verify", { email: email, code: c }).then(function (j) {
        done();
        if (j.ok && j.token) {
          token = j.token; $("rv-from").textContent = email;
          show(2); nameIn.focus();
        } else {
          say(j.error || "That code didn't work.", true);
          digits.forEach(function (d) { d.value = ""; }); digits[0].focus();
        }
      }).catch(function () { done(); say("Couldn't reach the server. Try again in a minute.", true); });
    });
  });

  // Step 3: the draft. The greeting follows the name field until the visitor edits the text.
  msgIn.addEventListener("input", function () { edited = true; });
  nameIn.addEventListener("input", function () { if (!edited) msgIn.value = draft(); });

  $("reveal-write").addEventListener("submit", function (e) {
    e.preventDefault();
    var n = nameIn.value.trim(), m = msgIn.value.trim();
    if (!n) { say("Add your name.", true); nameIn.focus(); return; }
    if (m.length < 10) { say("Write a little more.", true); return; }
    guard(e.target.querySelector(".btn"), function (done) {
      say("Sending...");
      post("/message", { email: email, token: token, name: n, message: m }).then(function (j) {
        done();
        if (j.ok) {
          var out = $("reveal-out"); out.textContent = "";
          if (j.contact) { var a = document.createElement("a"); a.href = "mailto:" + j.contact; a.textContent = j.contact; out.appendChild(a); }
          show(3);
        } else say(j.error || "Couldn't send that. Try again in a minute.", true);
      }).catch(function () { done(); say("Couldn't reach the server. Try again in a minute.", true); });
    });
  });
})();
