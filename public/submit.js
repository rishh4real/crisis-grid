/**
 * submit.js — Field Worker Form logic (no ES modules, works on file://)
 * Supports: voice recording, video recording, photo capture, file upload
 * Uses Firebase compat SDK + inline Groq/Gemini API calls.
 */

(function () {
  "use strict";

  // ── Config from env ─────────────────────────────────────────────────────
  var ENV = window.__ENV || {};

  // ── Toast helper ────────────────────────────────────────────────────────
  function toast(msg, type, duration) {
    type = type || "info";
    duration = duration || 4000;
    var icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
    var container = document.getElementById("toast-container");
    var el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.innerHTML =
      '<span class="toast-icon">' + icons[type] + "</span><span>" + msg + "</span>";
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add("hide");
      el.addEventListener("animationend", function () { el.remove(); });
    }, duration);
  }

  // ── Groq Whisper transcription ──────────────────────────────────────────
  function transcribeAudio(audioFile, filename) {
    filename = filename || "audio.webm";
    var apiKey = ENV.GROQ_API_KEY;
    if (!apiKey || apiKey === "REPLACE_ME") {
      return Promise.reject(new Error("GROQ_API_KEY not configured in env-config.js"));
    }
    var formData = new FormData();
    formData.append("file", audioFile, filename);
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "json");
    if (window.i18n) formData.append("language", window.i18n.currentLang);

    return fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey },
      body: formData,
    })
      .then(function (res) {
        if (!res.ok)
          return res.json().catch(function () { return {}; }).then(function (e) {
            throw new Error("Groq API error " + res.status + ": " + ((e.error && e.error.message) || res.statusText));
          });
        return res.json();
      })
      .then(function (data) {
        var text = (data.text || "").trim();
        if (!text) throw new Error("Groq returned an empty transcription.");
        return text;
      });
  }

  // ── Groq API extraction ───────────────────────────────────────────────────
  function deriveHelpEstimate(needType, populationAffected, urgencyScore) {
    var pop = Math.max(0, parseInt(populationAffected, 10) || 0);
    var teams = Math.max(1, Math.ceil(pop / 250));
    var urgency = Math.min(10, Math.max(1, parseInt(urgencyScore, 10) || 5));
    var priority = urgency >= 8 ? "Immediate response" : urgency >= 5 ? "Urgent response" : "Planned response";
    if (needType === "Food") return priority + ": ~" + pop + " meal kits, " + teams + " field distribution teams.";
    if (needType === "Water") return priority + ": ~" + pop + " drinking-water kits/tank refills, " + teams + " water teams.";
    if (needType === "Medical") return priority + ": ~" + Math.max(1, Math.ceil(pop / 20)) + " med kits, " + teams + " medical teams.";
    if (needType === "Shelter") return priority + ": ~" + Math.max(1, Math.ceil(pop / 5)) + " shelter kits/tents, " + teams + " shelter teams.";
    if (needType === "Evacuation") return priority + ": transport for ~" + pop + " people, " + teams + " evacuation teams.";
    return priority + ": support planning for ~" + pop + " affected people, " + teams + " response teams.";
  }

  function extractReportData(reportText) {
    var apiKey = ENV.GROQ_API_KEY;
    if (!apiKey || apiKey === "REPLACE_ME") {
      return Promise.reject(new Error("GROQ_API_KEY not configured in env-config.js"));
    }
    var prompt =
      'You are a humanitarian crisis data extractor. Analyze the following field report and extract structured information.\n\nField Report:\n"' +
      reportText +
      '"\n\nReturn ONLY a valid JSON object (no markdown, no explanation) with exactly these fields:\n{\n  "location": "<city, region, or place mentioned>",\n  "needType": "<primary need: Food | Water | Medical | Shelter | Evacuation | Other>",\n  "urgencyScore": <integer 1-10, 10 being most critical>,\n  "populationAffected": <estimated number of people affected as integer>,\n  "helpNeeded": "<concise actionable estimate of aid needed: supplies + team suggestion>"\n}\n\nRules:\n- If location is unclear, infer from context or use "Unknown"\n- urgencyScore must be an integer between 1 and 10\n- populationAffected must be an integer (estimate if not explicit)\n- needType must be one of: Food, Water, Medical, Shelter, Evacuation, Other\n- helpNeeded must be one short practical sentence with quantities';

    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        top_p: 0.8,
        max_tokens: 256
      })
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (e) {
            throw new Error("Groq API error " + res.status + ": " + ((e.error && e.error.message) || res.statusText));
          });
        }
        return res.json();
      })
      .then(function (data) {
        var rawText = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
        var jsonText = rawText.replace(/```(?:json)?/gi, "").trim();
        var parsed;
        try { 
          parsed = JSON.parse(jsonText); 
        } catch (e) {
          throw new Error("Could not parse Groq response as JSON: " + rawText);
        }
        var needType = String(parsed.needType || "Other");
        var urgencyScore = Math.min(10, Math.max(1, parseInt(parsed.urgencyScore) || 5));
        var populationAffected = Math.max(0, parseInt(parsed.populationAffected) || 0);
        return {
          location: String(parsed.location || "Unknown"),
          needType: needType,
          urgencyScore: urgencyScore,
          populationAffected: populationAffected,
          helpNeeded: String(parsed.helpNeeded || "").trim() || deriveHelpEstimate(needType, populationAffected, urgencyScore),
        };
      });
  }

  function extractReportDataFast(reportText, city, state, country) {
    var text = String(reportText || "");
    var lower = text.toLowerCase();
    var needType = "Other";
    if (/(food|meal|ration|hungry|hunger)/.test(lower)) needType = "Food";
    else if (/(water|drinking|dehydration|thirst)/.test(lower)) needType = "Water";
    else if (/(medical|doctor|medicine|injur|hospital|health|ambulance)/.test(lower)) needType = "Medical";
    else if (/(shelter|tent|home|house|camp|roof)/.test(lower)) needType = "Shelter";
    else if (/(evacuat|rescue|stranded|trapped|boat)/.test(lower)) needType = "Evacuation";

    var urgencyScore = 5;
    if (/(critical|urgent|immediate|severe|trapped|dying|death|collapsed)/.test(lower)) urgencyScore = 9;
    else if (/(blocked|flood|shortage|injured|unsafe|need)/.test(lower)) urgencyScore = 7;
    else if (/(minor|stable|low)/.test(lower)) urgencyScore = 3;

    var populationAffected = 0;
    var popMatch = lower.match(/(\d[\d,]*)\s*(people|persons|families|family|children|residents|villagers)?/);
    if (popMatch) {
      populationAffected = parseInt(popMatch[1].replace(/,/g, ""), 10) || 0;
      if (/famil/.test(popMatch[2] || "")) populationAffected *= 5;
    }

    return Promise.resolve({
      location: [city, state, country || "India"].filter(Boolean).join(", ") || "India",
      needType: needType,
      urgencyScore: urgencyScore,
      populationAffected: populationAffected,
      helpNeeded: deriveHelpEstimate(needType, populationAffected, urgencyScore),
    });
  }

  // ── Geocoding via Nominatim ─────────────────────────────────────────────
  function geocode(locationName) {
    var query = String(locationName || "").trim();
    if (!query) query = "India";
    if (query.toLowerCase().indexOf("india") === -1) query += ", India";
    var url =
      "https://nominatim.openstreetmap.org/search?q=" +
      encodeURIComponent(query) +
      "&format=json&limit=1&countrycodes=in&viewbox=68.1,37.6,97.4,6.5&bounded=1";
    return fetch(url, {
      headers: { "User-Agent": "CrisisGrid/1.0 (humanitarian-tool)" },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.length) throw new Error("Location '" + query + "' not found in India");
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      });
  }

  // ── Firebase init ───────────────────────────────────────────────────────
  var db = null;
  function initFirebase() {
    if (typeof firebase === "undefined") return false;
    var cfg = ENV.FIREBASE_CONFIG;
    if (!cfg || cfg.apiKey === "REPLACE_ME") return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.firestore();
      return true;
    } catch (e) {
      console.error("Firebase init error:", e);
      return false;
    }
  }
  var firebaseOK = initFirebase();

  // ══════════════════════════════════════════════════════════════════════════
  //  MEDIA ATTACHMENTS SYSTEM
  // ══════════════════════════════════════════════════════════════════════════

  var mediaAttachments = []; // { type: 'photo'|'video'|'audio', dataUrl, blob, duration? }

  // ── DOM refs ────────────────────────────────────────────────────────────
  var reportTextarea   = document.getElementById("report-text");
  var charCounter      = document.getElementById("char-count");
  var submitBtn        = document.getElementById("submit-btn");
  var submitBtnText    = document.getElementById("submit-btn-text");
  var submitSpinner    = document.getElementById("submit-spinner");
  var voiceUploadBtn   = document.getElementById("voice-upload-btn");
  var voiceFileInput   = document.getElementById("voice-file-input");
  var photoFileInput   = document.getElementById("photo-file-input");
  var micBtn           = document.getElementById("mic-btn");
  var photoBtn         = document.getElementById("photo-btn");
  var videoBtn         = document.getElementById("video-btn");
  var mediaStatus      = document.getElementById("media-status");
  var mediaTimerEl     = document.getElementById("media-timer");
  var ngoNameInput     = document.getElementById("ngo-name");
  var previewCard      = document.getElementById("preview-card");
  var previewLocation  = document.getElementById("preview-location");
  var previewNeed      = document.getElementById("preview-need");
  var previewUrgency   = document.getElementById("preview-urgency");
  var previewPop       = document.getElementById("preview-pop");
  var previewHelp      = document.getElementById("preview-help");
  var mediaPreviewArea = document.getElementById("media-preview-area");
  var mediaPreviewList = document.getElementById("media-preview-list");

  // Camera modal
  var cameraModal      = document.getElementById("camera-modal");
  var cameraFeed       = document.getElementById("camera-feed");
  var captureBtn       = document.getElementById("camera-capture-btn");
  var closeBtn         = document.getElementById("camera-close-btn");
  var flipBtn          = document.getElementById("camera-flip-btn");
  var modeLabel        = document.getElementById("camera-mode-label");
  var recBadge         = document.getElementById("camera-rec-badge");
  var recTimerEl       = document.getElementById("camera-rec-timer");
  var canvasEl         = document.getElementById("camera-canvas");

  // ── State ───────────────────────────────────────────────────────────────
  var isRecordingAudio  = false;
  var isRecordingVideo  = false;
  var audioRecorder     = null;
  var videoRecorder     = null;
  var audioChunks       = [];
  var videoChunks       = [];
  var recordTimer       = null;
  var recordSeconds     = 0;
  var cameraStream      = null;
  var cameraMode        = "photo"; // 'photo' or 'video'
  var facingMode        = "environment"; // 'user' or 'environment'

  // ── Character counter ───────────────────────────────────────────────────
  reportTextarea.addEventListener("input", function () {
    var len = reportTextarea.value.length;
    charCounter.textContent = len + " / 1000";
    charCounter.style.color = len > 900 ? "#f87171" : "var(--text-muted)";
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  📷 PHOTO CAPTURE
  // ══════════════════════════════════════════════════════════════════════════

  photoBtn.addEventListener("click", function () {
    cameraMode = "photo";
    openCamera();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  🎥 VIDEO RECORDING
  // ══════════════════════════════════════════════════════════════════════════

  videoBtn.addEventListener("click", function () {
    cameraMode = "video";
    openCamera();
  });

  // ── Open camera modal ───────────────────────────────────────────────────
  function openCamera() {
    var constraints = { video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: cameraMode === "video" };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        cameraStream = stream;
        cameraFeed.srcObject = stream;
        cameraModal.classList.add("open");

        if (cameraMode === "photo") {
          modeLabel.textContent = "📷 Photo Mode — Tap to capture";
          captureBtn.className = "cam-btn cam-btn-capture";
        } else {
          modeLabel.textContent = "🎥 Video Mode — Tap to start recording";
          captureBtn.className = "cam-btn cam-btn-capture video-mode";
        }
        recBadge.classList.remove("visible");
      })
      .catch(function (err) {
        toast("Camera access denied or unavailable.", "error");
        console.error(err);
      });
  }

  // ── Close camera ────────────────────────────────────────────────────────
  closeBtn.addEventListener("click", function () {
    closeCamera();
  });

  function closeCamera() {
    if (isRecordingVideo) stopVideoRecording();
    cameraModal.classList.remove("open");
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (t) { t.stop(); });
      cameraStream = null;
    }
    cameraFeed.srcObject = null;
  }

  // ── Flip camera ─────────────────────────────────────────────────────────
  flipBtn.addEventListener("click", function () {
    facingMode = facingMode === "user" ? "environment" : "user";
    if (cameraStream) {
      closeCamera();
      setTimeout(function () { openCamera(); }, 200);
    }
  });

  // ── Capture button (photo or video toggle) ──────────────────────────────
  captureBtn.addEventListener("click", function () {
    if (cameraMode === "photo") {
      capturePhoto();
    } else {
      if (isRecordingVideo) {
        stopVideoRecording();
      } else {
        startVideoRecording();
      }
    }
  });

  // ── Capture photo ───────────────────────────────────────────────────────
  function capturePhoto() {
    var video = cameraFeed;
    canvasEl.width = video.videoWidth;
    canvasEl.height = video.videoHeight;
    var ctx = canvasEl.getContext("2d");

    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvasEl.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    var dataUrl = canvasEl.toDataURL("image/jpeg", 0.85);

    // Flash effect
    captureBtn.style.transform = "scale(0.9)";
    setTimeout(function () { captureBtn.style.transform = ""; }, 150);

    canvasEl.toBlob(function (blob) {
      addMedia("photo", dataUrl, blob);
      toast(window.i18n ? window.i18n.t("toast_photo_captured") : "📸 Photo captured!", "success");
      closeCamera();
    }, "image/jpeg", 0.85);
  }

  // ── Start video recording ───────────────────────────────────────────────
  function startVideoRecording() {
    if (!cameraStream) return;
    videoChunks = [];
    var mimeType = getVideoMimeType();

    try {
      videoRecorder = new MediaRecorder(cameraStream, { mimeType: mimeType });
    } catch (e) {
      videoRecorder = new MediaRecorder(cameraStream);
    }

    videoRecorder.ondataavailable = function (e) {
      if (e.data.size > 0) videoChunks.push(e.data);
    };

    videoRecorder.onstop = function () {
      var blob = new Blob(videoChunks, { type: mimeType });
      var url = URL.createObjectURL(blob);
      addMedia("video", url, blob, recordSeconds);
      toast("🎥 Video recorded! (" + formatTime(recordSeconds) + ")", "success");
      closeCamera();
    };

    videoRecorder.start(200);
    isRecordingVideo = true;
    recordSeconds = 0;

    captureBtn.className = "cam-btn cam-btn-capture video-recording";
    modeLabel.textContent = "🔴 Recording… Tap to stop";
    recBadge.classList.add("visible");

    recordTimer = setInterval(function () {
      recordSeconds++;
      recTimerEl.textContent = formatTime(recordSeconds);
      if (recordSeconds >= 60) stopVideoRecording(); // max 60s
    }, 1000);
  }

  // ── Stop video recording ────────────────────────────────────────────────
  function stopVideoRecording() {
    if (videoRecorder && isRecordingVideo) {
      videoRecorder.stop();
      isRecordingVideo = false;
      clearInterval(recordTimer);
      recBadge.classList.remove("visible");
    }
  }

  function getVideoMimeType() {
    var types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "video/webm";
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  🎙️ VOICE RECORDING
  // ══════════════════════════════════════════════════════════════════════════

  micBtn.addEventListener("click", function () {
    if (isRecordingAudio) {
      stopAudioRecording();
    } else {
      startAudioRecording();
    }
  });

  function startAudioRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        var mimeType = getAudioMimeType();
        audioRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        audioChunks = [];

        audioRecorder.ondataavailable = function (e) { if (e.data.size > 0) audioChunks.push(e.data); };
        audioRecorder.onstop = handleAudioStop;
        audioRecorder.start(200);

        isRecordingAudio = true;
        recordSeconds = 0;
        micBtn.classList.add("recording");
        micBtn.innerHTML = '<span class="media-icon">⏹</span> Stop Recording';
        mediaStatus.textContent = "Recording…";
        mediaStatus.style.color = "#f87171";
        mediaTimerEl.style.display = "inline";

        recordTimer = setInterval(function () {
          recordSeconds++;
          mediaTimerEl.textContent = formatTime(recordSeconds);
          if (recordSeconds >= 120) stopAudioRecording();
        }, 1000);
      })
      .catch(function (err) {
        toast("Microphone access denied or unavailable.", "error");
        console.error(err);
      });
  }

  function stopAudioRecording() {
    if (audioRecorder && isRecordingAudio) {
      audioRecorder.stop();
      audioRecorder.stream.getTracks().forEach(function (t) { t.stop(); });
      clearInterval(recordTimer);
      isRecordingAudio = false;
      micBtn.innerHTML = '<span class="media-icon">🎙️</span> Record Voice';
      micBtn.classList.remove("recording");
      mediaStatus.textContent = "Processing…";
      mediaStatus.style.color = "var(--text-muted)";
    }
  }

  function handleAudioStop() {
    var mimeType = getAudioMimeType();
    var ext = mimeType.indexOf("ogg") >= 0 ? "ogg" : mimeType.indexOf("mp4") >= 0 ? "mp4" : "webm";
    var blob = new Blob(audioChunks, { type: mimeType });
    var url = URL.createObjectURL(blob);
    var dur = recordSeconds;

    // Add as media attachment
    addMedia("audio", url, blob, dur);

    // Also transcribe and paste into text area
    transcribeAudio(blob, "recording." + ext)
      .then(function (text) {
        // Append transcribed text instead of replacing
        var current = reportTextarea.value.trim();
        reportTextarea.value = current ? current + "\n\n" + text : text;
        reportTextarea.dispatchEvent(new Event("input"));
        toast("🎙️ Voice transcribed & attached!", "success");
      })
      .catch(function (err) {
        toast("Transcription failed (audio still attached): " + err.message, "warning");
        console.error(err);
      })
      .finally(function () {
        mediaStatus.textContent = "";
        mediaTimerEl.style.display = "none";
        mediaTimerEl.textContent = "00:00";
      });
  }

  function getAudioMimeType() {
    var types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "audio/webm";
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  📁 FILE UPLOAD
  // ══════════════════════════════════════════════════════════════════════════

  voiceUploadBtn.addEventListener("click", function () {
    voiceFileInput.click();
  });

  voiceFileInput.addEventListener("change", function () {
    var file = voiceFileInput.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast("File is too large (max 25 MB).", "error");
      return;
    }

    // Determine file type
    var isAudio = file.type.startsWith("audio/");
    var isImage = file.type.startsWith("image/");
    var isVideo = file.type.startsWith("video/");

    if (isAudio) {
      mediaStatus.textContent = "Transcribing audio…";
      transcribeAudio(file, file.name)
        .then(function (text) {
          var current = reportTextarea.value.trim();
          reportTextarea.value = current ? current + "\n\n" + text : text;
          reportTextarea.dispatchEvent(new Event("input"));
          var url = URL.createObjectURL(file);
          addMedia("audio", url, file);
          toast(window.i18n ? window.i18n.t("toast_voice_attached") : "Voice transcribed & attached!", "success");
        }).catch(function (err) {
          toast((window.i18n ? window.i18n.t("toast_error") : "Transcription failed: ") + err.message, "error");
        }).finally(function () {
          mediaStatus.textContent = "";
          voiceFileInput.value = "";
        });
    } else if (isImage) {
      var reader = new FileReader();
      reader.onload = function (e) {
        addMedia("photo", e.target.result, file);
        toast("📸 Photo attached!", "success");
      };
      reader.readAsDataURL(file);
      voiceFileInput.value = "";
    } else if (isVideo) {
      var url = URL.createObjectURL(file);
      addMedia("video", url, file);
      toast("🎥 Video attached!", "success");
      voiceFileInput.value = "";
    } else {
      toast("Unsupported file type. Use audio, image, or video.", "warning");
      voiceFileInput.value = "";
    }
  });

  // Update file input to accept all media types
  voiceFileInput.setAttribute("accept", "audio/*,image/*,video/*");

  // ══════════════════════════════════════════════════════════════════════════
  //  MEDIA PREVIEW GALLERY
  // ══════════════════════════════════════════════════════════════════════════

  function addMedia(type, dataUrl, blob, duration) {
    var item = { type: type, dataUrl: dataUrl, blob: blob, duration: duration || 0, id: Date.now() + "_" + Math.random().toString(36).slice(2, 6) };
    mediaAttachments.push(item);
    renderMediaPreviews();
    toast(mediaAttachments.length + " media file(s) attached", "info", 1500);
  }

  function removeMedia(id) {
    mediaAttachments = mediaAttachments.filter(function (m) { return m.id !== id; });
    renderMediaPreviews();
  }

  function renderMediaPreviews() {
    if (mediaAttachments.length === 0) {
      mediaPreviewArea.style.display = "none";
      return;
    }

    mediaPreviewArea.style.display = "block";
    mediaPreviewList.innerHTML = mediaAttachments.map(function (item) {
      var innerHtml = "";
      var badge = "";

      if (item.type === "photo") {
        badge = "📷";
        innerHtml = '<img src="' + item.dataUrl + '" alt="Captured photo" />';
      } else if (item.type === "video") {
        badge = "🎥";
        innerHtml =
          '<video src="' + item.dataUrl + '" muted></video>' +
          '<div class="media-thumb-overlay">▶</div>';
      } else if (item.type === "audio") {
        badge = "🎙️";
        var dur = item.duration ? formatTime(item.duration) : "Audio";
        innerHtml =
          '<div class="media-thumb-audio">' +
          '<span>🎙️</span>' +
          '<span>' + dur + '</span>' +
          '</div>';
      }

      return (
        '<div class="media-thumb" data-id="' + item.id + '" data-type="' + item.type + '">' +
        innerHtml +
        '<span class="media-thumb-badge">' + badge + '</span>' +
        '<button class="media-thumb-remove" data-id="' + item.id + '" aria-label="Remove attachment">✕</button>' +
        '</div>'
      );
    }).join("");

    // Remove buttons
    mediaPreviewList.querySelectorAll(".media-thumb-remove").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        removeMedia(btn.dataset.id);
      });
    });

    // Click to preview (play video / show photo full-screen)
    mediaPreviewList.querySelectorAll(".media-thumb").forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        var item = mediaAttachments.find(function (m) { return m.id === thumb.dataset.id; });
        if (!item) return;

        if (item.type === "video") {
          var vid = thumb.querySelector("video");
          if (vid) {
            vid.muted = false;
            vid.currentTime = 0;
            vid.play();
            setTimeout(function () { vid.muted = true; }, item.duration * 1000 || 5000);
          }
        } else if (item.type === "audio") {
          var audio = new Audio(item.dataUrl);
          audio.play();
        }
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM SUBMISSION
  // ══════════════════════════════════════════════════════════════════════════

  /** Encode attachments for Firestore (base64 data URLs; capped to stay near 1 MiB doc limit). */
  function buildMediaForFirestore(items) {
    return Promise.all(
      items.map(function (m) {
        if (m.type === "photo" && m.dataUrl && m.dataUrl.indexOf("data:") === 0) {
          var cap = 320000;
          var data = m.dataUrl.length > cap ? m.dataUrl.substring(0, cap) : m.dataUrl;
          return Promise.resolve({ type: "photo", data: data });
        }
        if (!m.blob) {
          return Promise.resolve({
            type: m.type,
            duration: m.duration || 0,
            skipped: true,
          });
        }
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            var url = reader.result;
            var maxLen =
              m.type === "audio" ? 260000 : m.type === "video" ? 340000 : 320000;
            if (!url || String(url).length > maxLen) {
              resolve({
                type: m.type,
                duration: m.duration || 0,
                tooLarge: true,
                mime: (m.blob && m.blob.type) || "",
              });
            } else {
              resolve({
                type: m.type,
                data: url,
                duration: m.duration || 0,
                mime: (m.blob && m.blob.type) || "",
              });
            }
          };
          reader.onerror = function () {
            resolve({ type: m.type, duration: m.duration || 0, skipped: true });
          };
          try {
            reader.readAsDataURL(m.blob);
          } catch (err) {
            resolve({ type: m.type, duration: m.duration || 0, skipped: true });
          }
        });
      })
    );
  }

  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error(message || "Operation timed out."));
      }, ms);

      Promise.resolve(promise).then(
        function (value) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(value);
        },
        function (err) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function getMediaDataForSave() {
    if (!mediaAttachments.length) {
      return Promise.resolve([]);
    }
    return buildMediaForFirestore(mediaAttachments);
  }

  function getSuccessMessage(savedAttachmentCount) {
    return window.i18n ? window.i18n.t("toast_success") : "Report submitted successfully!";
  }

  document.getElementById("report-form").addEventListener("submit", function (e) {
    e.preventDefault();

    var reportText = reportTextarea.value.trim();
    if (!reportText) {
      toast("Please enter a report before submitting.", "warning");
      return;
    }
    if (reportText.length < 10) {
      toast("Report is too short. Please provide more detail.", "warning");
      return;
    }

    var reporterName = document.getElementById("reporter-name") ? document.getElementById("reporter-name").value.trim() : "";
    var city = document.getElementById("reporter-city") ? document.getElementById("reporter-city").value.trim() : "";
    var state = document.getElementById("reporter-state") ? document.getElementById("reporter-state").value.trim() : "";
    var country = "India";
    if (document.getElementById("reporter-country")) {
      document.getElementById("reporter-country").value = "India";
    }
    
    var locationPrefix = "";
    if (city || state || country) {
      locationPrefix = "Contextual Location: " + [city, state, country].filter(Boolean).join(", ") + ". ";
    }
    var fullReportText = locationPrefix ? locationPrefix + "Field Observation: " + reportText : reportText;

    var ngoName = ngoNameInput.value.trim() || "Independent Field Worker";
    setSubmitLoading(true, "Preparing report…");
    hidePreview();
 
    extractReportDataFast(fullReportText, city, state, country)
      .then(function (extracted) {
        showPreview(extracted);
        toast("Report prepared. Saving…", "info", 1200);
 
        var geocodeTarget = [city, state, country].filter(Boolean).join(", ") || extracted.location;
        return withTimeout(geocode(geocodeTarget), 6000, "Location lookup timed out.")
          .then(function (geo) { return { extracted: extracted, lat: geo.lat, lng: geo.lng }; })
          .catch(function () {
            return withTimeout(geocode(extracted.location), 6000, "Location lookup timed out.")
              .then(function (geo) { return { extracted: extracted, lat: geo.lat, lng: geo.lng }; })
              .catch(function () { return { extracted: extracted, lat: null, lng: null }; });
          });
      })
      .then(function (result) {
        if (!db) {
          toast(window.i18n ? window.i18n.t("toast_firebase_error") : "Firebase not configured — report extracted but NOT saved.", "warning");
          setSubmitLoading(false);
          return;
        }
 
        var savedAttachmentCount = mediaAttachments.length;
        setSubmitLoading(
          true,
          savedAttachmentCount ? "Processing attachments…" : (window.i18n ? window.i18n.t("btn_saving") : "Saving report…")
        );

        return getMediaDataForSave()
          .then(function (mediaData) {
            setSubmitLoading(true, window.i18n ? window.i18n.t("btn_saving") : "Saving report…");
            return withTimeout(
              db.collection("reports").add({
                rawText: reportText,
                reporterName: reporterName,
                city: city,
                state: state,
                country: country,
                ngoName: ngoName,
                location: result.extracted.location,
                needType: result.extracted.needType,
                urgencyScore: result.extracted.urgencyScore,
                populationAffected: result.extracted.populationAffected,
                helpNeeded: result.extracted.helpNeeded || "",
                lat: result.lat,
                lng: result.lng,
                mediaCount: savedAttachmentCount,
                media: mediaData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              }),
              12000,
              "Saving report timed out. Check Firebase Firestore rules and network access."
            );
        }).then(function () {
          toast(getSuccessMessage(savedAttachmentCount), "success");
          reportTextarea.value = "";
          document.getElementById("reporter-name") && (document.getElementById("reporter-name").value = "");
          document.getElementById("reporter-city") && (document.getElementById("reporter-city").value = "");
          document.getElementById("reporter-state") && (document.getElementById("reporter-state").value = "");
          document.getElementById("reporter-country") && (document.getElementById("reporter-country").value = "India");
          ngoNameInput.value = "";
          charCounter.textContent = "0 / 1000";
          mediaAttachments = [];
          renderMediaPreviews();
          hidePreview();
        });
      })
      .catch(function (err) {
        toast((window.i18n ? window.i18n.t("toast_error") : "Error: ") + err.message, "error");
        console.error(err);
      })
      .finally(function () {
        setSubmitLoading(false);
      });
  });

  function setSubmitLoading(loading, label) {
    submitBtn.disabled = loading;
    submitBtnText.textContent = label || "Submit Report";
    submitSpinner.style.display = loading ? "inline-block" : "none";
  }

  // ── Preview card ────────────────────────────────────────────────────────
  function showPreview(data) {
    previewLocation.textContent = data.location;
    previewNeed.textContent = data.needType;
    previewPop.textContent = data.populationAffected.toLocaleString();
    var score = data.urgencyScore;
    previewUrgency.textContent = score + " / 10";
    previewUrgency.style.color = score >= 8 ? "#f87171" : score >= 4 ? "#fb923c" : "#4ade80";
    if (previewHelp) previewHelp.textContent = data.helpNeeded || "—";
    previewCard.style.display = "block";
    previewCard.classList.add("preview-enter");
  }

  function hidePreview() {
    previewCard.style.display = "none";
    previewCard.classList.remove("preview-enter");
  }

  // ── Utils ───────────────────────────────────────────────────────────────
  function formatTime(sec) {
    var m = String(Math.floor(sec / 60)).padStart(2, "0");
    var s = String(sec % 60).padStart(2, "0");
    return m + ":" + s;
  }
})();
