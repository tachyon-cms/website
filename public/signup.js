// Loads Cloudflare's bot check only once someone starts on the form, so the page itself
// stays light. Submitting waits for the check to finish.
const form = document.querySelector('form.signup');
const slot = form?.querySelector('.cf-turnstile');
let ready = null;

function load() {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    window.onTurnstileLoad = () => {
      window.turnstile.render(slot, {
        sitekey: slot.dataset.sitekey,
        theme: 'dark',
        appearance: 'interaction-only',
        callback: resolve,
      });
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    script.async = true;
    document.head.append(script);
  });
  return ready;
}

if (form && slot) {
  form.addEventListener('focusin', load, { once: true });
  form.addEventListener('pointerdown', load, { once: true });
  form.addEventListener('submit', (event) => {
    if (form.querySelector('[name="cf-turnstile-response"]')?.value) return;
    event.preventDefault();
    load().then(() => form.requestSubmit());
  });
}
