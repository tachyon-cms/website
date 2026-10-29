import { describe, expect, it } from 'vitest';
import { GRID, laneCount, rgba } from '../src/lib/field';

describe('the hero field', () => {
  it('builds rgba() stops from a hex or rgb() token', () => {
    expect(rgba('#3da9ff', 0.7)).toBe('rgba(61, 169, 255, 0.7)');
    expect(rgba('#3DA9FF', 0)).toBe('rgba(61, 169, 255, 0)');
    expect(rgba('rgb(191, 226, 255)', 1)).toBe('rgba(191, 226, 255, 1)');
  });

  it('falls back to the brand blue on a colour it cannot read', () => {
    for (const bad of ['', 'blue', '#3da', 'color-mix(in srgb, red, blue)']) {
      expect(rgba(bad, 0.5)).toBe('rgba(61, 169, 255, 0.5)');
    }
  });

  it('never puts a lane on the top or bottom edge', () => {
    expect(GRID).toBe(64);
    // Rows at 64..576; 640 is the bottom border.
    expect(laneCount(640)).toBe(9);
    expect(laneCount(641)).toBe(10);
    expect(laneCount(700)).toBe(10);
    // Always at least one lane, however short.
    expect(laneCount(30)).toBe(1);
  });
});
