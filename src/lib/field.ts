// The arithmetic behind the home hero's field (src/scripts/field.ts), kept free of
// the DOM so it can be tested.

/** The grid the streaks ride, in CSS px. Matches the hero's background-size. */
export const GRID = 64;

/** How many grid rows a streak can ride in a canvas `h` px tall. Row 0 is the top
 * edge and a row at exactly `h` would be the bottom border, so neither counts. */
export const laneCount = (h: number) => Math.max(1, Math.floor((h - 1) / GRID));

const FALLBACK = [61, 169, 255]; // --c-blue

/** An rgba() string for a token colour at alpha `a`. Takes #rrggbb or rgb(r, g, b),
 * which is what a canvas normalises a colour to; anything else falls back to blue. */
export function rgba(color: string, a: number) {
  const c = color.trim();
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);
  const rgb = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(c);
  const [r, g, b] = hex ? hex.slice(1).map((h) => parseInt(h, 16)) : rgb ? rgb.slice(1).map(Number) : FALLBACK;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
