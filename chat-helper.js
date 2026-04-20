(function () {
  "use strict";

  var ENV = window.__ENV || {};
  var messages = [
    {
      role: "system",
      content:
        "You are CrisisGrid Helper, a concise assistant for humanitarian field reporting in India. Help users submit useful crisis reports, understand urgency, attach evidence, and use the dashboard. Keep replies under 70 words. Do not invent emergency instructions beyond basic safety and escalation guidance.",
    },
  ];

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function esc(text) {
    return String(text || "").replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function fallbackAnswer(input) {
    var q = String(input || "").toLowerCase();
    if (/submit|report|form/.test(q)) {
      return "Add the city, state, reporter name, and a clear crisis note. Include numbers, need type, blocked roads, injuries, and any safe evidence you have.";
    }
    if (/urgency|priority|critical/.test(q)) {
      return "Use high urgency for immediate danger, trapped people, severe medical needs, no water, or blocked evacuation. Lower urgency fits stable situations with planned support.";
    }
    if (/photo|video|audio|attach/.test(q)) {
      return "Attach only useful evidence. Short photos or recordings work best. Avoid large files when the network is weak.";
    }
    if (/map|dashboard|hotspot/.test(q)) {
      return "Priority Hotspots show the most urgent reports. Latest Field Reports show newest submissions. Use Locate to jump to a report on the map.";
    }
    return "I can help you write a stronger field report, understand urgency, attach evidence, or read the dashboard. Tell me what you are trying to do.";
  }

  function askGroq(input) {
    var apiKey = ENV.GROQ_API_KEY;
    if (!apiKey || apiKey === "REPLACE_ME") {
      return Promise.resolve(fallbackAnswer(input));
    }

    messages.push({ role: "user", content: input });
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages.slice(-7),
        temperature: 0.2,
        max_tokens: 140,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Helper unavailable");
        return res.json();
      })
      .then(function (data) {
        var reply =
          data &&
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content;
        reply = String(reply || fallbackAnswer(input)).trim();
        messages.push({ role: "assistant", content: reply });
        return reply;
      })
      .catch(function () {
        return fallbackAnswer(input);
      });
  }

  ready(function () {
    if (document.getElementById("cg-helper")) return;

    var wrap = document.createElement("div");
    wrap.id = "cg-helper";
    wrap.innerHTML =
      '<button type="button" class="cg-helper-toggle" aria-expanded="false" aria-controls="cg-helper-panel">AI Help</button>' +
      '<section id="cg-helper-panel" class="cg-helper-panel" aria-label="CrisisGrid AI helper">' +
      '<div class="cg-helper-head"><div><strong>AI Helper</strong><span>Fast field support</span></div><button type="button" class="cg-helper-close" aria-label="Close">×</button></div>' +
      '<div class="cg-helper-messages" role="log" aria-live="polite">' +
      '<div class="cg-helper-msg bot">Ask me how to write a report, set urgency, attach evidence, or read the dashboard.</div>' +
      "</div>" +
      '<form class="cg-helper-form">' +
      '<input class="cg-helper-input" type="text" placeholder="Ask for help..." autocomplete="off" maxlength="240" />' +
      '<button type="submit">Send</button>' +
      "</form>" +
      "</section>";
    document.body.appendChild(wrap);

    var toggle = wrap.querySelector(".cg-helper-toggle");
    var panel = wrap.querySelector(".cg-helper-panel");
    var close = wrap.querySelector(".cg-helper-close");
    var form = wrap.querySelector(".cg-helper-form");
    var input = wrap.querySelector(".cg-helper-input");
    var log = wrap.querySelector(".cg-helper-messages");

    function setOpen(open) {
      wrap.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) setTimeout(function () { input.focus(); }, 80);
    }

    function addMessage(type, text) {
      var el = document.createElement("div");
      el.className = "cg-helper-msg " + type;
      el.innerHTML = esc(text);
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    toggle.addEventListener("click", function () {
      setOpen(!wrap.classList.contains("open"));
    });
    close.addEventListener("click", function () {
      setOpen(false);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMessage("user", text);
      var thinking = addMessage("bot", "Thinking...");
      askGroq(text).then(function (reply) {
        thinking.innerHTML = esc(reply);
        log.scrollTop = log.scrollHeight;
      });
    });
  });
})();
