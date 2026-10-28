// Runs the home page diagrams. A diagram is any element with data-play="<loop ms>".
// Each piece inside it with data-at="<ms>" gets the class "on" that far into the
// loop. When the loop ends the diagram fades out (class "rewind") and starts over.
//
// The CSS hides a piece only while its diagram has the class "armed", and only this
// script adds it. So with JavaScript off, or with reduced motion asked for, every
// diagram is simply its finished picture. A diagram plays only while it's on screen;
// scrolled away, it snaps back to the finished picture.

const FADE_MS = 500;

function diagram(root: HTMLElement) {
  const loopMs = Number(root.dataset.play) || 8000;
  const pieces = Array.from(root.querySelectorAll<HTMLElement>('[data-at]'), (el) => ({
    el,
    at: Number(el.dataset.at) || 0,
  }));
  let timers: number[] = [];
  const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const cancel = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  function start() {
    cancel();
    root.classList.remove('rewind');
    for (const { el } of pieces) el.classList.remove('on');
    root.classList.add('armed');
    for (const { el, at } of pieces) after(at, () => el.classList.add('on'));
    after(loopMs, () => {
      root.classList.add('rewind');
      after(FADE_MS, start);
    });
  }

  function finish() {
    cancel();
    root.classList.remove('armed', 'rewind');
    for (const { el } of pieces) el.classList.add('on');
  }

  return { start, finish };
}

export function play() {
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) return;
  const roots = document.querySelectorAll<HTMLElement>('[data-play]');
  if (!roots.length) return;
  const players = new Map<Element, ReturnType<typeof diagram>>();
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const p = players.get(entry.target);
        if (entry.isIntersecting) p?.start();
        else p?.finish();
      }
    },
    { threshold: 0.35 },
  );
  for (const root of roots) {
    players.set(root, diagram(root));
    watcher.observe(root);
  }
  // Reduced motion switched on mid-visit: stop everything on the finished picture.
  still.addEventListener('change', () => {
    if (!still.matches) return;
    watcher.disconnect();
    for (const p of players.values()) p.finish();
  });
}
