import { expect, test } from '@playwright/test';

const posts = ['/blog/v0-1-0', '/blog/where-tachyoncms-is-headed'];

test('/blog lists both launch posts and marks Blog in the nav', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('h1')).toHaveCount(1);
  for (const path of posts) await expect(page.locator(`main a[href="${path}"]`)).toBeVisible();
  await expect(page.locator('header nav a[href="/blog"]:visible')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main a[href="/rss.xml"]')).toBeVisible();
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(0);
});

test('the home page shows the latest posts', async ({ page }) => {
  await page.goto('/');
  for (const path of posts) await expect(page.locator(`#latest a[href="${path}"]`)).toBeVisible();
});

for (const path of posts) {
  test(`${path} has its card for social previews, an infographic and share links`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const slug = path.split('/').pop();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://tachyoncms.com/media/blog/${slug}/card.png`);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', '2026-10-28T00:00:00.000Z');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const card = await page.request.get(`/media/blog/${slug}/card.png`);
    expect(card.ok()).toBe(true);
    const infographic = page.locator(`main img[src="/media/blog/${slug}/infographic.png"]`);
    await expect(infographic).toHaveAttribute('alt', /.{40,}/);
    await expect(page.locator('a[href^="https://x.com/intent/post?url=https%3A%2F%2Ftachyoncms.com%2Fblog%2F"]')).toBeVisible();
    await expect(page.locator('a[href^="https://www.linkedin.com/sharing/share-offsite/"]')).toBeVisible();
  });
}

test('copy link puts the post URL on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(posts[0]);
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('status')).toHaveText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://tachyoncms.com/blog/v0-1-0');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('a post hides the copy button it could not run', async ({ page }) => {
    await page.goto(posts[0]);
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeHidden();
    await expect(page.locator('a[href^="https://x.com/intent/post"]')).toBeVisible();
  });
});

test('the blog fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/blog', ...posts]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
