(function() {
  "use strict";

  // Configuration mapping
  const THEMES = ['light', 'dark'];
  const LANGUAGES = ['en', 'hi'];

  function initSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const dropdown = document.getElementById('settings-dropdown');
    
    if (!settingsBtn || !dropdown) return;

    // Toggle dropdown
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    // Close on outside click
    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Handle Theme Selection
    const themeOpts = dropdown.querySelectorAll('[data-set-theme]');
    themeOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        const theme = opt.getAttribute('data-set-theme');
        setTheme(theme);
      });
    });

    // Handle Language Selection
    const langOpts = dropdown.querySelectorAll('[data-set-lang]');
    langOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        const lang = opt.getAttribute('data-set-lang');
        setLanguage(lang);
      });
    });

    // Initial sync
    syncSettingsUI();

    // Listen for external changes (e.g. theme.js or other tabs)
    window.addEventListener('themeChanged', syncSettingsUI);
    window.addEventListener('languageChanged', syncSettingsUI);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
  }

  function setLanguage(lang) {
    if (window.i18n) {
      window.i18n.setLanguage(lang);
    }
  }

  function syncSettingsUI() {
    const dropdown = document.getElementById('settings-dropdown');
    if (!dropdown) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const currentLang = localStorage.getItem('lang') || 'en';

    // Sync Theme Buttons
    dropdown.querySelectorAll('[data-set-theme]').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-set-theme') === currentTheme);
    });

    // Sync Language Buttons
    dropdown.querySelectorAll('[data-set-lang]').forEach(opt => {
      opt.classList.toggle('active', opt.getAttribute('data-set-lang') === currentLang);
    });
  }

  document.addEventListener('DOMContentLoaded', initSettings);

})();
