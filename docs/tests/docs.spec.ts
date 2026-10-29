import { expect, test } from '@playwright/test';
import { overflowing } from '../../tests/fit';

const topics = [
  { label: 'Docs', link: '/' },
  { label: 'Tutorials', link: '/tutorials' },
  { label: 'Reference', link: '/reference' },
  { label: 'CLI', link: '/cli' },
];

const tabs = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Topics' });

test('each topic tab links to its topic root', async ({ page }) => {
  await page.goto('/');
  for (const { label, link } of topics) {
    await expect(tabs(page).getByRole('link', { name: label, exact: true })).toHaveAttribute('href', link);
  }
});

test('the header links back to the website and to GitHub', async ({ page }) => {
  await page.goto('/reference');
  await expect(page.locator('header').getByRole('link', { name: 'tachyoncms.com', exact: true })).toHaveAttribute(
    'href',
    'https://tachyoncms.com',
  );
  await expect(page.locator('header').getByRole('link', { name: 'TachyonCMS on GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/tachyon-cms/tachyoncms',
  );
});

for (const { label, link } of topics) {
  test(`the ${label} tab is the current one on ${link}`, async ({ page }) => {
    await page.goto(link);
    await expect(tabs(page).locator('[aria-current]')).toHaveCount(1);
    await expect(tabs(page).getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  });
}

test('a page under /reference shows only the Reference sidebar', async ({ page }) => {
  await page.goto('/reference');
  const hrefs = await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href).toMatch(/^\/reference(\/|$)/);
});

test('a nested Docs page marks the Docs tab current with aria-current="true"', async ({ page }) => {
  await page.goto('/deploy/docker');
  await expect(tabs(page).locator('[aria-current]')).toHaveCount(1);
  await expect(tabs(page).getByRole('link', { name: 'Docs', exact: true })).toHaveAttribute('aria-current', 'true');
});

test('a nested Docs page shows only the Docs sidebar', async ({ page }) => {
  await page.goto('/deploy/docker');
  const sidebar = page.getByRole('navigation', { name: 'Main' });
  const hrefs = await sidebar.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs).toContain('/deploy/docker');
  expect(hrefs).toContain('/access-rules');
  for (const href of hrefs) expect(href).not.toMatch(/^\/(tutorials|reference|cli)(\/|$)/);
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute('href', '/deploy/docker');
});

test('a tutorial marks the Tutorials tab current and shows only the Tutorials sidebar', async ({ page }) => {
  await page.goto('/tutorials/build-a-blog');
  await expect(tabs(page).locator('[aria-current]')).toHaveCount(1);
  await expect(tabs(page).getByRole('link', { name: 'Tutorials', exact: true })).toHaveAttribute('aria-current', 'true');
  const sidebar = page.getByRole('navigation', { name: 'Main' });
  const hrefs = await sidebar.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(['/tutorials', '/tutorials/build-a-blog']);
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute('href', '/tutorials/build-a-blog');
});

test('a reference page marks the Reference tab current and shows only the Reference sidebar', async ({ page }) => {
  await page.goto('/reference/http-api');
  await expect(tabs(page).locator('[aria-current]')).toHaveCount(1);
  await expect(tabs(page).getByRole('link', { name: 'Reference', exact: true })).toHaveAttribute('aria-current', 'true');
  const sidebar = page.getByRole('navigation', { name: 'Main' });
  const hrefs = await sidebar.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual([
    '/reference',
    '/reference/http-api',
    '/reference/http-api/auth',
    '/reference/http-api/users-and-roles',
    '/reference/http-api/collections',
    '/reference/http-api/documents',
    '/reference/field-types',
    '/reference/filters',
    '/reference/config',
    '/reference/errors',
  ]);
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute('href', '/reference/http-api');
});

test('a generated CLI page marks the CLI tab current and lists every command in the CLI sidebar', async ({ page }) => {
  await page.goto('/cli/tachyon-schema-diff');
  await expect(tabs(page).locator('[aria-current]')).toHaveCount(1);
  await expect(tabs(page).getByRole('link', { name: 'CLI', exact: true })).toHaveAttribute('aria-current', 'true');
  const sidebar = page.getByRole('navigation', { name: 'Main' });
  const hrefs = await sidebar.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual([
    '/cli',
    '/cli/tachyon',
    '/cli/tachyon-serve',
    '/cli/tachyon-migrate',
    '/cli/tachyon-schema',
    '/cli/tachyon-schema-export',
    '/cli/tachyon-schema-diff',
    '/cli/tachyon-schema-apply',
  ]);
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute('href', '/cli/tachyon-schema-diff');
  await expect(page.locator('pre').first()).toContainText('Usage: tachyon schema diff [OPTIONS] <FILE>');
});

test('search opens with Cmd/Ctrl+K', async ({ page }) => {
  await page.goto('/');
  // The shortcut is wired up by a module script; wait for it before pressing.
  await page.waitForLoadState('load');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('search loads its UI only when asked, then finds pages', async ({ page }) => {
  const ui: string[] = [];
  page.on('request', (r) => r.url().includes('/ui-core.') && ui.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  expect(ui).toEqual([]);
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: 'Search' })).toBeFocused();
  await dialog.getByRole('textbox', { name: 'Search' }).fill('access rules');
  await expect(dialog.getByRole('link', { name: /access rules/i }).first()).toBeVisible();
  expect(ui).toHaveLength(1);
});

test('"Edit page" points at the website repo', async ({ page }) => {
  await page.goto('/reference');
  await expect(page.getByRole('link', { name: /edit page/i })).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/tachyon-cms\/website\/edit\/main\/docs\//,
  );
});

