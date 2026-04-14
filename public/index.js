(function () {
  "use strict";

  // Numeric counter animation with collision protection
  function animCounter(el, target) {
    if (el._iv) clearInterval(el._iv);
    var current = parseInt(el.textContent.replace(/,/g, '')) || 0;
    if (current === target) return;
    
    var step = Math.ceil(Math.abs(target - current) / 15);
    var dir = target > current ? 1 : -1;
    var val = current;
    
    el._iv = setInterval(function () {
      val += dir * step;
      if ((dir > 0 && val >= target) || (dir < 0 && val <= target)) {
        val = target;
        clearInterval(el._iv);
        el._iv = null;
      }
      el.textContent = val.toLocaleString();
    }, 25);
  }

  function initStats() {
    if (typeof firebase === "undefined") {
      console.warn("[CrisisGrid] Firebase SDK not loaded on homepage.");
      return;
    }

    var cfg = (window.__ENV && window.__ENV.FIREBASE_CONFIG) || {};
    if (!cfg.apiKey || cfg.apiKey === "REPLACE_ME") {
      console.warn("[CrisisGrid] Firebase not configured — check env-config.js.");
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      var db = firebase.firestore();

      console.log("[CrisisGrid] Connecting to real-time stats feed...");
      
      db.collection("reports").onSnapshot(function (snapshot) {
        var total = snapshot.size;
        var critical = 0;
        var affected = 0;

        snapshot.forEach(function (doc) {
          var data = doc.data();
          if (data.urgencyScore >= 8) critical++;
          if (data.populationAffected) {
            affected += Number(data.populationAffected) || 0;
          }
        });

        var elTotal = document.getElementById("stat-total");
        var elCritical = document.getElementById("stat-critical");
        var elAffected = document.getElementById("stat-affected");

        if (elTotal) animCounter(elTotal, total);
        if (elCritical) animCounter(elCritical, critical);
        if (elAffected) animCounter(elAffected, affected);
        
        console.log("[CrisisGrid] Stats updated:", { total: total, critical: critical, affected: affected });
      }, function(error) {
        console.error("[CrisisGrid] Firestore read error on homepage: ", error);
      });

    } catch (err) {
      console.error("[CrisisGrid] Homepage Firebase init error: ", err);
    }
  }

  document.addEventListener("DOMContentLoaded", initStats);

})();
