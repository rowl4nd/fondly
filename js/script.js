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

  /* ---------- Elements ---------- */
  var stepDots = document.querySelectorAll(".step-dot");
  var stepPanels = document.querySelectorAll("[data-step-panel]");
  var stepBack = document.getElementById("stepBack");
  var stepNext = document.getElementById("stepNext");

  var photoInput = document.getElementById("photoInput");
  var fileChosen = document.getElementById("fileChosen");
  var describeInput = document.getElementById("describeInput");
  var printTextInput = document.getElementById("printTextInput");

  var canvas = document.getElementById("previewCanvas");
  var ctx = canvas.getContext("2d");
  var placeholder = document.getElementById("framePlaceholder");
  var posterPreview = document.getElementById("posterPreview");
  var posterText = document.getElementById("posterText");
  var posterCaption = document.getElementById("posterCaption");

  var styleChoices = document.getElementById("styleChoices");
  var colourChoices = document.getElementById("colourChoices");

  var creditsLine = document.getElementById("creditsLine");
  var creditsFootnote = document.getElementById("creditsFootnote");
  var punchCard = document.getElementById("punchCard");

  /* ---------- Wizard state ---------- */
  var currentStep = 1;
  var TOTAL_STEPS = 4;
  var NEXT_LABELS = { 1: "Next: style", 2: "Next: colour", 3: "Next: text" };

  var currentImage = null;
  var selectedStyle = "ink";
  var selectedColour = "mono";
  var hasGenerated = false;

  function goToStep(n) {
    currentStep = Math.min(Math.max(n, 1), TOTAL_STEPS);
    stepDots.forEach(function (dot) {
      dot.classList.toggle("active", Number(dot.getAttribute("data-step")) === currentStep);
    });
    stepPanels.forEach(function (panel) {
      panel.hidden = Number(panel.getAttribute("data-step-panel")) !== currentStep;
    });
    stepBack.disabled = currentStep === 1;
    stepNext.textContent =
      currentStep === TOTAL_STEPS
        ? (hasGenerated ? "Update my preview" : "Generate my preview")
        : NEXT_LABELS[currentStep];
  }

  stepDots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      goToStep(Number(dot.getAttribute("data-step")));
    });
  });

  stepBack.addEventListener("click", function () {
    goToStep(currentStep - 1);
  });

  stepNext.addEventListener("click", function () {
    if (currentStep === 1 && !currentImage && !describeInput.value.trim()) {
      describeInput.focus();
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    } else {
      consumeCredit(generatePreview);
    }
  });

  /* ---------- Style & colour choices ---------- */
  styleChoices.addEventListener("click", function (e) {
    var btn = e.target.closest(".choice-btn");
    if (!btn) return;
    styleChoices.querySelectorAll(".choice-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    selectedStyle = btn.getAttribute("data-style");
  });

  colourChoices.addEventListener("click", function (e) {
    var btn = e.target.closest(".swatch-btn");
    if (!btn) return;
    colourChoices.querySelectorAll(".swatch-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");
    selectedColour = btn.getAttribute("data-colour");
  });

  /* ---------- Colour pairs & style curves ---------- */
  var COLOUR_PAIRS = {
    mono: { dark: [43, 27, 20], light: [243, 233, 216] },
    berry: { dark: [94, 33, 43], light: [243, 233, 216] },
    gold: { dark: [43, 27, 20], light: [201, 138, 44] },
    plum: { dark: [74, 25, 66], light: [233, 220, 195] }
  };

  function styleCurve(lum, styleKey) {
    if (styleKey === "watercolour") {
      return 0.5 + (lum - 0.5) * 0.75;
    }
    if (styleKey === "line") {
      var v = 0.5 + (lum - 0.5) * 1.9;
      return Math.min(1, Math.max(0, v));
    }
    if (styleKey === "oil") {
      return Math.pow(lum, 0.85);
    }
    return lum; // ink wash — untouched
  }

  function canvasFilterFor(styleKey) {
    if (styleKey === "watercolour") return "blur(1px)";
    if (styleKey === "line") return "contrast(1.1)";
    if (styleKey === "oil") return "contrast(1.05) saturate(1.05)";
    return "none";
  }

  /* ---------- Credits state machine ----------
     phase: 'free' -> 1 preview before signup
            'signedup' -> 4 further credits
            'exhausted' -> prompt to top up
  ---------------------------------------------- */
  var state = { phase: "free", used: 0, total: 1 };

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
      creditsLine.textContent = left + " of " + state.total + " changes left";
      creditsFootnote.textContent =
        "Signed up — you've unlocked 4 more changes. Run out and you can top up 10 more for £5.";
    } else {
      creditsLine.textContent = "Out of changes";
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
    renderCreditsCopy();
    onGenerate();
    return true;
  }

  renderCreditsCopy();

  /* ---------- Canvas rendering ---------- */
  function drawTextPlaque(w, h, text) {
    if (!text) return;
    var plaqueH = Math.max(38, Math.round(h * 0.11));
    ctx.fillStyle = "rgba(243,233,216,0.9)";
    ctx.fillRect(0, h - plaqueH, w, plaqueH);
    ctx.fillStyle = "#2B1B14";
    ctx.font = "italic 600 " + Math.round(plaqueH * 0.42) + 'px "Fraunces", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h - plaqueH / 2, w - 24);
  }

  function drawGrain(w, h) {
    var dots = Math.round((w * h) / 900);
    ctx.save();
    for (var i = 0; i < dots; i++) {
      ctx.globalAlpha = Math.random() * 0.06;
      ctx.fillStyle = Math.random() > 0.5 ? "#FFFFFF" : "#000000";
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }
    ctx.restore();
  }

  function applyStyledDuotone(img, styleKey, colourKey, printText) {
    var maxW = 480, maxH = 340;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(maxW / w, maxH / h, 1);
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));

    ctx.filter = canvasFilterFor(styleKey);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    var frame;
    try {
      frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      // Canvas may be tainted on some file:// setups — leave the plain
      // image in place rather than throwing.
      return;
    }
    var pair = COLOUR_PAIRS[colourKey] || COLOUR_PAIRS.mono;
    var d = frame.data;
    for (var i = 0; i < d.length; i += 4) {
      var lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      lum = styleCurve(lum, styleKey);
      d[i] = pair.dark[0] + (pair.light[0] - pair.dark[0]) * lum;
      d[i + 1] = pair.dark[1] + (pair.light[1] - pair.dark[1]) * lum;
      d[i + 2] = pair.dark[2] + (pair.light[2] - pair.dark[2]) * lum;
    }
    ctx.putImageData(frame, 0, 0);

    if (styleKey === "oil") {
      drawGrain(canvas.width, canvas.height);
    }
    drawTextPlaque(canvas.width, canvas.height, printText);
  }

  function renderPosterPreview() {
    var desc = describeInput.value.trim();
    var pair = COLOUR_PAIRS[selectedColour] || COLOUR_PAIRS.mono;
    posterPreview.style.background =
      "linear-gradient(155deg, rgba(" + pair.dark.join(",") + ",0.16), rgba(" +
      pair.light.join(",") + ",0.32)), var(--paper-deep)";
    posterText.textContent = "\u201C" + desc + "\u201D";
    var printText = printTextInput.value.trim();
    if (printText) {
      posterCaption.textContent = printText;
      posterCaption.hidden = false;
    } else {
      posterCaption.hidden = true;
    }
  }

  function generatePreview() {
    var printText = printTextInput.value.trim();
    if (currentImage) {
      applyStyledDuotone(currentImage, selectedStyle, selectedColour, printText);
      canvas.hidden = false;
      posterPreview.hidden = true;
      placeholder.hidden = true;
    } else if (describeInput.value.trim()) {
      renderPosterPreview();
      posterPreview.hidden = false;
      canvas.hidden = true;
      placeholder.hidden = true;
    } else {
      canvas.hidden = true;
      posterPreview.hidden = true;
      placeholder.hidden = false;
    }
    hasGenerated = true;
    stepNext.textContent =
      currentStep === TOTAL_STEPS ? "Update my preview" : NEXT_LABELS[currentStep];
  }

  photoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    fileChosen.textContent = file.name;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        currentImage = img;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  goToStep(1);
})();
