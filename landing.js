(function () {
  "use strict";

  // Numeric counter animation identical to app.js
  function animCounter(el, target) {
    var current = parseInt(el.textContent.replace(/,/g, '')) || 0;
    if (current === target) return;
    var step = Math.ceil(Math.abs(target - current) / 10);
    var dir = target > current ? 1 : -1;
    var val = current;
    var iv = setInterval(function () {
      val += dir * step;
      if ((dir > 0 && val >= target) || (dir < 0 && val <= target)) {
        val = target;
        clearInterval(iv);
      }
      el.textContent = val.toLocaleString();
    }, 30);
  }

  function initStats() {
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK not loaded on landing.");
      return;
    }

    var cfg = (window.__ENV && window.__ENV.FIREBASE_CONFIG) || {};
    if (!cfg.apiKey || cfg.apiKey === "REPLACE_ME") {
      console.warn("Firebase not configured setup env-config.js.");
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      var db = firebase.firestore();

      db.collection("reports").onSnapshot(function (snapshot) {
        var total = snapshot.size;
        var critical = 0;
        var affected = 0;

        snapshot.forEach(function (doc) {
          var data = doc.data();
          if (data.urgencyScore >= 8) critical++;
          if (data.populationAffected) affected += parseInt(data.populationAffected) || 0;
        });

        var elTotal = document.getElementById("stat-total");
        var elCritical = document.getElementById("stat-critical");
        var elAffected = document.getElementById("stat-affected");

        if (elTotal) animCounter(elTotal, total);
        if (elCritical) animCounter(elCritical, critical);
        if (elAffected) animCounter(elAffected, affected);
      }, function(error) {
        console.error("Firestore read error on landing: ", error);
      });

    } catch (err) {
      console.error("Landing Firebase init error: ", err);
    }
  }

  document.addEventListener("DOMContentLoaded", initStats);

})();
