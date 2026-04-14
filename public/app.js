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

  const getTileUrl = function (theme) {
    return theme === 'dark'
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  };

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";

  const mapLayer = L.tileLayer(getTileUrl(currentTheme), {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  window.addEventListener('themeChanged', function (e) {
    mapLayer.setUrl(getTileUrl(e.detail));
  });

  window.addEventListener('languageChanged', function () {
    // Refresh hotspots and markers to apply new language
    if (window.renderHotspots) window.renderHotspots();
    if (window.updateStats) window.updateStats();
  });

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
  const sidebarBtn = document.getElementById("sidebar-toggle");
  if (sidebarBtn) {
    sidebarBtn.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar-open");
      sidebarBtn.textContent = sidebar.classList.contains("sidebar-open") ? "✕" : "☰";
    });
  }

  // ── Modal logic ─────────────────────────────────────────────────────────────
  const modal = document.getElementById("detail-modal");
  const modalClose = document.getElementById("modal-close");
  const mAudioContainer = document.getElementById("m-audio-container");
  const mAudioPlayer = document.getElementById("m-audio-player");

  function openDetailModal(report) {
    document.getElementById("m-reporter").textContent = report.reporterName || "Anonymous Worker";
    document.getElementById("m-urgency").textContent = report.urgencyScore + " / 10";
    document.getElementById("m-location").textContent = report.location || "Unknown";
    document.getElementById("m-need").textContent = report.needType || "Other";
    document.getElementById("m-state").textContent = report.state || "—";
    document.getElementById("m-country").textContent = report.country || "—";
    document.getElementById("m-text").textContent = report.rawText || "No text available.";
    
    // Audio check
    mAudioContainer.style.display = "none";
    if (report.media && report.media.length > 0) {
      var audio = report.media.find(m => m.type === 'audio');
      if (audio) {
        // Since we don't have real URLs for audio in this mock, we skip actual playback 
        // unless there's a blob. In a real app, this would be a Firebase Storage URL.
        mAudioContainer.style.display = "block";
      }
    }
    
    modal.classList.add("active");
  }

  if (modalClose) {
    modalClose.addEventListener("click", function() {
      modal.classList.remove("active");
      mAudioPlayer.pause();
    });
  }
  window.addEventListener("click", function(e) {
    if (e.target === modal) {
      modal.classList.remove("active");
      mAudioPlayer.pause();
    }
  });

  // ── Colour helpers ──────────────────────────────────────────────────────────
  function urgencyColor(score) {
    if (score >= 8) return { fill: "#ef4444", glow: "rgba(239,68,68,0.4)" };
    if (score >= 4) return { fill: "#f97316", glow: "rgba(249,115,22,0.4)" };
    return { fill: "#22c55e", glow: "rgba(34,197,94,0.4)" };
  }

  function urgencyLabel(score) {
    if (!window.i18n) return score >= 8 ? { label: "CRITICAL", cls: "badge-red" } : (score >= 4 ? { label: "MODERATE", cls: "badge-orange" } : { label: "LOW", cls: "badge-green" });
    
    if (score >= 8) return { label: window.i18n.t("critical").toUpperCase(), cls: "badge-red" };
    if (score >= 4) return { label: window.i18n.t("moderate").toUpperCase(), cls: "badge-orange" };
    return { label: window.i18n.t("low").toUpperCase(), cls: "badge-green" };
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
        icon + " " + escHtml(report.location) +
        "</div>" +
        '<div class="popup-meta">' +
        '<div class="popup-row"><span class="key">Urgency</span><span class="val" style="color:' + colors.fill + '">' +
        report.urgencyScore + ' / 10</span></div>' +
        '<div class="popup-row"><span class="key">Affected</span><span class="val">' +
        Number(report.populationAffected).toLocaleString() + " people</span></div>" +
        '<div class="popup-row"><span class="key">Reporter</span><span class="val">' +
        escHtml(report.reporterName || "Anonymous") + "</span></div>" +
        "</div>" +
        '<button class="btn btn-primary btn-full popup-btn" style="margin-top:12px; font-size:11px; padding:6px;" onclick="window.viewDetailedReport(\'' + docId + '\')">' +
        (window.i18n ? window.i18n.t("btn_view_full_report") : "View Details") +
        '</button>' +
        '<div class="popup-ngo" style="margin-top:8px; font-size:10px; color:#64748b">🕐 ' + ts + "</div>" +
      '</div>',
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
  // ── Urgency Filtering logic ─────────────────────────────────────────────────
  var currentFilter = "all";
  var reportStore = []; // Local copy of all reports

  function applyFilters() {
    Object.keys(markers).forEach(function(docId) {
      var marker = markers[docId];
      var report = reportStore.find(r => r.id === docId);
      if (!report) return;

      var match = false;
      var score = report.urgencyScore;

      if (currentFilter === "all") match = true;
      else if (currentFilter === "critical" && score >= 8) match = true;
      else if (currentFilter === "moderate" && score >= 4 && score < 8) match = true;
      else if (currentFilter === "low" && score < 4) match = true;

      if (match) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        if (map.hasLayer(marker)) marker.remove();
      }
    });

    renderAllReportsList();
  }

  const filterBtns = document.querySelectorAll("#urgency-filters .filter-btn");
  filterBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  // ── Global helper for popup buttons ─────────────────────────────────────────
  window.viewDetailedReport = function(docId) {
    var report = reportStore.find(r => r.id === docId);
    if (report) openDetailModal(report);
  };

  // ── Render All Reports List in Sidebar ──────────────────────────────────────
  const allReportsListEl = document.getElementById("all-reports-list");

  function renderAllReportsList() {
    if (!allReportsListEl) return;
    
    // Sort reportStore by urgency (desc) then timestamp (desc)
    var sorted = reportStore.slice().sort((a,b) => {
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    // Filter by current filter
    var filtered = sorted.filter(r => {
      if (currentFilter === "all") return true;
      if (currentFilter === "critical") return r.urgencyScore >= 8;
      if (currentFilter === "moderate") return r.urgencyScore >= 4 && r.urgencyScore < 8;
      if (currentFilter === "low") return r.urgencyScore < 4;
      return true;
    });

    if (filtered.length === 0) {
      allReportsListEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">No matching reports.</div>';
      return;
    }

    allReportsListEl.innerHTML = filtered.map(function(r) {
      var colors = urgencyColor(r.urgencyScore);
      return (
        '<div class="report-list-item" onclick="window.panToReport(\'' + r.id + '\')">' +
          '<div class="report-list-header">' +
            '<span class="report-list-loc">' + needIcon(r.needType) + ' ' + escHtml(r.location) + '</span>' +
            '<span style="font-weight:800; color:' + colors.fill + '">' + r.urgencyScore + '</span>' +
          '</div>' +
          '<div class="report-list-meta">' +
            '<span>👥 ' + Number(r.populationAffected).toLocaleString() + '</span>' +
            '<span>🏢 ' + escHtml(r.ngoName || "Field Staff") + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  window.panToReport = function(docId) {
    var marker = markers[docId];
    if (marker) {
      if (!map.hasLayer(marker)) marker.addTo(map);
      map.setView(marker.getLatLng(), 14);
      marker.openPopup();
      
      // If mobile, close sidebar
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("sidebar-open");
        if (sidebarBtn) sidebarBtn.textContent = "☰";
      }
    }
  };

  // ── Update Firebase integration to sync local store ─────────────────────────
  // We need to capture ALL data from firebase
  if (typeof firebase !== 'undefined' && window.__ENV && window.__ENV.FIREBASE_CONFIG && window.__ENV.FIREBASE_CONFIG.apiKey !== 'REPLACE_ME') {
     var cfg = window.__ENV.FIREBASE_CONFIG;
     if (!firebase.apps.length) firebase.initializeApp(cfg);
     var db = firebase.firestore();
     
     db.collection("reports")
       .orderBy("timestamp", "desc")
       .onSnapshot(function(snapshot) {
         reportStore = [];
         snapshot.forEach(function(doc) {
           var data = doc.data();
           data.id = doc.id;
           reportStore.push(data);
           upsertMarker(doc.id, data);
         });
         
         if (window.updateStats) window.updateStats();
         if (window.renderHotspots) window.renderHotspots();
         applyFilters();
       });
  } else {
    showToast("Firebase not configured properly.", "warning");
  }

})();
