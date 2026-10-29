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
    // index.html sets data-layout="rows" on #grid; styles.css has the matching rules.
    grid.className = "grid layout-" + (grid.getAttribute("data-layout") || "rows");
    PHOTOS.forEach(function (p, i) {
      var tile = document.createElement("figure");
      tile.className = "tile";
      tile.style.setProperty("--ar", p.w && p.h ? (p.w / p.h).toFixed(4) : "1.5");
      var cap = document.createElement("figcaption");
      cap.className = "cap";
      cap.textContent = (p.event || p.title || "") + (p.credit ? " · Photo: " + p.credit : "");
      if (p.src) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tile-btn";
        b.setAttribute("aria-label", "View larger: " + (p.event || "photo") + (p.credit ? ", photo by " + p.credit : "") + ". " + (p.alt || ""));
        b.appendChild(media(p, i));
        b.appendChild(cap);
        b.addEventListener("click", function () { openViewer(i, b); });
        tile.appendChild(b);
      } else {
        tile.appendChild(media(p, i));
        tile.appendChild(cap);
      }
      grid.appendChild(tile);
    });
  }

  // ---- Photo viewer ----
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img");
  var lbEvent = document.getElementById("lb-event");
  var lbDate = document.getElementById("lb-date");
  var lbDesc = document.getElementById("lb-desc");
  var lbCredit = document.getElementById("lb-credit");
  var lbSpecs = document.getElementById("lb-specs");
  var lbCount = document.getElementById("lb-count");
  var lbClose = document.getElementById("lb-close");
  var lbPrev = document.getElementById("lb-prev");
  var lbNext = document.getElementById("lb-next");
  var lbStage = document.getElementById("lb-stage");
  var viewing = -1;
  var returnFocus = null;

  function viewerOpen() { return !!lb && !lb.hidden; }

  function renderViewer() {
    var p = PHOTOS[viewing];
    lbImg.src = p.src;
    lbImg.alt = p.alt || "";
    lbEvent.textContent = p.event || "";
    lbDate.textContent = p.date || "";
    lbDate.hidden = !p.date;
    lbCredit.textContent = p.credit ? "Photo by " + p.credit : "";
    lbCredit.hidden = !p.credit;
    lbDesc.textContent = p.alt || "";
    lbCount.textContent = (viewing + 1) + " / " + PHOTOS.length;

    lbSpecs.innerHTML = "";
    [["Camera", p.camera], ["Lens", p.lens], ["Aperture", p.aperture], ["Shutter", p.shutter], ["ISO", p.iso && p.iso.replace(/^ISO\s*/, "")]]
      .forEach(function (row) {
        if (!row[1]) return;
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        lbSpecs.appendChild(dt);
        lbSpecs.appendChild(dd);
      });
    lbSpecs.hidden = !lbSpecs.children.length;

    // Warm the neighbours so arrows feel instant.
    [1, -1].forEach(function (d) {
      var n = PHOTOS[(viewing + d + PHOTOS.length) % PHOTOS.length];
      if (n && n.src) { var pre = new Image(); pre.src = n.src; }
    });
  }

  function openViewer(i, trigger) {
    if (!lb) return;
    viewing = i;
    returnFocus = trigger || null;
    renderViewer();
    lb.hidden = false;
    document.body.classList.add("lb-open");
    lbClose.focus();
  }

  function closeViewer() {
    if (!viewerOpen()) return;
    lb.hidden = true;
    document.body.classList.remove("lb-open");
    lbImg.removeAttribute("src");
    if (returnFocus) returnFocus.focus();
  }

  function step(d) {
    viewing = (viewing + d + PHOTOS.length) % PHOTOS.length;
    renderViewer();
  }

  if (lb) {
    lbClose.addEventListener("click", closeViewer);
    lbPrev.addEventListener("click", function () { step(-1); });
    lbNext.addEventListener("click", function () { step(1); });
    // Clicking the dark space around the photo closes it.
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target === lbStage || e.target.classList.contains("lb-body")) closeViewer();
    });
    // Swipe left or right on touch screens.
    var startX = null;
    lbStage.addEventListener("pointerdown", function (e) { startX = e.clientX; });
    lbStage.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
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

    // Prints only use photos Aubs took herself; credited photos stay in the gallery.
    var own = PHOTOS.filter(function (p) { return !p.credit; });
    var idx = Math.floor(Math.random() * Math.max(own.length, 1));
    var photo = own.length ? own[idx] : { title: "Frame" };

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
    if (viewerOpen()) {
      if (e.key === "Escape") { closeViewer(); }
      else if (e.key === "ArrowLeft") { step(-1); }
      else if (e.key === "ArrowRight") { step(1); }
      else if (e.key === "Tab") {
        // Keep keyboard focus inside the viewer.
        var items = [lbClose, lbPrev, lbNext];
        var at = items.indexOf(document.activeElement);
        if (e.shiftKey && at <= 0) { items[items.length - 1].focus(); e.preventDefault(); }
        else if (!e.shiftKey && at === items.length - 1) { items[0].focus(); e.preventDefault(); }
      }
      return;
    }
    if (e.key === "Escape") { closePrint(); return; }
    var tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "s" || e.key === "S") snap();
  });
})();
