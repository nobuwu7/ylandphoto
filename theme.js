// Runs in <head> so the saved theme is applied before the page paints (no flash).
(function () {
  "use strict";
  var KEY = "theme";
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    m.content = t === "light" ? "#f4f3ef" : "#080808";
  }
  apply(saved() === "light" ? "light" : "dark");

  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("theme");
    if (!b) return;
    function label() {
      var light = document.documentElement.getAttribute("data-theme") === "light";
      b.textContent = light ? "Dark" : "Light";
      b.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    }
    label();
    b.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* private mode: fine, just not remembered */ }
      label();
    });
  });
})();
