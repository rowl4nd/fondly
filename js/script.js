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
  var stepper = document.getElementById("stepper");
  var stepDots = document.querySelectorAll(".step-dot");
  var stepPanelsWrap = document.querySelector(".step-panels");
  var stepPanels = document.querySelectorAll("[data-step-panel]");
  var stepNavRow = document.getElementById("stepNavRow");
  var stepBack = document.getElementById("stepBack");
  var stepNext = document.getElementById("stepNext");

  var photoInput = document.getElementById("photoInput");
  var fileChosen = document.getElementById("fileChosen");
  var describeInput = document.getElementById("describeInput");
  var printTextInput = document.getElementById("printTextInput");
  var consentCheckbox = document.getElementById("consentCheckbox");
  var consentError = document.getElementById("consentError");

  var canvas = document.getElementById("previewCanvas");
  var ctx = canvas.getContext("2d");
  var placeholder = document.getElementById("framePlaceholder");
  var posterPreview = document.getElementById("posterPreview");
  var posterText = document.getElementById("posterText");
  var posterCaption = document.getElementById("posterCaption");

  var styleChoices = document.getElementById("styleChoices");
  var colourChoices = document.getElementById("colourChoices");
  var positionChoices = document.getElementById("positionChoices");

  var resultStage = document.getElementById("resultStage");
  var promptText = document.getElementById("promptText");
  var finalAdjustInput = document.getElementById("finalAdjustInput");
  var finalAdjustBtn = document.getElementById("finalAdjustBtn");
  var startAgainBtn = document.getElementById("startAgainBtn");

  var creditsLine = document.getElementById("creditsLine");
  var creditsFootnote = document.getElementById("creditsFootnote");
  var punchCard = document.getElementById("punchCard");

  /* ---------- Labels ---------- */
  var STYLE_LABELS = { ink: "Ink Wash", watercolour: "Watercolour", line: "Line Art", oil: "Oil Paint" };
  var COLOUR_LABELS = { mono: "Mono Ink", berry: "Warm Berry", gold: "Golden Hour", plum: "Plum Dusk" };

  /* ---------- Wizard state ---------- */
  var currentStep = 1;
  var TOTAL_STEPS = 4;
  var NEXT_LABELS = { 1: "Next: style", 2: "Next: colour", 3: "Next: text" };

  var currentImage = null;
  var selectedStyle = "ink";
  var selectedColour = "mono";
  var selectedPosition = "bottom";
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
        ? (hasGenerated ? "Update image" : "Generate image")
        : NEXT_LABELS[currentStep];
  }

  function hasConsent() {
    return consentCheckbox.checked;
  }

  function showConsentError() {
    consentError.hidden = false;
    consentCheckbox.focus();
  }

  function hideConsentError() {
    consentError.hidden = true;
  }

  consentCheckbox.addEventListener("change", function () {
    if (consentCheckbox.checked) hideConsentError();
  });

  stepDots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var target = Number(dot.getAttribute("data-step"));
      if (target > 1) {
        if (!currentImage && !describeInput.value.trim()) {
          goToStep(1);
          describeInput.focus();
          return;
        }
        if (!hasConsent()) {
          goToStep(1);
          showConsentError();
          return;
        }
      }
      goToStep(target);
    });
  });

  stepBack.addEventListener("click", function () {
    goToStep(currentStep - 1);
  });

  stepNext.addEventListener("click", function () {
    if (currentStep === 1) {
      if (!currentImage && !describeInput.value.trim()) {
        describeInput.focus();
        return;
      }
      if (!hasConsent()) {
        showConsentError();
        return;
      }
    }
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    } else {
      if (!hasConsent()) {
        goToStep(1);
        showConsentError();
        return;
      }
      consumeCredit(function () {
        generatePreview();
        showResultStage();
      });
    }
  });

  /* ---------- Style, colour & position choices ---------- */
  styleChoices.addEventListener("click", function (e) {
    var btn = e.target.closest(".choice-btn");
    if (!btn) return;
    styleChoices.querySelectorAll(".choice-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    selectedStyle = btn.getAttribute("data-style");
    renderColourThumbnails();
  });

  colourChoices.addEventListener("click", function (e) {
    var btn = e.target.closest(".swatch-btn");
    if (!btn) return;
    colourChoices.querySelectorAll(".swatch-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    selectedColour = btn.getAttribute("data-colour");
    renderStyleThumbnails();
  });

  positionChoices.addEventListener("click", function (e) {
    var btn = e.target.closest(".pos-btn");
    if (!btn) return;
    positionChoices.querySelectorAll(".pos-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    selectedPosition = btn.getAttribute("data-position");
  });

  /* ---------- Colour pairs & style curves ---------- */
  var COLOUR_PAIRS = {
    mono: { dark: [43, 27, 20], light: [243, 233, 216] },
    berry: { dark: [94, 33, 43], light: [243, 233, 216] },
    gold: { dark: [43, 27, 20], light: [201, 138, 44] },
    plum: { dark: [74, 25, 66], light: [233, 220, 195] }
  };

  function styleCurve(lum, styleKey) {
    if (styleKey === "watercolour") return 0.5 + (lum - 0.5) * 0.75;
    if (styleKey === "line") return Math.min(1, Math.max(0, 0.5 + (lum - 0.5) * 1.9));
    if (styleKey === "oil") return Math.pow(lum, 0.85);
    return lum; // ink wash — untouched
  }

  function canvasFilterFor(styleKey) {
    if (styleKey === "watercolour") return "blur(1px)";
    if (styleKey === "line") return "contrast(1.1)";
    if (styleKey === "oil") return "contrast(1.05) saturate(1.05)";
    return "none";
  }

  function duotoneImageData(imgData, styleKey, colourKey) {
    var pair = COLOUR_PAIRS[colourKey] || COLOUR_PAIRS.mono;
    var d = imgData.data;
    for (var i = 0; i < d.length; i += 4) {
      var lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      lum = styleCurve(lum, styleKey);
      d[i] = pair.dark[0] + (pair.light[0] - pair.dark[0]) * lum;
      d[i + 1] = pair.dark[1] + (pair.light[1] - pair.dark[1]) * lum;
      d[i + 2] = pair.dark[2] + (pair.light[2] - pair.dark[2]) * lum;
    }
    return imgData;
  }

  /* ---------- Small example thumbnails per option ---------- */
  function drawSourceToThumb(tctx, size) {
    if (currentImage) {
      var iw = currentImage.naturalWidth || currentImage.width;
      var ih = currentImage.naturalHeight || currentImage.height;
      var scale = Math.max(size / iw, size / ih);
      var dw = iw * scale, dh = ih * scale;
      tctx.drawImage(currentImage, (size - dw) / 2, (size - dh) / 2, dw, dh);
    } else {
      // generic placeholder scene so styles/colours are still visibly different pre-upload
      tctx.fillStyle = "#9a9a9a";
      tctx.fillRect(0, 0, size, size);
      tctx.fillStyle = "#c9c9c9";
      tctx.beginPath();
      tctx.arc(size * 0.32, size * 0.3, size * 0.14, 0, Math.PI * 2);
      tctx.fill();
      tctx.fillStyle = "#6c6c6c";
      tctx.beginPath();
      tctx.moveTo(0, size);
      tctx.lineTo(size * 0.35, size * 0.55);
      tctx.lineTo(size * 0.6, size * 0.8);
      tctx.lineTo(size, size * 0.48);
      tctx.lineTo(size, size);
      tctx.closePath();
      tctx.fill();
    }
  }

  var THUMB_SIZE = 64;

  function renderThumb(canvasEl, styleKey, colourKey) {
    var size = THUMB_SIZE;
    canvasEl.width = size;
    canvasEl.height = size;
    var tctx = canvasEl.getContext("2d");
    tctx.clearRect(0, 0, size, size);
    tctx.filter = canvasFilterFor(styleKey);
    drawSourceToThumb(tctx, size);
    tctx.filter = "none";
    var data;
    try {
      data = tctx.getImageData(0, 0, size, size);
    } catch (e) {
      return;
    }
    tctx.putImageData(duotoneImageData(data, styleKey, colourKey), 0, 0);
  }

  function renderStyleThumbnails() {
    styleChoices.querySelectorAll(".choice-btn").forEach(function (btn) {
      renderThumb(btn.querySelector(".thumb-canvas"), btn.getAttribute("data-style"), selectedColour);
    });
  }

  function renderColourThumbnails() {
    colourChoices.querySelectorAll(".swatch-btn").forEach(function (btn) {
      renderThumb(btn.querySelector(".thumb-canvas"), selectedStyle, btn.getAttribute("data-colour"));
    });
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
      creditsLine.textContent = state.used < 1 ? "1 free preview available" : "Free preview used";
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
  function drawTextPlaque(w, h, text, position) {
    if (!text || position === "none") return;
    var plaqueH = Math.max(38, Math.round(h * 0.11));
    var y = position === "top" ? 0 : position === "middle" ? (h - plaqueH) / 2 : h - plaqueH;
    ctx.fillStyle = "rgba(243,233,216,0.9)";
    ctx.fillRect(0, y, w, plaqueH);
    ctx.fillStyle = "#2B1B14";
    ctx.font = "italic 600 " + Math.round(plaqueH * 0.42) + 'px "Fraunces", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, y + plaqueH / 2, w - 24);
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

  function applyStyledDuotone(img, styleKey, colourKey, printText, position) {
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
      return;
    }
    ctx.putImageData(duotoneImageData(frame, styleKey, colourKey), 0, 0);

    if (styleKey === "oil") drawGrain(canvas.width, canvas.height);
    drawTextPlaque(canvas.width, canvas.height, printText, position);
  }

  function renderPosterPreview() {
    var desc = describeInput.value.trim();
    var pair = COLOUR_PAIRS[selectedColour] || COLOUR_PAIRS.mono;
    posterPreview.style.background =
      "linear-gradient(155deg, rgba(" + pair.dark.join(",") + ",0.16), rgba(" +
      pair.light.join(",") + ",0.32)), var(--paper-deep)";
    posterText.textContent = "\u201C" + desc + "\u201D";
    var printText = printTextInput.value.trim();
    if (printText && selectedPosition !== "none") {
      posterCaption.textContent = printText;
      posterCaption.hidden = false;
    } else {
      posterCaption.hidden = true;
    }
  }

  function generatePreview() {
    var printText = printTextInput.value.trim();
    if (currentImage) {
      applyStyledDuotone(currentImage, selectedStyle, selectedColour, printText, selectedPosition);
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
  }

  /* ---------- Prompt built from the four steps ---------- */
  function buildPrompt() {
    var desc = describeInput.value.trim();
    var subjectPart = currentImage ? "Your uploaded photo" + (desc ? ", " + desc : "") : (desc || "Your idea");
    var stylePart = "an " + STYLE_LABELS[selectedStyle] + " style";
    var colourPart = "a " + COLOUR_LABELS[selectedColour] + " colour palette";
    var printText = printTextInput.value.trim();
    var textPart =
      printText && selectedPosition !== "none"
        ? ', with the text "' + printText + '" placed at the ' + selectedPosition + " of the print"
        : "";
    return subjectPart + " — rendered in " + stylePart + ", " + colourPart + textPart + ".";
  }

  /* ---------- Result stage ---------- */
  function showResultStage() {
    stepper.hidden = true;
    stepPanelsWrap.hidden = true;
    stepNavRow.hidden = true;
    resultStage.hidden = false;
    promptText.textContent = buildPrompt();
    finalAdjustInput.value = "";
  }

  function hideResultStage() {
    stepper.hidden = false;
    stepPanelsWrap.hidden = false;
    stepNavRow.hidden = false;
    resultStage.hidden = true;
  }

  finalAdjustBtn.addEventListener("click", function () {
    var tweak = finalAdjustInput.value.trim();
    if (!tweak) return;
    describeInput.value = describeInput.value.trim() ? describeInput.value.trim() + ". " + tweak : tweak;
    consumeCredit(function () {
      generatePreview();
      promptText.textContent = buildPrompt();
      finalAdjustInput.value = "";
    });
  });

  startAgainBtn.addEventListener("click", function () {
    currentImage = null;
    photoInput.value = "";
    fileChosen.textContent = "";
    describeInput.value = "";
    printTextInput.value = "";
    finalAdjustInput.value = "";
    consentCheckbox.checked = false;
    hideConsentError();

    selectedStyle = "ink";
    selectedColour = "mono";
    selectedPosition = "bottom";
    hasGenerated = false;

    styleChoices.querySelectorAll(".choice-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-style") === "ink");
    });
    colourChoices.querySelectorAll(".swatch-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-colour") === "mono");
    });
    positionChoices.querySelectorAll(".pos-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-position") === "bottom");
    });

    canvas.hidden = true;
    posterPreview.hidden = true;
    placeholder.hidden = false;

    renderStyleThumbnails();
    renderColourThumbnails();
    hideResultStage();
    goToStep(1);
  });

  /* ---------- Photo upload ---------- */
  photoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    fileChosen.textContent = file.name;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        currentImage = img;
        renderStyleThumbnails();
        renderColourThumbnails();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  /* ---------- Init ---------- */
  renderStyleThumbnails();
  renderColourThumbnails();
  goToStep(1);
})();
