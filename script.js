(function () {
  "use strict";

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Tabs ---------- */
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabContents = document.querySelectorAll("[data-tab-content]");
  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabButtons.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      var target = btn.getAttribute("data-tab");
      tabContents.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-tab-content") !== target;
      });
    });
  });

  /* ---------- Duotone style palettes ---------- */
  var PALETTES = [
    { name: "Ink Wash", dark: [43, 27, 20], light: [243, 233, 216] },
    { name: "Berry Bloom", dark: [94, 33, 43], light: [243, 233, 216] },
    { name: "Golden Hour", dark: [43, 27, 20], light: [201, 138, 44] },
    { name: "Plum Dusk", dark: [74, 25, 66], light: [233, 220, 195] }
  ];
  var paletteIndex = 0;
  var currentImage = null;

  /* ---------- Credits state machine ----------
     phase: 'free' -> 1 preview before signup
            'signedup' -> 4 further credits
            'exhausted' -> prompt to top up
  ---------------------------------------------- */
  var state = { phase: "free", used: 0, total: 1 };

  var creditsLine = document.getElementById("creditsLine");
  var creditsFootnote = document.getElementById("creditsFootnote");
  var punchCard = document.getElementById("punchCard");
  var regenBtn = document.getElementById("regenBtn");
  var describeBtn = document.getElementById("describeBtn");

  function renderPunchCard() {
    punchCard.innerHTML = "";
    for (var i = 0; i < state.total; i++) {
      var dot = document.createElement("span");
      dot.className = "punch" + (i < state.used ? " used" : "");
      punchCard.appendChild(dot);
    }
  }

  function renderCreditsCopy() {
    if (state.phase === "free") {
      creditsLine.textContent =
        state.used < 1 ? "1 free preview available" : "Free preview used";
      creditsFootnote.textContent =
        "After your free preview, sign up for 4 more changes — or top up 10 further credits for £5, taken off your order if you print.";
    } else if (state.phase === "signedup") {
      var left = state.total - state.used;
      creditsLine.textContent = left + " of " + state.total + " credits left";
      creditsFootnote.textContent =
        "Signed up — you've unlocked 4 more changes. Run out and you can top up 10 more for £5.";
    } else {
      creditsLine.textContent = "Out of credits";
      creditsFootnote.textContent =
        "Top up 10 more credits for £5 — the cost comes off your order if you go on to print.";
    }
    renderPunchCard();
  }

  function consumeCredit(onGenerate) {
    if (state.phase === "exhausted") {
      creditsLine.textContent = "Top up 10 credits for £5 to keep going";
      return false;
    }
    if (state.used >= state.total) {
      if (state.phase === "free") {
        // simulate signing up
        state.phase = "signedup";
        state.used = 0;
        state.total = 4;
      } else if (state.phase === "signedup") {
        state.phase = "exhausted";
        renderCreditsCopy();
        return false;
      }
    }
    state.used += 1;
    if (state.phase === "signedup" && state.used >= state.total) {
      // will flip to exhausted on next attempt
    }
    renderCreditsCopy();
    onGenerate();
    return true;
  }

  renderCreditsCopy();

  /* ---------- Upload + duotone canvas ---------- */
  var photoInput = document.getElementById("photoInput");
  var canvas = document.getElementById("previewCanvas");
  var placeholder = document.getElementById("framePlaceholder");
  var ctx = canvas.getContext("2d");

  function applyDuotone(img, palette) {
    var maxW = 480, maxH = 380;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(maxW / w, maxH / h, 1);
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    var frame;
    try {
      frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      // Canvas may be tainted if opened directly from disk in some browsers;
      // fail quietly and leave the plain image in place.
      return;
    }
    var d = frame.data;
    for (var i = 0; i < d.length; i += 4) {
      var lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      d[i] = palette.dark[0] + (palette.light[0] - palette.dark[0]) * lum;
      d[i + 1] = palette.dark[1] + (palette.light[1] - palette.dark[1]) * lum;
      d[i + 2] = palette.dark[2] + (palette.light[2] - palette.dark[2]) * lum;
    }
    ctx.putImageData(frame, 0, 0);
  }

  function generatePreview() {
    if (!currentImage) return;
    applyDuotone(currentImage, PALETTES[paletteIndex]);
    canvas.hidden = false;
    placeholder.hidden = true;
    regenBtn.disabled = false;
  }

  photoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        currentImage = img;
        paletteIndex = 0;
        consumeCredit(generatePreview);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  regenBtn.addEventListener("click", function () {
    if (!currentImage) return;
    paletteIndex = (paletteIndex + 1) % PALETTES.length;
    consumeCredit(generatePreview);
  });

  /* ---------- Describe tab ---------- */
  var describeInput = document.getElementById("describeInput");
  var posterMockup = document.getElementById("posterMockup");
  var posterText = document.getElementById("posterText");

  var POSTER_GRADIENTS = [
    "linear-gradient(155deg, rgba(122,46,59,0.16), rgba(201,138,44,0.24))",
    "linear-gradient(155deg, rgba(74,25,66,0.16), rgba(233,220,195,0.5))",
    "linear-gradient(155deg, rgba(43,27,20,0.14), rgba(201,138,44,0.26))"
  ];
  var gradientIndex = 0;

  describeBtn.addEventListener("click", function () {
    var text = describeInput.value.trim();
    if (!text) {
      describeInput.focus();
      return;
    }
    consumeCredit(function () {
      posterText.textContent = "\u201C" + text + "\u201D";
      gradientIndex = (gradientIndex + 1) % POSTER_GRADIENTS.length;
      posterMockup.style.backgroundImage =
        POSTER_GRADIENTS[gradientIndex] + ", none";
    });
  });
})();
