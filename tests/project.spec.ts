import { expect, test } from '@playwright/test';
import { overflowing } from './fit';

const discussions = 'https://github.com/tachyon-cms/tachyoncms/discussions';
const pages = ['/roadmap', '/releases', '/community', '/starters', '/faq', '/brand', '/privacy', '/trademark'];

for (const path of pages) {
  test(`${path} has one h1 and a title`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.title()).toMatch(/· TachyonCMS$/);
  });
}

for (const width of [320, 390]) {
  test(`project pages fit a ${width} px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of pages) {
      await page.goto(path);
      expect(await overflowing(page), path).toEqual([]);
    }
  });
}

test('the roadmap links the discussion it mirrors and both polls', async ({ page }) => {
  await page.goto('/roadmap');
  for (const n of [35, 38, 39]) await expect(page.locator(`main a[href="${discussions}/${n}"]`).first()).toBeVisible();
  await expect(page.locator('main ol li').first()).toContainText('Rich text and blocks');
});

test('releases shows the v0.1.0 notes, rendered from Markdown', async ({ page }) => {
  await page.goto('/releases');
  await expect(page.locator('main h2', { hasText: 'v0.1.0' })).toBeVisible();
  await expect(page.locator('main h3', { hasText: 'Verify a download' })).toBeVisible();
  await expect(page.locator('main pre code')).toContainText('cosign verify-blob');
  // Once beside the date, and again after the notes, where a reader who got to the end looks.
  await expect(page.locator('main a[href="https://github.com/tachyon-cms/tachyoncms/releases/tag/v0.1.0"]')).toHaveCount(2);
});

test('community lists contributors and the no-CLA promise', async ({ page }) => {
  await page.goto('/community');
  await expect(page.locator('main a[href="https://github.com/jamesconwaydev"]')).toBeVisible();
  await expect(page.locator('main')).toContainText('No CLA, ever');
});

test('starters is headed and points at the front-end poll', async ({ page }) => {
  await page.goto('/starters');
  await expect(page.locator('.page-hero').getByText('On the roadmap', { exact: true })).toBeVisible();
  await expect(page.locator(`main a[href="${discussions}/38"]`).first()).toBeVisible();
});

test('the FAQ answers the questions people ask first', async ({ page }) => {
  await page.goto('/faq');
  const questions = await page.locator('main h2').allTextContents();
  for (const q of ['Is it production ready?', "What's the license?", 'Do I have to sign a CLA to contribute?', 'How do I report a security issue?', "Where's the admin?"]) {
    expect(questions).toContain(q);
  }
  await expect(page.locator('main')).toContainText('pre-alpha');
  await expect(page.locator('main a[href="mailto:security@tachyoncms.com"]').first()).toBeVisible();
});

test('brand offers every logo file as a download', async ({ page }) => {
  await page.goto('/brand');
  for (const file of ['logo.svg', 'mark.svg', 'avatar-1024.png']) {
    await expect(page.locator(`main a[href="/brand/${file}"][download]`)).toHaveCount(1);
  }
  await expect(page.locator('main')).toContainText('Inter');
  await expect(page.locator('main')).toContainText('Geist Mono');
});

test('brand sizes each logo preview to the file it shows', async ({ page }) => {
  await page.goto('/brand');
  // The page's own wrapper isn't a .brand: that's the header's link.
  await expect(page.locator('main .brand')).toHaveCount(0);
  for (const img of await page.locator('main .tile img').all()) {
    const src = (await img.getAttribute('src'))!;
    const attrs = [await img.getAttribute('width'), await img.getAttribute('height')].map(Number);
    // An SVG's size is its viewBox; a PNG's is its pixels.
    const natural = src.endsWith('.svg')
      ? (await (await page.request.get(src)).text()).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.slice(1).map(Number)
      : await img.evaluate(async (el: HTMLImageElement) => (await el.decode(), [el.naturalWidth, el.naturalHeight]));
    expect(attrs, src).toEqual(natural);
  }
});

test('privacy names what the signup sends where', async ({ page }) => {
  await page.goto('/privacy');
  for (const text of ['Turnstile', 'Resend', 'no cookies', 'local storage', 'Cloudflare']) {
    await expect(page.locator('main')).toContainText(text);
  }
});

test('trademark sends questions to legal@', async ({ page }) => {
  await page.goto('/trademark');
  await expect(page.locator('main a[href="mailto:legal@tachyoncms.com"]')).toBeVisible();
});
