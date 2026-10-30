(function () {
  "use strict";

  var openBtn = document.getElementById("reveal-open");
  var dlg = document.getElementById("reveal");
  if (!openBtn || !dlg || !dlg.showModal) return;

  var api = ((window.SITE_CONFIG || {}).revealApi || "").replace(/\/$/, "");
  var help = document.getElementById("reveal-help");
  var sendForm = document.getElementById("reveal-send");
  var checkForm = document.getElementById("reveal-check");
  var addr = document.getElementById("reveal-addr");
  var hp = document.getElementById("reveal-hp");
  var code = document.getElementById("reveal-code");
  var again = document.getElementById("reveal-again");
  var out = document.getElementById("reveal-out");
  var msg = document.getElementById("reveal-msg");
  var pending = "";
  var busy = false;

  function say(text, bad) { msg.textContent = text; msg.className = "reveal-msg" + (bad ? " bad" : ""); }

  function reset() {
    sendForm.hidden = false; checkForm.hidden = true; out.hidden = true;
    help.hidden = false; code.value = ""; pending = ""; say("");
    if (!api) {
      help.textContent = "The email form isn't switched on yet. Message me on Instagram @y.rey_info in the meantime.";
      sendForm.hidden = true;
    } else {
      help.textContent = "It keeps the bots out. Give me your email and I'll send you a 6-digit code.";
    }
  }

  function post(path, body) {
    return fetch(api + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
    });
  }

  openBtn.addEventListener("click", function () { reset(); dlg.showModal(); (api ? addr : dlg.querySelector(".lb-close")).focus(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  again.addEventListener("click", function () { reset(); addr.focus(); });

  sendForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var v = addr.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say("That doesn't look like an email address.", true); return; }
    busy = true; say("Sending...");
    post("/send", { email: v, website: hp.value }).then(function (j) {
      busy = false;
      if (j.ok) {
        pending = v; sendForm.hidden = true; checkForm.hidden = false;
        help.textContent = "Code sent to " + v + ". It lasts 10 minutes. Check spam if you don't see it.";
        say(""); code.focus();
      } else if (j.status === 429) {
        say(j.error || "Too many tries. Please wait a bit.", true);
      } else {
        say(j.error || "Couldn't send that. Try again in a minute.", true);
      }
    }).catch(function () { busy = false; say("Couldn't reach the server. Try again in a minute.", true); });
  });

  checkForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var c = code.value.replace(/\D/g, "");
    if (c.length !== 6) { say("The code is 6 digits.", true); return; }
    busy = true; say("Checking...");
    post("/verify", { email: pending, code: c }).then(function (j) {
      busy = false;
      if (j.ok && j.contact) {
        checkForm.hidden = true; help.hidden = true; say("");
        out.hidden = false; out.textContent = "";
        var a = document.createElement("a");
        a.href = "mailto:" + j.contact; a.textContent = j.contact;
        out.appendChild(a);
      } else {
        say(j.error || "That code didn't work.", true);
      }
    }).catch(function () { busy = false; say("Couldn't reach the server. Try again in a minute.", true); });
  });
})();
