import type { Page } from '@playwright/test';

// What runs past either edge of the viewport. body has `overflow-x: clip`, so
// documentElement.scrollWidth never grows: a line too wide for a phone is cut off,
// not scrolled. So measure the boxes themselves, elements and text alike, and skip
// anything inside a box that clips or scrolls on its own (a code block, the tab row,
// a decorative backdrop), since that content is reachable or meant to be cut.
export const overflowing = (page: Page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const clipped = (el: Element | null): boolean => {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return true;
      }
      return false;
    };
    const out = (r: DOMRect) => r.width > 0 && r.height > 0 && (r.right > width + 1 || r.left < -1);
    const found: string[] = [];
    const name = (el: Element) => el.tagName.toLowerCase() + (el.className ? `.${String(el.className).trim().split(/\s+/).join('.')}` : '');
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.checkVisibility() || clipped(el.parentElement) || getComputedStyle(el).position === 'fixed') continue;
      if (out(el.getBoundingClientRect())) found.push(name(el));
    }
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || !el.checkVisibility() || clipped(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      if ([...range.getClientRects()].some(out)) found.push(`"${n.textContent.trim().slice(0, 40)}" in ${name(el)}`);
    }
    return found;
  });
