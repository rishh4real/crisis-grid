/**
 * app.js — CrisisGrid Dispatch Dashboard
 * Map filters, markers, full-report modal, all/recent reports drawer.
 */
(function () {
  "use strict";

  const map = L.map("map", {
    center: [20.5937, 78.9629],
    zoom: 5,
    zoomControl: false,
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);

  const getTileUrl = (theme) =>
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const mapLayer = L.tileLayer(getTileUrl(currentTheme), {
    attribution: "&copy; OSM &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  window.addEventListener("themeChanged", (e) => mapLayer.setUrl(getTileUrl(e.detail)));

  let allReports = [];
  const markers = {};
  let currentFilter = "all";
  let drawerSortMode = null;

  const sidebar = document.getElementById("sidebar");
  const sidebarBtn = document.getElementById("sidebar-toggle");
  const hotspotList = document.getElementById("hotspot-list");
  const recentReportList = document.getElementById("recent-report-list");
  const reportListCount = document.getElementById("report-count");
  const statsHigh = document.getElementById("stats-high");
  const statsMed = document.getElementById("stats-med");
  const statsLow = document.getElementById("stats-low");
  const lastUpdatedEl = document.getElementById("last-updated");

  const modal = document.getElementById("detail-modal");
  const modalClose = document.getElementById("modal-close");

  const reportsDrawer = document.getElementById("reports-drawer");
  const reportsDrawerList = document.getElementById("reports-drawer-list");
  const reportsDrawerClose = document.getElementById("reports-drawer-close");
  const reportsDrawerBackdrop = document.getElementById("reports-drawer-backdrop");
  const btnAllReportsDrawer = document.getElementById("btn-all-reports-drawer");

  function urgencyNumber(reportOrScore) {
    const raw =
      typeof reportOrScore === "object" && reportOrScore !== null
        ? reportOrScore.urgencyScore
        : reportOrScore;
    const u = Number(raw);
    return Number.isFinite(u) ? u : NaN;
  }

  /** Pin / UI colors: critical 8–10, moderate 4–7, low 1–3; else neutral. */
  function urgencyColor(score) {
    const u = Number(score);
    if (!Number.isFinite(u)) {
      return { fill: "#94a3b8", glow: "rgba(148,163,184,0.35)" };
    }
    if (u >= 8 && u <= 10) return { fill: "#ef4444", glow: "rgba(239,68,68,0.4)" };
    if (u >= 4 && u <= 7) return { fill: "#f97316", glow: "rgba(249,115,22,0.4)" };
    if (u >= 1 && u <= 3) return { fill: "#22c55e", glow: "rgba(34,197,94,0.4)" };
    return { fill: "#94a3b8", glow: "rgba(148,163,184,0.35)" };
  }

  function matchesUrgencyBand(r, band) {
    const u = urgencyNumber(r);
    if (!Number.isFinite(u)) return false;
    if (band === "high") return u >= 8 && u <= 10;
    if (band === "medium") return u >= 4 && u <= 7;
    if (band === "low") return u >= 1 && u <= 3;
    return false;
  }

  function reportMatchesMapFilter(r) {
    if (currentFilter === "all") return true;
    return matchesUrgencyBand(r, currentFilter);
  }

  function needIcon(type) {
    const icons = {
      Food: "\uD83C\uDF71",
      Water: "\uD83D\uDCA7",
      Medical: "\uD83C\uDFE5",
      Shelter: "\uD83C\uDFE0",
      Evacuation: "\uD83D\uDE81",
    };
    return icons[type] || "\uD83D\uDCCC";
  }

  function esc(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }

  function escAttr(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function reportTimeMs(r) {
    if (!r || !r.timestamp) return 0;
    if (typeof r.timestamp.toDate === "function") return r.timestamp.toDate().getTime();
    const d = new Date(r.timestamp);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function formatReportTime(r) {
    if (!r || !r.timestamp) return "\u2014";
    if (typeof r.timestamp.toDate === "function") return r.timestamp.toDate().toLocaleString();
    return new Date(r.timestamp).toLocaleString();
  }

  function syncDrawerTitle() {
    const titleEl = document.getElementById("reports-drawer-title");
    if (!titleEl || !window.i18n) return;
    if (drawerSortMode === "recent") titleEl.textContent = window.i18n.t("recent_reports_title");
    else titleEl.textContent = window.i18n.t("all_reports_title");
  }

  function openReportsDrawer(mode) {
    if (!reportsDrawer) return;
    drawerSortMode = mode;
    reportsDrawer.classList.add("open");
    reportsDrawer.setAttribute("aria-hidden", "false");
    syncDrawerTitle();
    renderReportsDrawerList();
    if (sidebar && window.innerWidth <= 768) {
      sidebar.classList.remove("sidebar-open");
      if (sidebarBtn) sidebarBtn.textContent = "\u2630";
    }
  }

  function closeReportsDrawer() {
    if (!reportsDrawer) return;
    drawerSortMode = null;
    reportsDrawer.classList.remove("open");
    reportsDrawer.setAttribute("aria-hidden", "true");
  }

  function renderReportsDrawerList() {
    if (!reportsDrawerList || !drawerSortMode) return;
    const emptyMsg = window.i18n ? window.i18n.t("drawer_empty") : "No reports yet.";
    let rows = [...allReports];
    if (drawerSortMode === "urgency") {
      rows.sort((a, b) => urgencyNumber(b) - urgencyNumber(a));
    } else {
      rows.sort((a, b) => reportTimeMs(b) - reportTimeMs(a));
    }
    if (rows.length === 0) {
      reportsDrawerList.innerHTML = '<div class="reports-drawer-empty">' + esc(emptyMsg) + "</div>";
      return;
    }
    reportsDrawerList.innerHTML = rows
      .map((r) => {
        const u = urgencyNumber(r);
        const uc = urgencyColor(u);
        const scoreLabel = Number.isFinite(u) ? String(u) : "\u2014";
        const ts = formatReportTime(r);
        return (
          '<button type="button" class="report-drawer-card" data-report-id="' +
          escAttr(r.id) +
          '">' +
          '<div class="report-drawer-card-top">' +
          '<span class="report-drawer-loc">' +
          needIcon(r.needType) +
          " " +
          esc(r.location || "Unknown") +
          "</span>" +
          '<span class="report-drawer-urgency" style="color:' +
          uc.fill +
          '">' +
          scoreLabel +
          "</span>" +
          "</div>" +
          '<div class="report-drawer-meta">' +
          "<span>\uD83D\uDC65 " +
          Number(r.populationAffected || 0).toLocaleString() +
          "</span>" +
          "<span>\uD83C\uDFE2 " +
          esc(r.ngoName || "Field Staff") +
          "</span>" +
          "<span>\uD83D\uDD50 " +
          esc(ts) +
          "</span>" +
          "</div></button>"
        );
      })
      .join("");
  }

  function updateUI() {
    const high = allReports.filter((r) => matchesUrgencyBand(r, "high")).length;
    const med = allReports.filter((r) => matchesUrgencyBand(r, "medium")).length;
    const low = allReports.filter((r) => matchesUrgencyBand(r, "low")).length;

    if (statsHigh) statsHigh.textContent = high;
    if (statsMed) statsMed.textContent = med;
    if (statsLow) statsLow.textContent = low;
    if (reportListCount) reportListCount.textContent = allReports.length;
    if (lastUpdatedEl) lastUpdatedEl.textContent = new Date().toLocaleString();

    const sorted = [...allReports]
      .sort((a, b) => urgencyNumber(b) - urgencyNumber(a))
      .slice(0, 3);
    const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
    if (hotspotList) {
      if (sorted.length === 0) {
        hotspotList.innerHTML = '<div class="hotspot-empty">Awaiting field data...</div>';
      } else {
        hotspotList.innerHTML = sorted
          .map((r, i) => {
            const u = urgencyNumber(r);
            const uc = urgencyColor(u);
            const uDisp = Number.isFinite(u) ? u : "\u2014";
            return (
              `<div class="hotspot-item" data-report-id="${escAttr(r.id)}">` +
              '<div class="hotspot-header">' +
              `<span class="hotspot-rank">${medals[i] || "#" + (i + 1)}</span>` +
              `<div class="hotspot-title">${needIcon(r.needType)} ${esc(r.location)}</div>` +
              "</div>" +
              '<div class="hotspot-meta">' +
              '<div class="hotspot-stat">Urgency: <span style="color:' +
              uc.fill +
              '">' +
              uDisp +
              "/10</span></div>" +
              '<div class="hotspot-stat">Affected: ' +
              Number(r.populationAffected || 0).toLocaleString() +
              "</div>" +
              "</div>" +
              '<div class="hotspot-actions">' +
              `<button type="button" class="hotspot-btn" data-action="pan" data-report-id="${escAttr(r.id)}">Locate</button>` +
              `<button type="button" class="hotspot-btn" data-action="view" data-report-id="${escAttr(r.id)}">View Full Report</button>` +
              "</div></div>"
            );
          })
          .join("");
      }
    }

    if (recentReportList) {
      const latest = [...allReports].sort((a, b) => reportTimeMs(b) - reportTimeMs(a)).slice(0, 2);
      if (latest.length === 0) {
        recentReportList.innerHTML = '<div class="hotspot-empty">No recent reports yet.</div>';
      } else {
        recentReportList.innerHTML = latest
          .map((r) => {
            const u = urgencyNumber(r);
            const uc = urgencyColor(u);
            const uDisp = Number.isFinite(u) ? u : "\u2014";
            return (
              `<div class="hotspot-item" data-report-id="${escAttr(r.id)}">` +
              '<div class="hotspot-header">' +
              `<span class="hotspot-rank">\uD83D\uDD50</span>` +
              `<div class="hotspot-title">${needIcon(r.needType)} ${esc(r.location)}</div>` +
              "</div>" +
              '<div class="hotspot-meta">' +
              '<div class="hotspot-stat">Urgency: <span style="color:' +
              uc.fill +
              '">' +
              uDisp +
              "/10</span></div>" +
              '<div class="hotspot-stat">Affected: ' +
              Number(r.populationAffected || 0).toLocaleString() +
              "</div>" +
              "</div>" +
              '<div class="hotspot-actions">' +
              `<button type="button" class="hotspot-btn" data-action="pan" data-report-id="${escAttr(r.id)}">Locate</button>` +
              `<button type="button" class="hotspot-btn" data-action="view" data-report-id="${escAttr(r.id)}">View Full Report</button>` +
              "</div></div>"
            );
          })
          .join("");
      }
    }

    applyFiltersAndList();

    if (reportsDrawer && reportsDrawer.classList.contains("open") && drawerSortMode) {
      syncDrawerTitle();
      renderReportsDrawerList();
    }
  }

  function applyFiltersAndList() {
    const filtered = allReports.filter((r) => reportMatchesMapFilter(r));

    allReports.forEach((r) => {
      const marker = markers[r.id];
      if (!marker) return;
      const isVisible = filtered.some((fr) => fr.id === r.id);
      if (isVisible) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else if (map.hasLayer(marker)) {
        marker.remove();
      }
    });
  }

  function upsertMarker(report) {
    if (report.lat == null || report.lng == null) return;
    const u = urgencyNumber(report);
    const colors = urgencyColor(u);

    if (markers[report.id]) markers[report.id].remove();

    const radiusBase = Number.isFinite(u) ? u : 5;
    const circle = L.circleMarker([report.lat, report.lng], {
      radius: Math.max(8, Math.min(22, radiusBase * 2)),
      fillColor: colors.fill,
      color: colors.fill,
      fillOpacity: 0.8,
      weight: 2,
    });

    const ts = report.timestamp
      ? typeof report.timestamp.toDate === "function"
        ? report.timestamp.toDate().toLocaleString()
        : new Date(report.timestamp).toLocaleString()
      : "\u2014";
    const uDisp = Number.isFinite(u) ? u : "\u2014";

    circle.bindPopup(
      `
      <div class="popup-card">
        <div class="popup-title">${needIcon(report.needType)} ${esc(report.location)}</div>
        <div class="popup-meta">
          <div class="popup-row">Urgency: <span style="color:${colors.fill}">${uDisp}/10</span></div>
          <div class="popup-row">Affected: ${Number(report.populationAffected || 0).toLocaleString()}</div>
          <div class="popup-row">Reporter: ${esc(report.reporterName || "Anonymous")}</div>
        </div>
        <button type="button" class="btn btn-primary btn-full popup-btn js-popup-full-report" data-report-id="${escAttr(
          report.id
        )}" style="margin-top:10px; font-size:11px; padding:6px;">
          View Full Report
        </button>
        <div class="popup-ngo" style="margin-top:8px; font-size:10px; color:#64748b">\uD83D\uDD50 ${ts}</div>
      </div>
    `,
      { maxWidth: 280 }
    );

    circle.on("popupopen", () => {
      const pu = circle.getPopup();
      const wrap = pu && pu.getElement ? pu.getElement() : null;
      if (!wrap) return;
      const btn = wrap.querySelector(".js-popup-full-report");
      if (!btn) return;
      const rid = report.id;
      btn.onclick = function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        if (typeof window.viewDetailedReport === "function") window.viewDetailedReport(rid);
      };
    });

    markers[report.id] = circle;
  }

  if (sidebarBtn) {
    sidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-open");
      sidebarBtn.textContent = sidebar.classList.contains("sidebar-open") ? "\u2715" : "\u2630";
    });
  }

  document.querySelectorAll(".filter-strip .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-strip .filter-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      currentFilter = btn.dataset.filter || "all";
      applyFiltersAndList();
    });
  });

  if (btnAllReportsDrawer) {
    btnAllReportsDrawer.addEventListener("click", () => openReportsDrawer("urgency"));
  }
  if (reportsDrawerClose) {
    reportsDrawerClose.addEventListener("click", closeReportsDrawer);
  }
  if (reportsDrawerBackdrop) {
    reportsDrawerBackdrop.addEventListener("click", closeReportsDrawer);
  }
  if (reportsDrawerList) {
    reportsDrawerList.addEventListener("click", (e) => {
      const card = e.target.closest("[data-report-id]");
      if (!card) return;
      const id = card.getAttribute("data-report-id");
      if (id) window.panToReport(id);
    });
  }

  function attachSidebarListEvents(container) {
    if (!container) return;
    container.addEventListener("click", (e) => {
      const target = e.target.closest("[data-action][data-report-id]");
      if (!target) return;
      const id = target.getAttribute("data-report-id");
      const action = target.getAttribute("data-action");
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      if (action === "view") window.viewDetailedReport(id);
      if (action === "pan") window.panToReport(id);
    });
  }

  attachSidebarListEvents(hotspotList);
  attachSidebarListEvents(recentReportList);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && reportsDrawer && reportsDrawer.classList.contains("open")) {
      closeReportsDrawer();
    }
  });

  window.addEventListener("languageChanged", () => {
    if (reportsDrawer && reportsDrawer.classList.contains("open") && drawerSortMode) {
      syncDrawerTitle();
      renderReportsDrawerList();
    }
  });

  window.panToReport = (id) => {
    if (reportsDrawer && reportsDrawer.classList.contains("open")) closeReportsDrawer();
    const report = allReports.find((r) => r.id === id);
    if (!report) return;
    if (report.lat != null && report.lng != null) {
      map.flyTo([report.lat, report.lng], 12);
      if (markers[id]) markers[id].openPopup();
    }
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("sidebar-open");
      if (sidebarBtn) sidebarBtn.textContent = "\u2630";
    }
  };

  window.viewDetailedReport = (id) => {
    const report = allReports.find((r) => r.id === id);
    if (!report) {
      console.warn("[CrisisGrid] viewDetailedReport: report not found:", id);
      return;
    }
    if (!modal) {
      console.error("[CrisisGrid] detail modal missing from DOM (#detail-modal)");
      return;
    }

    try {
      const setText = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.textContent = val != null && val !== "" ? String(val) : "\u2014";
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
        let ts = "\u2014";
        if (report.timestamp) {
          if (typeof report.timestamp.toDate === "function") {
            ts = report.timestamp.toDate().toLocaleString();
          } else {
            ts = new Date(report.timestamp).toLocaleString();
          }
        }
        tsEl.textContent = ts;
      }

      const textEl = document.getElementById("m-text");
      if (textEl) textEl.textContent = report.rawText || "No text provided.";

      const actionPlanEl = document.getElementById("m-action-plan");
      if (actionPlanEl) {
        actionPlanEl.textContent = report.actionPlan || "Action plan pending (processing field report)...";
      }

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
          var mediaSrc = m && (m.url || m.data);
          if (m && mediaSrc && m.type === "photo") {
              return (
                '<div class="modal-media-item"><img src="' +
                escAttr(mediaSrc) +
                '" alt="Photo ' +
                (idx + 1) +
                '" /></div>'
              );
            }
            if (m && mediaSrc && m.type === "video") {
              return (
                '<div class="modal-media-item"><video controls playsinline src="' +
                escAttr(mediaSrc) +
                '"></video></div>'
              );
            }
            if (m && mediaSrc && m.type === "audio") {
              const dur =
                m.duration && Number(m.duration) > 0
                  ? '<span class="modal-media-meta">' + esc(String(m.duration)) + "s</span>"
                  : "";
              return (
                '<div class="modal-media-item modal-media-audio"><audio controls src="' +
                escAttr(mediaSrc) +
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
        if (map && typeof map.closePopup === "function") map.closePopup();
      } catch (e) {
        /* ignore */
      }

      modal.classList.add("active");
    } catch (err) {
      console.error("[CrisisGrid] viewDetailedReport error:", err);
    }
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

  const recenterBtn = document.getElementById("recenter-btn");
  if (recenterBtn) {
    recenterBtn.addEventListener("click", () => map.flyTo([20.5937, 78.9629], 5));
  }

  function connect() {
    if (typeof firebase === "undefined") return;
    const cfg = window.__ENV && window.__ENV.FIREBASE_CONFIG;
    if (!cfg || cfg.apiKey === "REPLACE_ME") return;

    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const db = firebase.firestore();

    db.collection("reports")
      .orderBy("timestamp", "desc")
      .onSnapshot((snap) => {
        allReports = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        allReports.forEach(upsertMarker);
        updateUI();
      });
  }

  connect();
})();