test('the docs are dark only, even with the OS and a stored choice set to light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('starlight-theme', 'light'));
  for (const link of ['/', '/cli', '/access-rules']) {
    await page.goto(link);
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('starlight-theme-select, [data-theme-toggle]')).toHaveCount(0);
    const bg = await page.evaluate(() =>
      [document.documentElement, document.body].map((el) => getComputedStyle(el).backgroundColor),
    );
    expect(bg, link).toEqual(['rgb(12, 13, 13)', 'rgb(12, 13, 13)']);
  }
  // Code blocks sit on the panel colour in the one dark theme, whatever the OS asks for.
  await expect(page.locator('.expressive-code pre').first()).toHaveCSS('background-color', 'rgb(17, 19, 21)');
});

test('code blocks ship one dark theme, with nothing to switch to', async ({ page }) => {
  await page.goto('/access-rules');
  const themed = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((s) => [...s.cssRules].map((r) => r.cssText))
      .filter((t) => t.includes('.expressive-code') && /prefers-color-scheme|data-theme="light"/.test(t)),
  );
  expect(themed).toEqual([]);
});

test('the header carries the mark and the wordmark, like the site header', async ({ page }) => {
  await page.goto('/reference');
  const brand = page.locator('header a.brand');
  await expect(brand).toHaveAttribute('href', '/');
  await expect(brand).toHaveText('TachyonCMS');
  await expect(brand.locator('svg.mark .stroke')).toHaveCount(3);
  // The old <img> logo is gone: the mark is inline so it can draw itself in.
  await expect(page.locator('header img')).toHaveCount(0);
  await expect(page.locator('header').getByRole('button', { name: /search/i })).toBeVisible();
});

test('the header mark draws itself in on load, and pointing at it replays the draw', async ({ page }) => {
  await page.goto('/');
  const mark = page.locator('header .brand .mark');
  await expect(mark).toHaveClass(/\bdraw\b/);
  await expect(page.locator('html')).not.toHaveClass(/\bmark-pending\b/);
  const stroke = mark.locator('.stroke').first();
  await expect.poll(() => stroke.evaluate((p) => getComputedStyle(p).strokeDashoffset)).toBe('0px');
  await page.evaluate(() => {
    (window as any).draws = 0;
    addEventListener('animationstart', (e) => e.animationName.endsWith('mark-draw') && (window as any).draws++);
  });
  await page.locator('header .brand').hover();
  await expect.poll(() => page.evaluate(() => (window as any).draws)).toBe(3);
});

