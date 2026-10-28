// Runs inline in <head>, before first paint, so a saved light theme never flashes dark.
// Base.astro inlines initTheme's compiled source, so it must not reference anything
// outside its own body. Without JS, <html> has no data-theme: the page stays dark and
// the CSS hides the toggle, which couldn't do anything.
export function initTheme() {
  const root = document.documentElement;
  const read = () => {
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  };
  const sync = () => {
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-pressed', String(root.dataset.theme === 'light'));
    }
  };
  root.dataset.theme = read() === 'light' ? 'light' : 'dark';
  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-theme-toggle]')) return;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private windows can refuse storage; the theme still applies to this page.
    }
    sync();
  });
}
