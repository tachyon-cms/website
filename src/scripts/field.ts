// The home hero's moving background: streaks of light riding the rows of the 64 px
// grid behind the headline, each with a fading tail and a glowing head.
//
// It only runs while it can be seen: a hidden tab or a hero scrolled off screen
// schedules no frames. Under reduced motion it draws one still frame and never
// starts the loop. Returns a function that stops it for good.

const GRID = 64;
// Speeds are in px per frame at 60 fps; faster screens take smaller steps.
const FRAME_MS = 1000 / 60;

interface Streak {
  x: number; // the head; the tail trails `len` px to its left
  y: number;
  len: number;
  v: number;
  a: number;
}

export function startField(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  // The colours come from the tokens; a 6-digit hex takes an alpha suffix.
  const css = getComputedStyle(canvas);
  const blue = css.getPropertyValue('--c-blue').trim() || '#3da9ff';
  const soft = css.getPropertyValue('--c-blue-soft').trim() || '#bfe2ff';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let w = 0;
  let h = 0;
  let streaks: Streak[] = [];
  let raf = 0;
  let last = 0;
  // The observer says so within a frame of starting.
  let onScreen = false;

  const lane = () => (1 + Math.floor(Math.random() * Math.max(1, Math.ceil(h / GRID) - 1))) * GRID + 0.5;
  // Scattered across the canvas at the start; afterwards, waiting off the left edge.
  const spawn = (scatter: boolean): Streak => {
    const len = 80 + Math.random() * 220;
    return {
      x: scatter ? Math.random() * w : -Math.random() * w * 0.6,
      y: lane(),
      len,
      v: 6 + Math.random() * 14,
      a: 0.25 + Math.random() * 0.6,
    };
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const s of streaks) {
      const tail = s.x - s.len;
      const g = ctx.createLinearGradient(tail, 0, s.x, 0);
      g.addColorStop(0, `${blue}00`);
      g.addColorStop(0.85, `${blue}b3`);
      g.addColorStop(1, soft);
      ctx.globalAlpha = s.a;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tail, s.y);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.fillStyle = soft;
      ctx.shadowColor = blue;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(w / 45);
    streaks = streaks.slice(0, count).map((s) => (s.y > h ? spawn(true) : s));
    while (streaks.length < count) streaks.push(spawn(true));
    // Resizing wipes the canvas; a paused field keeps its still frame.
    if (!raf) draw();
  };

  const frame = (t: number) => {
    const steps = last ? Math.min((t - last) / FRAME_MS, 3) : 1;
    last = t;
    for (const s of streaks) {
      s.x += s.v * steps;
      if (s.x - s.len > w) Object.assign(s, spawn(false));
    }
    draw();
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const run = onScreen && !document.hidden && !reduce.matches;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  resize();
  canvas.classList.add('on');
  const sizes = new ResizeObserver(resize);
  sizes.observe(canvas);
  const seen = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  seen.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);

  return () => {
    onScreen = false;
    sync();
    sizes.disconnect();
    seen.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduce.removeEventListener('change', sync);
  };
}
