// The home hero's moving background: streaks of light riding the rows of the 64 px
// grid behind the headline, each with a fading tail and a glowing head.
//
// It only runs while it can be seen: a hidden tab or a hero scrolled off screen
// schedules no frames. Under reduced motion it draws one still frame and never
// starts the loop. Every frame, the areas behind `keepClear` (the copy) are erased
// with a soft edge, so no streak ever runs through text. Returns a function that
// stops it for good.
import { GRID, laneCount, rgba } from '../lib/field';

// Room kept around the copy, and how far the erased edge fades, in CSS px.
const CLEAR_PAD = 20;
const CLEAR_FEATHER = 28;
// Speeds are in px per frame at 60 fps; faster screens take smaller steps.
const FRAME_MS = 1000 / 60;

interface Streak {
  x: number; // the head; the tail trails `len` px to its left
  y: number;
  len: number;
  v: number;
  a: number;
}

export function startField(canvas: HTMLCanvasElement, keepClear: Element[] = []): () => void {
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas').getContext('2d');
  if (!ctx || !mask) return () => {};
  // The colours come from the tokens. The canvas normalises each to #rrggbb, and a
  // value it can't read leaves the fallback in place.
  const css = getComputedStyle(canvas);
  const token = (name: string, fallback: string) => {
    ctx.fillStyle = fallback;
    ctx.fillStyle = css.getPropertyValue(name).trim() || fallback;
    return String(ctx.fillStyle);
  };
  const blue = token('--c-blue', '#3da9ff');
  const soft = token('--c-blue-soft', '#bfe2ff');
  const tail = [rgba(blue, 0), rgba(blue, 0.7), rgba(soft, 1)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let w = 0;
  let h = 0;
  let streaks: Streak[] = [];
  let raf = 0;
  let last = 0;
  // The observer says so within a frame of starting.
  let onScreen = false;

  const lane = () => (1 + Math.floor(Math.random() * laneCount(h))) * GRID + 0.5;
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
      const from = s.x - s.len;
      const g = ctx.createLinearGradient(from, 0, s.x, 0);
      g.addColorStop(0, tail[0]);
      g.addColorStop(0.85, tail[1]);
      g.addColorStop(1, tail[2]);
      ctx.globalAlpha = s.a;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(from, s.y);
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
    // Wipe what landed behind the copy, in device pixels.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(mask.canvas, 0, 0);
    ctx.restore();
  };

  // A solid block over each kept-clear box, its shadow the soft edge. Built once per
  // resize, then stamped out of every frame.
  const buildMask = (dpr: number) => {
    mask.canvas.width = canvas.width;
    mask.canvas.height = canvas.height;
    mask.setTransform(dpr, 0, 0, dpr, 0, 0);
    mask.fillStyle = mask.shadowColor = '#000';
    mask.shadowBlur = CLEAR_FEATHER * dpr;
    const c = canvas.getBoundingClientRect();
    for (const el of keepClear) {
      const r = el.getBoundingClientRect();
      mask.fillRect(r.left - c.left - CLEAR_PAD, r.top - c.top - CLEAR_PAD, r.width + 2 * CLEAR_PAD, r.height + 2 * CLEAR_PAD);
    }
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildMask(dpr);
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
  // The copy can change height on its own, when a web font arrives.
  for (const el of keepClear) sizes.observe(el);
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
