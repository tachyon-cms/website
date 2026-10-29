// Loads Cloudflare's bot check only once someone starts on a form, so the page itself
// stays light. Submitting waits for the check to finish. Binds every form.signup on the
// page; Turnstile's script loads once and renders one widget per form.
let api = null;

function turnstile() {
  api ??= new Promise((resolve) => {
    window.onTurnstileLoad = () => resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    script.async = true;
    document.head.append(script);
  });
  return api;
}

for (const form of document.querySelectorAll('form.signup')) {
  const slot = form.querySelector('.cf-turnstile');
  if (!slot) continue;
  let ready = null;
  const load = () =>
    (ready ??= turnstile().then(
      (ts) =>
        new Promise((resolve) => {
          ts.render(slot, {
            sitekey: slot.dataset.sitekey,
            // Matches the theme at render time. A later toggle leaves it: the widget is
            // interaction-only, so it rarely shows, and re-rendering would drop a solved check.
            theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
            appearance: 'interaction-only',
            callback: resolve,
          });
        }),
    ));
  form.addEventListener('focusin', load, { once: true });
  form.addEventListener('pointerdown', load, { once: true });
  form.addEventListener('submit', (event) => {
    if (form.querySelector('[name="cf-turnstile-response"]')?.value) return;
    event.preventDefault();
    load().then(() => form.requestSubmit());
  });
}
