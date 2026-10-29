(function () {
  "use strict";

  var PHOTOS = window.PHOTOS || [];
  var ROLL = 36;

  // Each print is named after a kind of shot. They come out in a shuffled order,
  // and every shot appears once before any repeats.
  var SHOTS = [
    "Wide shot", "Medium shot", "Close-up", "Detail shot",
    "Dutch angle", "Extreme close-up", "Cowboy shot", "Medium full shot",
    "Full shot", "Bird's-eye view", "American shot", "Point of view",
    "Over-the-shoulder", "Two-shot", "Three-shot", "Over-the-hip"
  ];
  var deck = [];

  function nextShot() {
    if (!deck.length) {
      deck = SHOTS.slice();
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
      }
    }
    return deck.pop();
  }

  var HUES = [12, 28, 200, 265, 340, 160, 40, 220];

  function placeholder(i, label) {
    var hue = HUES[i % HUES.length];
    var el = document.createElement("div");
    el.className = "ph";
    el.style.background =
      "linear-gradient(135deg, hsl(" + hue + " 45% 22%), hsl(" + ((hue + 40) % 360) + " 40% 10%))";
    el.textContent = label;
    return el;
  }

  function media(photo, i) {
    if (photo.src) {
      var img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.alt || photo.title || "";
      img.loading = "lazy";
      if (photo.pos) img.style.objectPosition = photo.pos;
      return img;
    }
    return placeholder(i, photo.title || "Frame");
  }

  // ---- Gallery ----
  var grid = document.getElementById("grid");
  if (grid) {
    // index.html sets data-layout="mosaic" on #grid; styles.css has the matching rules.
    grid.className = "grid layout-" + (grid.getAttribute("data-layout") || "grid");
    PHOTOS.forEach(function (p, i) {
      var tile = document.createElement("figure");
      tile.className = "tile";
      tile.style.margin = "0";
      tile.appendChild(media(p, i));
      var cap = document.createElement("figcaption");
      cap.className = "cap";
      cap.textContent = p.event || p.title || "";
      tile.appendChild(cap);
      grid.appendChild(tile);
    });
  }

  // ---- Shutter ----
  var btn = document.getElementById("shutter");
  var flash = document.getElementById("flash");
  var print = document.getElementById("print");
  var frame = document.getElementById("print-frame");
  var cap = document.getElementById("print-cap");
  var roll = document.getElementById("print-roll");
  var closeBtn = document.getElementById("print-close");
  var tip = btn && btn.querySelector(".tip");
  var exposure = 0;
  var audio = null;

  function click() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio = audio || new Ctx();
      var t = audio.currentTime;
      [0, 0.07].forEach(function (offset, n) {
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.type = "square";
        osc.frequency.value = n === 0 ? 1800 : 900;
        gain.gain.setValueAtTime(0.08, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.05);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.06);
      });
    } catch (e) { /* audio is optional */ }
  }

  function doFlash() {
    if (!flash) return;
    flash.classList.remove("go");
    void flash.offsetWidth;
    flash.classList.add("go");
  }

  function snap() {
    if (!print) return;
    if (exposure >= ROLL) {
      showRollDone();
      return;
    }
    exposure += 1;
    click();
    doFlash();

    var idx = Math.floor(Math.random() * Math.max(PHOTOS.length, 1));
    var photo = PHOTOS.length ? PHOTOS[idx] : { title: "Frame" };

    frame.innerHTML = "";
    frame.appendChild(media(photo, idx));
    cap.textContent = nextShot();
    roll.textContent = "Exposure " + exposure + " of " + ROLL;

    print.hidden = false;
    print.classList.remove("developing");
    void print.offsetWidth;
    print.classList.add("developing");
    if (tip) tip.style.display = "none";
  }

  function showRollDone() {
    frame.innerHTML = "";
    frame.appendChild(placeholder(0, "ROLL FINISHED"));
    cap.textContent = "That is all 36. Reload the page to load a fresh roll.";
    roll.textContent = "Exposure " + ROLL + " of " + ROLL;
    print.hidden = false;
    print.classList.remove("developing");
  }

  function closePrint() { if (print) print.hidden = true; }

  if (btn) btn.addEventListener("click", snap);
  if (closeBtn) closeBtn.addEventListener("click", closePrint);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closePrint(); return; }
    var tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "s" || e.key === "S") snap();
  });
})();
