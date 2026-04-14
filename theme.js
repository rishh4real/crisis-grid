(function() {
  // 1. Immediate theme application to prevent flash
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('theme') || 'light';
  } catch (e) {
    console.warn('[CrisisGrid] LocalStorage disabled, theme will not persist.');
  }
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 2. Initialize all toggles on the page
  function initToggles() {
    // We bind to both .theme-toggle (new) and #theme-toggle (legacy compatible)
    const toggles = document.querySelectorAll('.theme-toggle, #theme-toggle');
    
    const updateAllButtons = (theme) => {
      toggles.forEach(btn => {
        btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      });
    };

    updateAllButtons(savedTheme);

    toggles.forEach(btn => {
      // Prevent multiple listeners if theme.js is loaded multiple times
      if (btn._themeBound) return;
      btn._themeBound = true;

      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem('theme', next);
        } catch (e) {}
        
        updateAllButtons(next);
        
        // Notify map and other components to sync
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: next }));
      });
    });
  }

  // Bind on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToggles);
  } else {
    initToggles();
  }

})();
