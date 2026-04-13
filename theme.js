(function() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    // Initial state icon
    btn.innerHTML = savedTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      btn.innerHTML = next === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      
      // Notify map to swap tiles
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: next }));
    });
  });
})();
