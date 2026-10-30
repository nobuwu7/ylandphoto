(function () {
  "use strict";

  var openBtn = document.getElementById("reveal-open");
  var dlg = document.getElementById("reveal");
  if (!openBtn || !dlg || !dlg.showModal) return;

  var key = (window.SITE_CONFIG || {}).contactKey || "";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("reveal-write"), msg = $("reveal-msg"), busy = false;

  function say(text, bad) { msg.textContent = text; msg.className = "reveal-msg" + (bad ? " bad" : ""); }

  openBtn.addEventListener("click", function () {
    $("rv-form").hidden = false; $("rv-done").hidden = true; say("");
    if (!key) say("The contact form isn't switched on yet. Please check back soon.", true);
    dlg.showModal();
    $("rv-name").focus();
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var n = $("rv-name").value.trim(), em = $("rv-email").value.trim(), m = $("rv-msg").value.trim();
    if (!key) { say("The contact form isn't switched on yet. Please check back soon.", true); return; }
    if (!n) { say("Add your name.", true); $("rv-name").focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { say("That doesn't look like an email address.", true); $("rv-email").focus(); return; }
    if (m.length < 10) { say("Write a little more, so I know what you need.", true); $("rv-msg").focus(); return; }
    busy = true; say("Sending...");
    var btn = form.querySelector(".btn"); btn.disabled = true;
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ access_key: key, subject: "Portfolio message from " + n, name: n, email: em, message: m, botcheck: $("rv-hp").checked })
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        busy = false; btn.disabled = false;
        if (j.success) { form.reset(); $("rv-form").hidden = true; $("rv-done").hidden = false; say(""); }
        else say("Couldn't send that. Please try again in a minute.", true);
      })
      .catch(function () { busy = false; btn.disabled = false; say("Couldn't reach the server. Please try again in a minute.", true); });
  });
})();
