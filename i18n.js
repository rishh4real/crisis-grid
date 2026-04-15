(function() {
  "use strict";

  const translations = {
    en: {
      site_title: "CrisisGrid — Emergency Response System",
      emergency_banner: "EMERGENCY RESPONSE SYSTEM — For authorized field workers and NGO coordinators only",
      navbar_slogan: "EMERGENCY COMMAND CENTER",
      nav_dashboard: "🗺️ Dashboard",
      nav_submit: "+ Submit Report",
      hero_title: "Ground truth, delivered to those who act.",
      hero_subtitle: "CrisisGrid is an official rapid incident reporting tool connecting field volunteers with automated AI extraction and real-time dispatch mapping.",
      btn_submit_report: "Submit Field Report",
      btn_view_map: "View Live Map",
      stat_total_reports: "Total Reports Active",
      stat_critical_alerts: "Critical Alerts",
      stat_people_affected: "People Affected",
      section_how_it_works: "How It Works",
      section_how_subtitle: "An automated, rapid-response pipeline scaling ground-level data to centralized dashboards instantly.",
      how_step_1_title: "1. Field Collection",
      how_step_1_desc: "Volunteers and workers upload raw situational audio, video, or text reports over low-bandwidth constraints directly from the crisis zone.",
      how_step_2_title: "2. AI Extraction",
      how_step_2_desc: "Advanced NLP precisely extrapolates structured JSON intelligence—including exact locations, core needs, urgency, and estimated populace impacts.",
      how_step_3_title: "3. Live Dispatch",
      how_step_3_desc: "Coordinates are geocoded and surfaced automatically to the main dispatch panel to facilitate instantaneous deployment prioritization.",
      section_who_for: "Who is it for?",
      who_field_workers: "Field Workers",
      who_field_workers_desc: "Streamline reporting without filling out heavy forms. Fast audio transcription saves crucial time under pressure.",
      who_coordinators: "NGO Coordinators",
      who_coordinators_desc: "Get a top-level picture instantly. See exactly where resources are most needed without manually parsing fragmented texts.",
      who_gov_teams: "Government Teams",
      who_gov_teams_desc: "Aggregate cross-agency intelligence into a single, reliable operational picture to deploy NDRF or military forces efficiently.",
      footer_credits: "CrisisGrid Command Center © 2026. For authorized use only.",
      dashboard_title: "CrisisGrid — Live Crisis Map",
      response_overview: "Response Overview",
      critical: "Critical",
      moderate: "Moderate",
      low_risk: "Low Risk",
      top_hotspots: "🔥 Top Hotspots",
      connecting_feed: "Connecting to live feed…",
      last_updated: "Updated:",
      active_reports: "active reports",
      live: "LIVE",
      all: "All",
      low: "Low",
      submit_field_report: "📡 Submit Field Report",
      submit_subtitle: "Type or dictate your on-ground crisis observation. AI will extract structured data for the response map.",
      section_media: "📎 Media Attachments",
      btn_photo: "Take Photo",
      btn_video: "Record Video",
      btn_voice: "Record Voice",
      btn_upload: "Upload File",
      attached_evidence: "Attached Evidence",
      section_crisis_report: "📝 Crisis Report",
      placeholder_report: "Describe the crisis you're witnessing, e.g. '50 families need food and clean water in Kolhapur after severe flooding...'",
      section_reporter_details: "🏢 Reporter Details",
      label_city: "City",
      label_state: "State",
      label_country: "Country",
      label_reporter_name: "Reporter Name",
      label_ngo: "Organisation / NGO Name (optional)",
      ai_extracted_data: "✨ AI Extracted Data",
      key_location: "Location",
      key_need: "Need Type",
      key_urgency: "Urgency Score",
      key_pop: "Population Affected",
      btn_submit_final: "Submit Report",
      btn_view_full_report: "View Full Report",
      all_reports_title: "📋 All Field Reports",
      recent_reports_title: "Recent reports (newest first)",
      btn_all_reports: "All reports",
      btn_recent_reports: "Recent reports",
      drawer_empty: "No reports yet.",
      modal_details_title: "Detailed Crisis Report",
      modal_reporter: "Reporter",
      modal_original_text: "Original Report Text",
      modal_audio_note: "Voice Note",
      filter_all: "All",
      filter_critical: "Critical",
      filter_moderate: "Moderate",
      filter_low: "Low",
      select_country: "Select a country",
      settings_title: "Settings",
      settings_theme: "Theme Mode",
      settings_lang: "Language",
      theme_light: "Light",
      theme_dark: "Dark",
      lang_en: "English",
      lang_hi: "हिन्दी",
      toast_success: "Report submitted successfully!",
      toast_error: "Error processing report.",
      map_view_live: "View Live Map →"
    },
    hi: {
      site_title: "CrisisGrid — आपातकालीन प्रतिक्रिया प्रणाली",
      emergency_banner: "आपातकालीन प्रतिक्रिया प्रणाली — केवल अधिकृत फील्ड कार्यकर्ताओं और NGO समन्वयकों के लिए",
      navbar_slogan: "आपातकालीन कमांड सेंटर",
      nav_dashboard: "🗺️ डैशबोर्ड",
      nav_submit: "+ रिपोर्ट जमा करें",
      hero_title: "समीक्षा और कार्य के लिए सटीक जमीनी जानकारी।",
      hero_subtitle: "CrisisGrid एक आधिकारिक त्वरित घटना रिपोर्टिंग उपकरण है जो फील्ड स्वयंसेवकों को स्वचालित AI निष्कर्षण और वास्तविक समय प्रेषण मानचित्रण से जोड़ता है।",
      btn_submit_report: "फील्ड रिपोर्ट जमा करें",
      btn_view_map: "लाइव मैप देखें",
      stat_total_reports: "कुल सक्रिय रिपोर्ट",
      stat_critical_alerts: "गंभीर अलर्ट",
      stat_people_affected: "प्रभावित लोग",
      section_how_it_works: "यह कैसे काम करता है",
      section_how_subtitle: "एक स्वचालित, त्वरित-प्रतिक्रिया पाइपलाइन जो जमीनी स्तर के डेटा को तुरंत केंद्रीकृत डैशबोर्ड तक पहुँचाती है।",
      how_step_1_title: "1. फील्ड संग्रह",
      how_step_1_desc: "स्वयंसेवक और कार्यकर्ता संकट क्षेत्र से सीधे ऑडियो, वीडियो या टेक्स्ट रिपोर्ट अपलोड करते हैं।",
      how_step_2_title: "2. AI निष्कर्षण",
      how_step_2_desc: "उन्नत NLP सटीक रूप से स्थान, मुख्य आवश्यकताएं, तात्कालिकता और प्रभावित जनसंख्या का विवरण निकालता है।",
      how_step_3_title: "3. लाइव प्रेषण",
      how_step_3_desc: "निर्देशांक स्वचालित रूप से मुख्य प्रेषण पैनल पर दिखाई देते हैं ताकि त्वरित सहायता भेजी जा सके।",
      section_who_for: "यह किसके लिए है?",
      who_field_workers: "फील्ड कार्यकर्ता",
      who_field_workers_desc: "बिना भारी फॉर्म भरे रिपोर्टिंग को सरल बनाएं। वॉयस ट्रांसक्रिप्शन समय बचाता है।",
      who_coordinators: "NGO समन्वयक",
      who_coordinators_desc: "तुरंत पूरी तस्वीर प्राप्त करें। देखें कि संसाधनों की सबसे अधिक आवश्यकता कहाँ है।",
      who_gov_teams: "सरकारी टीमें",
      who_gov_teams_desc: "NDRF या सैन्य बलों को कुशलतापूर्वक तैनात करने के लिए सभी एजेंसियों की जानकारी एक जगह देखें।",
      footer_credits: "CrisisGrid कमांड सेंटर © 2026. केवल आधिकारिक उपयोग के लिए।",
      dashboard_title: "CrisisGrid — लाइव संकट मानचित्र",
      response_overview: "प्रतिक्रिया अवलोकन",
      critical: "गंभीर",
      moderate: "मध्यम",
      low_risk: "कम जोखिम",
      top_hotspots: "🔥 मुख्य हॉटस्पॉट",
      connecting_feed: "लाइव फीड से जुड़ रहा है…",
      last_updated: "अपडेट किया गया:",
      active_reports: "सक्रिय रिपोर्ट",
      live: "लाइव",
      all: "सभी",
      low: "कम",
      submit_field_report: "📡 फील्ड रिपोर्ट जमा करें",
      submit_subtitle: "अपनी जमीनी संकट रिपोर्ट टाइप करें या बोलें। AI मानचित्र के लिए डेटा निकाल लेगा।",
      section_media: "📎 मीडिया अटैचमेंट",
      btn_photo: "फोटो लें",
      btn_video: "वीडियो रिकॉर्ड करें",
      btn_voice: "आवाज रिकॉर्ड करें",
      btn_upload: "फाइल अपलोड करें",
      attached_evidence: "संलग्न साक्ष्य",
      section_crisis_report: "📝 संकट रिपोर्ट",
      placeholder_report: "संकट का वर्णन करें, जैसे 'भारी बाढ़ के बाद कोल्हापुर में 50 परिवारों को भोजन और साफ पानी की जरूरत है...'",
      section_reporter_details: "🏢 रिपोर्टर विवरण",
      label_city: "शहर",
      label_state: "राज्य",
      label_country: "देश",
      label_reporter_name: "रिपोर्टर का नाम",
      label_ngo: "संस्था / NGO का नाम (वैकल्पिक)",
      ai_extracted_data: "✨ AI द्वारा निकाला गया डेटा",
      key_location: "स्थान",
      key_need: "आवश्यकता का प्रकार",
      key_urgency: "तात्कालिकता स्कोर",
      key_pop: "प्रभावित जनसंख्या",
      btn_submit_final: "रिपोर्ट जमा करें",
      btn_view_full_report: "पूरी रिपोर्ट देखें",
      all_reports_title: "📋 सभी फील्ड रिपोर्ट",
      recent_reports_title: "हाल की रिपोर्ट (नवीनतम पहले)",
      btn_all_reports: "सभी रिपोर्ट",
      btn_recent_reports: "हाल की रिपोर्ट",
      drawer_empty: "अभी कोई रिपोर्ट नहीं।",
      modal_details_title: "विस्तृत संकट रिपोर्ट",
      modal_reporter: "रिपोर्टर",
      modal_original_text: "मूल रिपोर्ट टेक्स्ट",
      modal_audio_note: "वॉयस नोट",
      filter_all: "सभी",
      filter_critical: "गंभीर",
      filter_moderate: "मध्यम",
      filter_low: "कम",
      select_country: "देश चुनें",
      settings_title: "सेटिंग्स",
      settings_theme: "थीम मोड",
      settings_lang: "भाषा",
      theme_light: "लाइट",
      theme_dark: "डार्क",
      lang_en: "English",
      lang_hi: "हिन्दी",
      toast_success: "रिपोर्ट सफलतापूर्वक जमा हुई!",
      toast_error: "रिपोर्ट की प्रक्रिया में त्रुटि।",
      map_view_live: "लाइव मैप देखें →"
    }
  };

  const i18n = {
    currentLang: localStorage.getItem('lang') || 'en',
    
    t(key) {
      return translations[this.currentLang][key] || key;
    },

    setLanguage(lang) {
      if (!translations[lang]) return;
      this.currentLang = lang;
      localStorage.setItem('lang', lang);
      document.documentElement.setAttribute('lang', lang);
      this.updateDOM();
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    },

    updateDOM() {
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = this.t(key);
        
        // Handle placeholders and other attributes
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', translation);
          } else {
            el.textContent = translation;
          }
        } else {
          el.textContent = translation;
        }
      });

      // Update titles
      const titleKey = document.querySelector('title').getAttribute('data-i18n');
      if (titleKey) document.title = this.t(titleKey);
    }
  };

  // Expose to window
  window.i18n = i18n;

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    i18n.updateDOM();
  });

})();
