// Runs inline in <head>, before first paint, so a saved light theme never flashes dark.
// Base.astro inlines initTheme's compiled source, so it must not reference anything
// outside its own body. Without JS, <html> has no data-theme: the page stays dark and
// the CSS hides the toggle, which couldn't do anything.
export function initTheme() {
  const root = document.documentElement;
  // --c-bg for each theme in src/brand/tokens.css, for the browser's own chrome.
  const chrome = { dark: '#07060c', light: '#faf8ff' };
  const apply = (theme: 'dark' | 'light') => {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chrome[theme]);
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-pressed', String(theme === 'light'));
    }
  };
  let saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {
    // Storage can be blocked; dark is the default.
  }
  apply(saved === 'light' ? 'light' : 'dark');
  // The toggle buttons don't exist yet at this point in <head>.
  document.addEventListener('DOMContentLoaded', () => apply(root.dataset.theme === 'light' ? 'light' : 'dark'));
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-theme-toggle]')) return;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private windows can refuse storage; the theme still applies to this page.
    }
  });
}
