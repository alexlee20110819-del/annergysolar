/* Annergy Solar — site behaviour. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Mobile navigation ---------- */
  var burger = document.querySelector("[data-burger]");
  var mobileNav = document.querySelector("[data-mobile-nav]");
  if (burger && mobileNav) {
    var setNav = function (open) {
      burger.setAttribute("aria-expanded", String(open));
      mobileNav.setAttribute("data-open", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    burger.addEventListener("click", function () {
      setNav(burger.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setNav(false);
        burger.focus();
      }
    });
  }

  /* ---------- Reveal on scroll ----------
     A scroll sweep rather than IntersectionObserver: an anchor jump can skip an
     element from below the fold to above it without ever crossing a threshold,
     which leaves IO-driven reveals stuck at opacity 0. This cannot.
  */
  var pending = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (pending.length) {
    if (reduceMotion) {
      pending.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      pending.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i % 4, 3) * 70 + "ms";
      });
      var ticking = false;
      var sweep = function () {
        ticking = false;
        var limit = window.innerHeight * 0.92;
        pending = pending.filter(function (el) {
          if (el.getBoundingClientRect().top > limit) return true;
          el.classList.add("is-in");
          return false;
        });
        if (!pending.length) {
          window.removeEventListener("scroll", request);
          window.removeEventListener("resize", request);
        }
      };
      var request = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(sweep);
      };
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", request);
      window.addEventListener("load", request);
      sweep();
    }
  }

  /* ---------- Savings estimator ----------
     Indicative model for South East Queensland. Assumptions are printed
     on the page next to the result so the numbers are never a black box.
  */
  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var ASSUME = {
      yield: 4.2,          // kWh generated per kW installed per day, Brisbane annual average
      tariff: 0.33,        // $/kWh imported from the grid
      supplyPerDay: 1.15,  // $/day fixed supply charge
      feedIn: 0.05,        // $/kWh exported
      selfUse: 0.35,       // share of generation used on site, solar only
      selfUseBattery: 0.78 // share of generation used on site, solar + battery
    };
    var PACKAGES = [
      { kw: 6.6,  price: 5290 },
      { kw: 10,   price: 7890 },
      { kw: 13.2, price: 9690 },
      { kw: 20,   price: 14900 }
    ];
    var BATTERY_PRICE = 8600; // ~10 kWh installed, after the federal battery discount

    var billInput = calc.querySelector("[data-calc-bill]");
    var billOut = calc.querySelector("[data-calc-bill-out]");
    var batteryBtns = calc.querySelectorAll("[data-calc-battery]");
    var out = {
      size: calc.querySelector("[data-out-size]"),
      annual: calc.querySelector("[data-out-annual]"),
      payback: calc.querySelector("[data-out-payback]"),
      ten: calc.querySelector("[data-out-ten]"),
      newbill: calc.querySelector("[data-out-newbill]")
    };
    var wantsBattery = false;

    var money = function (n) {
      return "$" + Math.round(n).toLocaleString("en-AU");
    };

    var update = function () {
      var quarterly = Number(billInput.value);
      if (billOut) billOut.textContent = money(quarterly) + " per quarter";

      var days = 91.25;
      var energySpend = Math.max(quarterly - ASSUME.supplyPerDay * days, 60);
      var dailyKwh = energySpend / ASSUME.tariff / days;

      // Size so annual generation is ~1.35x household use, then snap to a stocked package.
      var targetKw = (dailyKwh * 1.35) / ASSUME.yield;
      var pack = PACKAGES.reduce(function (best, p) {
        return Math.abs(p.kw - targetKw) < Math.abs(best.kw - targetKw) ? p : best;
      }, PACKAGES[0]);

      var genPerYear = pack.kw * ASSUME.yield * 365;
      var selfUseRate = wantsBattery ? ASSUME.selfUseBattery : ASSUME.selfUse;
      var selfUsed = Math.min(genPerYear * selfUseRate, dailyKwh * 365);
      var exported = Math.max(genPerYear - selfUsed, 0);

      var annualSaving = selfUsed * ASSUME.tariff + exported * ASSUME.feedIn;
      var outlay = pack.price + (wantsBattery ? BATTERY_PRICE : 0);
      var payback = annualSaving > 0 ? outlay / annualSaving : 0;
      var currentAnnual = quarterly * 4;
      // You can zero out usage but never the daily supply charge.
      var newAnnual = Math.max(currentAnnual - annualSaving, ASSUME.supplyPerDay * 365);

      out.size.textContent = pack.kw + " kW" + (wantsBattery ? " + 10 kWh battery" : "");
      out.annual.textContent = money(annualSaving);
      out.payback.textContent = payback ? payback.toFixed(1) + " years" : "—";
      out.ten.textContent = money(annualSaving * 10 - outlay);
      if (out.newbill) out.newbill.textContent = money(newAnnual / 4);
    };

    billInput.addEventListener("input", update);
    batteryBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        wantsBattery = btn.getAttribute("data-calc-battery") === "yes";
        batteryBtns.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        update();
      });
    });
    update();
  }

  /* ---------- Quote form ---------- */
  var form = document.querySelector("[data-quote-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("[data-submit]");
    var submitLabel = submit ? submit.textContent : "";

    var showError = function (field, message) {
      field.setAttribute("aria-invalid", "true");
      var msg = form.querySelector('[data-error-for="' + field.name + '"]');
      if (msg) { msg.textContent = message; msg.setAttribute("data-show", "true"); }
    };
    var clearError = function (field) {
      field.removeAttribute("aria-invalid");
      var msg = form.querySelector('[data-error-for="' + field.name + '"]');
      if (msg) msg.removeAttribute("data-show");
    };

    var validate = function () {
      var firstBad = null;
      form.querySelectorAll("[data-validate]").forEach(function (field) {
        clearError(field);
        var v = field.value.trim();
        var bad = "";
        if (!v) {
          bad = "Please fill this in so we can get back to you.";
        } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          bad = "That email address looks incomplete.";
        } else if (field.type === "tel" && v.replace(/\D/g, "").length < 8) {
          bad = "Please enter a contactable phone number.";
        } else if (field.name === "postcode" && !/^4\d{3}$/.test(v.replace(/\s/g, ""))) {
          bad = "Enter a Queensland postcode, e.g. 4000.";
        }
        if (bad) { showError(field, bad); if (!firstBad) firstBad = field; }
      });

      // The server rejects an unticked consent box; catch it here so the user
      // gets a field-level message instead of a generic failure.
      var consent = form.querySelector('input[name="consent"]');
      if (consent) {
        clearError(consent);
        if (!consent.checked) {
          showError(consent, "Please tick this so we know we can contact you.");
          if (!firstBad) firstBad = consent;
        }
      }
      return firstBad;
    };

    form.querySelectorAll("[data-validate]").forEach(function (field) {
      field.addEventListener("blur", function () { if (field.value.trim()) clearError(field); });
      field.addEventListener("input", function () { if (field.getAttribute("aria-invalid")) clearError(field); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = validate();
      if (firstBad) {
        status.setAttribute("data-state", "error");
        status.textContent = "Please check the highlighted fields and try again.";
        firstBad.focus();
        return;
      }
      if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
      status.removeAttribute("data-state");
      status.textContent = "";

      var payload = Object.fromEntries(new FormData(form).entries());
      fetch(form.getAttribute("action") || "/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().then(function (b) { return { ok: res.ok, body: b }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.body && r.body.error ? r.body.error : "Request failed");
          form.reset();
          status.setAttribute("data-state", "success");
          status.textContent =
            "Thanks — your request is in. A Brisbane-based consultant will call you within one business day to book your roof assessment.";
          status.focus();
        })
        .catch(function () {
          status.setAttribute("data-state", "error");
          status.innerHTML =
            'Sorry, that didn’t send. Please call <a href="tel:+61415085122">0415 085 122</a> or email <a href="mailto:info@annergy.com.au">info@annergy.com.au</a> and we’ll sort it out.';
        })
        .finally(function () {
          if (submit) { submit.disabled = false; submit.textContent = submitLabel; }
        });
    });
  }
})();
