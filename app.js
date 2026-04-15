/**
 * app.js — CrisisGrid Dispatch Dashboard (Refactored v1.2)
 * Consolidates all Firebase, Map, and UI logic into a single reactive stream.
 */
(function () {
  "use strict";

  // ── 1. MAP INITIALIZATION ──────────────────────────────────────────────────
  const map = L.map("map", {
    center: [20.5937, 78.9629],
    zoom: 5,
    zoomControl: false,
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  const getTileUrl = (theme) => 
    theme === 'dark'
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const mapLayer = L.tileLayer(getTileUrl(currentTheme), {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  window.addEventListener('themeChanged', (e) => mapLayer.setUrl(getTileUrl(e.detail)));

  // ── 2. SHARED STATE ────────────────────────────────────────────────────────
  let allReports = []; // Master data list
  const markers = {};   // Marker cache { docId: L.CircleMarker }
  let currentFilter = "all";

  // ── 3. UI REFERENCES ───────────────────────────────────────────────────────
  const sidebar = document.getElementById("sidebar");
  const sidebarBtn = document.getElementById("sidebar-toggle");
  const hotspotList = document.getElementById("hotspot-list");
  const reportListCount = document.getElementById("report-count");
  const allReportsListEl = document.getElementById("all-reports-list");
  const statsHigh = document.getElementById("stats-high");
  const statsMed = document.getElementById("stats-med");
  const statsLow = document.getElementById("stats-low");

  // Modal Refs
  const modal = document.getElementById("detail-modal");
  const modalClose = document.getElementById("modal-close");
  // ── 4. HELPERS ─────────────────────────────────────────────────────────────
  function urgencyColor(score) {
    if (score >= 8) return { fill: "#ef4444", glow: "rgba(239,68,68,0.4)" };
    if (score >= 4) return { fill: "#f97316", glow: "rgba(249,115,22,0.4)" };
    return { fill: "#22c55e", glow: "rgba(34,197,94,0.4)" };
  }

  function needIcon(type) {
    const icons = { Food:"🍱", Water:"💧", Medical:"🏥", Shelter:"🏠", Evacuation:"🚁" };
    return icons[type] || "📌";
  }

  function esc(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }

  function escAttr(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  // ── 5. REACTIVE UI UPDATES ─────────────────────────────────────────────────
  
  function updateUI() {
    // A. Update Stats
    const high = allReports.filter(r => r.urgencyScore >= 8).length;
    const med = allReports.filter(r => r.urgencyScore >= 4 && r.urgencyScore < 8).length;
    const low = allReports.filter(r => r.urgencyScore < 4).length;
    
    if(statsHigh) statsHigh.textContent = high;
    if(statsMed) statsMed.textContent = med;
    if(statsLow) statsLow.textContent = low;
    if(reportListCount) reportListCount.textContent = allReports.length;

    // B. Update Top Hotspots (Top 3 by urgency)
    const sorted = [...allReports].sort((a,b) => b.urgencyScore - a.urgencyScore).slice(0, 3);
    if (hotspotList) {
      if (sorted.length === 0) {
        hotspotList.innerHTML = '<div class="hotspot-empty">Awaiting field data...</div>';
      } else {
        hotspotList.innerHTML = sorted.map((r, i) => `
          <div class="hotspot-item" onclick="window.panToReport('${r.id}')">
            <div class="hotspot-header">
              <span class="hotspot-rank">${["🥇","🥈","🥉"][i] || "#"+(i+1)}</span>
              <div class="hotspot-title">${needIcon(r.needType)} ${esc(r.location)}</div>
            </div>
            <div class="hotspot-meta">
              <div class="hotspot-stat">Urgency: <span style="color:${urgencyColor(r.urgencyScore).fill}">${r.urgencyScore}/10</span></div>
              <div class="hotspot-stat">Affected: ${Number(r.populationAffected).toLocaleString()}</div>
            </div>
          </div>
        `).join("");
      }
    }

    // C. Update All Reports List (Sidebar) & Marker Visibility
    applyFiltersAndList();
  }

  function applyFiltersAndList() {
    // Filter logic
    const filtered = allReports.filter(r => {
      if (currentFilter === "all") return true;
      if (currentFilter === "high") return r.urgencyScore >= 8;
      if (currentFilter === "medium") return r.urgencyScore >= 4 && r.urgencyScore < 8;
      if (currentFilter === "low") return r.urgencyScore < 4;
      return true;
    });

    // Update Marker Visibility
    allReports.forEach(r => {
      const marker = markers[r.id];
      if (!marker) return;
      const isVisible = filtered.some(fr => fr.id === r.id);
      if (isVisible) { if (!map.hasLayer(marker)) marker.addTo(map); }
      else { if (map.hasLayer(marker)) marker.remove(); }
    });

    // Update Sidebar List
    if (allReportsListEl) {
      if (filtered.length === 0) {
        allReportsListEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">No matching reports.</div>';
      } else {
        allReportsListEl.innerHTML = filtered.map(r => `
          <div class="report-list-item" onclick="window.panToReport('${r.id}')">
            <div class="report-list-header">
              <span class="report-list-loc">${needIcon(r.needType)} ${esc(r.location)}</span>
              <span style="font-weight:800; color:${urgencyColor(r.urgencyScore).fill}">${r.urgencyScore}</span>
            </div>
            <div class="report-list-meta">
              <span>👥 ${Number(r.populationAffected).toLocaleString()}</span>
              <span>🏢 ${esc(r.ngoName || "Field Staff")}</span>
            </div>
          </div>
        `).join("");
      }
    }
  }

  // ── 6. MARKER MANAGEMENT ───────────────────────────────────────────────────
  function upsertMarker(report) {
    if (report.lat == null || report.lng == null) return;
    const colors = urgencyColor(report.urgencyScore);
    
    if (markers[report.id]) markers[report.id].remove();

    const circle = L.circleMarker([report.lat, report.lng], {
      radius: Math.max(8, Math.min(22, report.urgencyScore * 2)),
      fillColor: colors.fill, color: colors.fill, fillOpacity: 0.8, weight: 2
    });

    const ts = report.timestamp ? (report.timestamp.toDate ? report.timestamp.toDate().toLocaleString() : new Date(report.timestamp).toLocaleString()) : "—";

    circle.bindPopup(`
      <div class="popup-card">
        <div class="popup-title">${needIcon(report.needType)} ${esc(report.location)}</div>
        <div class="popup-meta">
          <div class="popup-row">Urgency: <span style="color:${colors.fill}">${report.urgencyScore}/10</span></div>
          <div class="popup-row">Affected: ${Number(report.populationAffected).toLocaleString()}</div>
          <div class="popup-row">Reporter: ${esc(report.reporterName || "Anonymous")}</div>
        </div>
        <button class="btn btn-primary btn-full popup-btn" style="margin-top:10px; font-size:11px; padding:6px;" onclick="window.viewDetailedReport('${report.id}')">
          View Full Report
        </button>
        <div class="popup-ngo" style="margin-top:8px; font-size:10px; color:#64748b">🕐 ${ts}</div>
      </div>
    `, { maxWidth: 280 });

    markers[report.id] = circle;
    // Note: addTo(map) depends on current filter, handled in applyFiltersAndList()
  }

  // ── 7. INTERACTION LOGIC ───────────────────────────────────────────────────
  
  // Sidebar Toggle
  if (sidebarBtn) {
    sidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-open");
      sidebarBtn.textContent = sidebar.classList.contains("sidebar-open") ? "✕" : "☰";
    });
  }

  // Filtering Buttons (matches .filter-strip in dashboard.html)
  document.querySelectorAll(".filter-strip .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-strip .filter-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      currentFilter = btn.dataset.filter || "all";
      applyFiltersAndList();
    });
  });

  // Global Actions
  window.panToReport = (id) => {
    const report = allReports.find(r => r.id === id);
    if (!report) return;
    if (report.lat != null && report.lng != null) {
      map.flyTo([report.lat, report.lng], 12);
      if (markers[id]) markers[id].openPopup();
    }
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("sidebar-open");
      if (sidebarBtn) sidebarBtn.textContent = "☰";
    }
  };

  window.viewDetailedReport = (id) => {
    const report = allReports.find(r => r.id === id);
    if (!report || !modal) return;

    const setText = (elId, val) => {
      const el = document.getElementById(elId);
      if (el) el.textContent = val != null && val !== "" ? String(val) : "—";
    };

    setText("m-reporter", report.reporterName || "Anonymous");
    setText("m-ngo", report.ngoName);
    setText("m-city", report.city || report.reporterCity);
    setText("m-location", report.location);
    setText("m-state", report.state);
    setText("m-country", report.country);
    setText("m-need", report.needType);
    setText("m-urgency", report.urgencyScore != null ? report.urgencyScore + " / 10" : null);
    setText(
      "m-pop",
      report.populationAffected != null ? Number(report.populationAffected).toLocaleString() : null
    );

    const tsEl = document.getElementById("m-time");
    if (tsEl) {
      tsEl.textContent = report.timestamp
        ? report.timestamp.toDate
          ? report.timestamp.toDate().toLocaleString()
          : new Date(report.timestamp).toLocaleString()
        : "—";
    }

    const textEl = document.getElementById("m-text");
    if (textEl) textEl.textContent = report.rawText || "No text provided.";

    const mediaSection = document.getElementById("m-media-section");
    const mediaGrid = document.getElementById("m-media-grid");
    if (mediaSection && mediaGrid) {
      const mediaArr = Array.isArray(report.media) ? report.media : [];
      if (mediaArr.length === 0) {
        mediaSection.style.display = "none";
        mediaGrid.innerHTML = "";
      } else {
        mediaSection.style.display = "block";
        const blocks = mediaArr.map((m, idx) => {
          if (m && m.data && m.type === "photo") {
            return (
              '<div class="modal-media-item"><img src="' +
              escAttr(m.data) +
              '" alt="Photo ' +
              (idx + 1) +
              '" /></div>'
            );
          }
          if (m && m.data && m.type === "video") {
            return (
              '<div class="modal-media-item"><video controls playsinline src="' +
              escAttr(m.data) +
              '"></video></div>'
            );
          }
          if (m && m.data && m.type === "audio") {
            const dur =
              m.duration && Number(m.duration) > 0
                ? '<span class="modal-media-meta">' + esc(String(m.duration)) + "s</span>"
                : "";
            return (
              '<div class="modal-media-item modal-media-audio"><audio controls src="' +
              escAttr(m.data) +
              '"></audio>' +
              dur +
              "</div>"
            );
          }
          if (m && m.tooLarge) {
            return (
              '<div class="modal-media-note">One ' +
              esc(m.type || "file") +
              " attachment was too large to store in the database. Try a shorter recording or fewer attachments.</div>"
            );
          }
          if (m && (m.skipped || !m.data)) {
            return (
              '<div class="modal-media-note">Attachment (' +
              esc(m.type || "unknown") +
              ") — no file data saved (older report or upload issue).</div>"
            );
          }
          return "";
        });
        mediaGrid.innerHTML =
          blocks.filter(Boolean).join("") ||
          '<div class="modal-media-note">No previewable attachments.</div>';
      }
    }

    try {
      map.closePopup();
    } catch (e) {
      /* ignore */
    }

    modal.classList.add("active");
  };

  if (modalClose) {
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
    const modalPanel = modal.querySelector(".modal-container");
    if (modalPanel) {
      modalPanel.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  // Recenter
  const recenterBtn = document.getElementById("recenter-btn");
  if (recenterBtn) {
    recenterBtn.addEventListener("click", () => map.flyTo([20.5937, 78.9629], 5));
  }

  // ── 8. FIREBASE CONNECTION ────────────────────────────────────────────────
  function connect() {
    if (typeof firebase === "undefined") return;
    const cfg = window.__ENV && window.__ENV.FIREBASE_CONFIG;
    if (!cfg || cfg.apiKey === "REPLACE_ME") return;

    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const db = firebase.firestore();

    db.collection("reports").orderBy("timestamp", "desc").onSnapshot(snap => {
      allReports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allReports.forEach(upsertMarker);
      updateUI();
    });
  }

  connect();

})();
