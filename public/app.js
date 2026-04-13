/**
 * app.js — Map Dashboard logic (no ES modules, works on file://)
 * Uses Firebase compat SDK loaded via <script> tags in index.html
 * Renders Leaflet map FIRST, then connects Firebase real-time listener.
 */

(function () {
  "use strict";

  // ── Map init (runs immediately) ───────────────────────────────────────────
  const map = L.map("map", {
    center: [20.5937, 78.9629],
    zoom: 5,
    zoomControl: false,
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(map);

  // ── State ───────────────────────────────────────────────────────────────────
  const markers = {};
  const allReports = [];

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const reportCount = document.getElementById("report-count");
  const hotspotList = document.getElementById("hotspot-list");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const lastUpdatedEl = document.getElementById("last-updated");
  const statsHigh = document.getElementById("stats-high");
  const statsMed = document.getElementById("stats-med");
  const statsLow = document.getElementById("stats-low");

  // ── Sidebar toggle (mobile) ─────────────────────────────────────────────────
  sidebarToggle.addEventListener("click", function () {
    sidebar.classList.toggle("sidebar-open");
    sidebarToggle.textContent = sidebar.classList.contains("sidebar-open")
      ? "✕"
      : "☰";
  });

  // ── Colour helpers ──────────────────────────────────────────────────────────
  function urgencyColor(score) {
    if (score >= 8) return { fill: "#ef4444", glow: "rgba(239,68,68,0.4)" };
    if (score >= 4) return { fill: "#f97316", glow: "rgba(249,115,22,0.4)" };
    return { fill: "#22c55e", glow: "rgba(34,197,94,0.4)" };
  }

  function urgencyLabel(score) {
    if (score >= 8) return { label: "CRITICAL", cls: "badge-red" };
    if (score >= 4) return { label: "MODERATE", cls: "badge-orange" };
    return { label: "LOW", cls: "badge-green" };
  }

  function needIcon(needType) {
    var icons = {
      Food: "🍱",
      Water: "💧",
      Medical: "🏥",
      Shelter: "🏠",
      Evacuation: "🚁",
      Other: "📌",
    };
    return icons[needType] || "📌";
  }

  // ── HTML escape ─────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  function showToast(msg, type) {
    type = type || "info";
    var icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
      warning: "⚠️",
    };
    var container = document.getElementById("toast-container");
    var el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.innerHTML =
      '<span class="toast-icon">' +
      icons[type] +
      "</span><span>" +
      msg +
      "</span>";
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add("hide");
      el.addEventListener("animationend", function () {
        el.remove();
      });
    }, 4000);
  }

  // ── Add / update marker ─────────────────────────────────────────────────────
  function upsertMarker(docId, report) {
    if (report.lat == null || report.lng == null) return;

    var colors = urgencyColor(report.urgencyScore);
    var radius = Math.max(8, Math.min(22, report.urgencyScore * 2));

    if (markers[docId]) {
      markers[docId].remove();
    }

    var circle = L.circleMarker([report.lat, report.lng], {
      radius: radius,
      fillColor: colors.fill,
      color: colors.fill,
      fillOpacity: 0.82,
      weight: 2,
      opacity: 0.9,
    });

    var labelInfo = urgencyLabel(report.urgencyScore);
    var icon = needIcon(report.needType);
    var ts = report.timestamp
      ? report.timestamp.toDate
        ? report.timestamp.toDate().toLocaleString()
        : new Date(report.timestamp).toLocaleString()
      : "—";

    circle.bindPopup(
      '<div class="popup-card">' +
        '<div class="popup-title">' +
        icon +
        " " +
        escHtml(report.location) +
        "</div>" +
        '<div class="popup-meta">' +
        '<div class="popup-row"><span class="key">Need Type</span><span class="val">' +
        escHtml(report.needType) +
        "</span></div>" +
        '<div class="popup-row"><span class="key">Urgency</span><span class="val" style="color:' +
        colors.fill +
        '">' +
        report.urgencyScore +
        ' / 10 <span class="badge ' +
        labelInfo.cls +
        '" style="margin-left:4px">' +
        labelInfo.label +
        "</span></span></div>" +
        '<div class="popup-row"><span class="key">Affected</span><span class="val">' +
        Number(report.populationAffected).toLocaleString() +
        " people</span></div>" +
        '<div class="popup-row"><span class="key">Reported by</span><span class="val">' +
        escHtml(report.ngoName || "Anonymous") +
        "</span></div>" +
        '<div class="popup-ngo">🕐 ' +
        ts +
        "</div>" +
        "</div></div>",
      { maxWidth: 280 }
    );

    circle.addTo(map);
    markers[docId] = circle;

    var el = circle.getElement();
    if (el) {
      el.style.filter = "drop-shadow(0 0 6px " + colors.glow + ")";
      el.style.transition = "filter 0.3s ease";
    }
  }

  // ── Hotspot sidebar ─────────────────────────────────────────────────────────
  function refreshHotspots() {
    var sorted = allReports
      .filter(function (r) {
        return r.lat != null;
      })
      .sort(function (a, b) {
        return b.urgencyScore - a.urgencyScore;
      })
      .slice(0, 3);

    if (sorted.length === 0) {
      hotspotList.innerHTML =
        '<div style="text-align:center;padding:32px 0;color:var(--text-muted);">' +
        '<div style="font-size:32px;margin-bottom:8px;">📡</div>' +
        '<div style="font-size:13px;">No reports yet.<br>Awaiting field data.</div></div>';
      return;
    }

    hotspotList.innerHTML = sorted
      .map(function (r, i) {
        var colors = urgencyColor(r.urgencyScore);
        var labelInfo = urgencyLabel(r.urgencyScore);
        var volunteers = r.urgencyScore * 10;
        var icon = needIcon(r.needType);
        var rank = ["🥇", "🥈", "🥉"][i] || "#" + (i + 1);

        return (
          '<div class="hotspot-item" data-id="' +
          r._id +
          '" tabindex="0" role="button">' +
          '<div class="hotspot-header">' +
          '<span class="hotspot-rank">' +
          rank +
          "</span>" +
          '<div class="hotspot-title">' +
          icon +
          " " +
          escHtml(r.location) +
          "</div>" +
          '<span class="badge ' +
          labelInfo.cls +
          '" style="flex-shrink:0">' +
          labelInfo.label +
          "</span></div>" +
          '<div class="hotspot-meta">' +
          '<div class="hotspot-stat"><span class="hotspot-stat-label">Urgency</span>' +
          '<span class="hotspot-stat-value" style="color:' +
          colors.fill +
          '">' +
          r.urgencyScore +
          "/10</span></div>" +
          '<div class="hotspot-stat"><span class="hotspot-stat-label">Affected</span>' +
          '<span class="hotspot-stat-value">' +
          Number(r.populationAffected).toLocaleString() +
          "</span></div>" +
          '<div class="hotspot-stat"><span class="hotspot-stat-label">Volunteers Needed</span>' +
          '<span class="hotspot-stat-value">' +
          volunteers +
          "</span></div>" +
          '<div class="hotspot-stat" style="grid-column:1/-1"><span class="hotspot-stat-label">Help Needed</span>' +
          '<span class="hotspot-stat-value">' +
          escHtml(r.needType) +
          "</span></div>" +
          "</div></div>"
        );
      })
      .join("");

    // Click hotspot → fly to pin
    hotspotList.querySelectorAll(".hotspot-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.dataset.id;
        var report = allReports.find(function (r) {
          return r._id === id;
        });
        if (report && report.lat != null) {
          map.flyTo([report.lat, report.lng], 10, { duration: 1.2 });
          if (markers[id]) markers[id].openPopup();
          if (window.innerWidth < 768) {
            sidebar.classList.remove("sidebar-open");
            sidebarToggle.textContent = "☰";
          }
        }
      });
    });
  }

  function refreshStats() {
    var high = allReports.filter(function (r) {
      return r.urgencyScore >= 8;
    }).length;
    var med = allReports.filter(function (r) {
      return r.urgencyScore >= 4 && r.urgencyScore < 8;
    }).length;
    var low = allReports.filter(function (r) {
      return r.urgencyScore < 4;
    }).length;

    animCounter(statsHigh, high);
    animCounter(statsMed, med);
    animCounter(statsLow, low);
    animCounter(reportCount, allReports.length);
  }

  function animCounter(el, target) {
    var current = parseInt(el.textContent) || 0;
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
      el.textContent = val;
    }, 30);
  }

  // ── Filter buttons ──────────────────────────────────────────────────────────
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");

      var filter = btn.dataset.filter;
      Object.keys(markers).forEach(function (id) {
        var marker = markers[id];
        var report = allReports.find(function (r) {
          return r._id === id;
        });
        if (!report) return;
        var score = report.urgencyScore;
        var show = true;

        if (filter === "high") show = score >= 8;
        if (filter === "medium") show = score >= 4 && score < 8;
        if (filter === "low") show = score < 4;

        if (show) {
          if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
          if (map.hasLayer(marker)) marker.remove();
        }
      });
    });
  });

  // ── Recenter button ─────────────────────────────────────────────────────────
  var recenterBtn = document.getElementById("recenter-btn");
  if (recenterBtn) {
    recenterBtn.addEventListener("click", function () {
      map.flyTo([20.5937, 78.9629], 5, { duration: 1 });
    });
  }

  // ── No-reports state ────────────────────────────────────────────────────────
  function showNoReportsState() {
    hotspotList.innerHTML =
      '<div style="text-align:center;padding:32px 0;color:var(--text-muted);">' +
      '<div style="font-size:32px;margin-bottom:8px;">📡</div>' +
      '<div style="font-size:13px;">No reports yet.<br>Awaiting field data.</div></div>';
  }

  // ── Connect Firebase (deferred, non-blocking) ──────────────────────────────
  function connectFirebase() {
    // Check if Firebase compat SDK loaded
    if (typeof firebase === "undefined") {
      console.warn("[CrisisGrid] Firebase SDK not loaded.");
      showToast("Firebase SDK not loaded.", "warning");
      showNoReportsState();
      return;
    }

    var cfg = (window.__ENV && window.__ENV.FIREBASE_CONFIG) || {};
    if (!cfg.apiKey || cfg.apiKey === "REPLACE_ME") {
      console.warn("[CrisisGrid] Firebase not configured.");
      showToast(
        "Firebase not configured — set FIREBASE_CONFIG in env-config.js",
        "warning"
      );
      showNoReportsState();
      return;
    }

    try {
      firebase.initializeApp(cfg);
      var db = firebase.firestore();

      db.collection("reports")
        .orderBy("timestamp", "desc")
        .onSnapshot(
          function (snapshot) {
            snapshot.docChanges().forEach(function (change) {
              var docId = change.doc.id;
              var data = change.doc.data();
              data._id = docId;

              if (change.type === "added") {
                allReports.unshift(data);
                upsertMarker(docId, data);
              } else if (change.type === "modified") {
                var idx = allReports.findIndex(function (r) {
                  return r._id === docId;
                });
                if (idx !== -1) allReports[idx] = data;
                upsertMarker(docId, data);
              } else if (change.type === "removed") {
                var idx2 = allReports.findIndex(function (r) {
                  return r._id === docId;
                });
                if (idx2 !== -1) allReports.splice(idx2, 1);
                if (markers[docId]) {
                  markers[docId].remove();
                  delete markers[docId];
                }
              }
            });

            refreshHotspots();
            refreshStats();
            lastUpdatedEl.textContent = new Date().toLocaleTimeString();
          },
          function (err) {
            console.error("[CrisisGrid] Firestore error:", err);
            showToast("Firestore error: " + err.message, "error");
            showNoReportsState();
          }
        );
    } catch (err) {
      console.error("[CrisisGrid] Firebase init error:", err);
      showToast("Firebase error: " + err.message, "error");
      showNoReportsState();
    }
  }

  // Kick off Firebase connection (doesn't block map)
  connectFirebase();
})();