test('with reduced motion the header mark is drawn from the start', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest('.mark')).length,
  );
  expect(running).toBe(0);
  const offsets = await page
    .locator('header .brand .mark .stroke')
    .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).strokeDashoffset));
  expect(offsets).toEqual(['0px', '0px', '0px']);
});

test('the docs preload Inter 400 and 600 and Geist Mono 400, and nothing else', async ({ page }) => {
  await page.goto('/access-rules');
  const preloads = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll((ls) => ls.map((l) => new URL((l as HTMLLinkElement).href).pathname));
  const faces = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((s) => [...s.cssRules])
      .filter((r) => r instanceof CSSFontFaceRule)
      .map((r) => ({
        family: r.style.getPropertyValue('font-family').replace(/"/g, ''),
        weight: r.style.getPropertyValue('font-weight'),
        src: r.style.getPropertyValue('src'),
      })),
  );
  const preloaded = (family: string) =>
    faces
      .filter((f) => f.family.startsWith(family) && !f.family.includes('fallback') && preloads.some((p) => f.src.includes(p)))
      .map((f) => f.weight)
      .sort();
  expect(preloaded('Inter')).toEqual(['400', '600']);
  expect(preloaded('Geist Mono')).toEqual(['400']);
  expect(preloads).toHaveLength(3);
});

// Only the preloaded faces: Inter 400 or 600 (headings, bold and table headers at 600)
// and Geist Mono 400. A 700 bold would fetch an unpreloaded face or be synthesised.
test('docs pages set type in the preloaded weights', async ({ page }) => {
  const found: string[] = [];
  for (const link of ['/', '/access-rules', '/reference/http-api', '/reference/field-types', '/cli/tachyon-schema-apply']) {
    await page.goto(link);
    const off = await page.locator('body').evaluate((body) =>
      [...body.querySelectorAll('*')]
        .filter((el) => el.checkVisibility() && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
        .map((el) => ({ el, css: getComputedStyle(el) }))
        .filter(({ css }) => {
          const family = css.fontFamily.split(',')[0];
          if (family.includes('Geist Mono')) return css.fontWeight !== '400';
          if (family.includes('Inter')) return !['400', '600'].includes(css.fontWeight);
          return true;
        })
        .map(({ el, css }) => `${el.tagName.toLowerCase()}.${el.className} ${css.fontFamily.split(',')[0]} ${css.fontWeight}`),
    );
    found.push(...[...new Set(off)].map((o) => `${link}: ${o}`));
  }
  expect(found).toEqual([]);
});

// 320 px is the WCAG reflow width; 390 is a common phone.
for (const width of [320, 390]) {
  test(`nothing runs off the side of a ${width} px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const link of [...topics.map((t) => t.link), '/access-rules', '/deploy/docker', '/tutorials/build-a-blog', '/reference/http-api', '/reference/http-api/documents', '/reference/field-types', '/reference/errors', '/cli/tachyon-schema-apply']) {
      await page.goto(link);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), link).toBeLessThanOrEqual(0);
      expect(await overflowing(page), link).toEqual([]);
    }
  });
}

test.describe('without JS', () => {
  test.use({ javaScriptEnabled: false });

  test('the page renders dark, with no theme picker', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('starlight-theme-select, [data-theme-toggle]')).toHaveCount(0);
  });

  test('the header mark is drawn', async ({ page }) => {
    await page.goto('/');
    const offsets = await page
      .locator('header .brand .mark .stroke')
      .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).strokeDashoffset));
    expect(offsets).toEqual(['0px', '0px', '0px']);
  });
});
