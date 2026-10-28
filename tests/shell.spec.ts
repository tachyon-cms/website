import { expect, test } from '@playwright/test';

const pages = ['/', '/404', '/check-your-inbox', '/confirmed', '/link-expired', '/signup-problem'];

for (const path of pages) {
  test(`${path} has one h1, a skip link and a title`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('a.skip[href="#main"]')).toHaveCount(1);
    await expect(page.locator('main#main')).toHaveCount(1);
    expect(await page.title()).not.toBe('');
  });
}

test('the theme toggle switches to light and remembers it', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
  await page.locator('[data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#faf8ff');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
  await page.goto('/confirmed');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // A saved theme applies to the browser chrome before first paint too.
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#faf8ff');
  await page.locator('[data-theme-toggle]').click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#07060c');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page renders dark and hides nothing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(7, 6, 12)');
    for (const el of ['header', 'main', 'footer', 'form.signup']) await expect(page.locator(el).first()).toBeVisible();
  });
});

test('the signup form posts to /api/subscribe with a Turnstile slot', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('form.signup');
  await expect(form).toHaveAttribute('action', '/api/subscribe');
  await expect(form).toHaveAttribute('method', 'post');
  await expect(form.locator('.cf-turnstile[data-sitekey]')).toHaveCount(1);
  await expect(form.getByLabel('Tell me when it launches')).toHaveAttribute('name', 'email');
});

test('the CSP lets Turnstile load', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  expect(csp).toMatch(/frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  expect(csp).not.toContain("'unsafe-inline'");
});

test('the header links the GitHub repo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header a[href="https://github.com/tachyon-cms/tachyoncms"]')).toHaveCount(1);
});

test('the footer lists every contact address and the theme toggle', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  for (const box of ['hello', 'security', 'conduct', 'legal', 'sponsors']) {
    await expect(footer.locator(`a[href="mailto:${box}@tachyoncms.com"]`)).toHaveCount(1);
  }
  await expect(footer.locator('[data-theme-toggle]')).toBeVisible();
});

test.describe('at phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of pages) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});

test('the main nav marks no page current on the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav[aria-label="Main"] [aria-current]')).toHaveCount(0);
});

test('signup.js loads once and binds every signup form', async ({ page }) => {
  // No page has two forms yet, so serve the home page with its form doubled.
  await page.route('**/', async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace(/<form class="signup[\s\S]*?<\/form>/, (form) => form + form);
    await route.fulfill({ response: res, body: html });
  });
  const turnstile = page.waitForRequest(/challenges\.cloudflare\.com\/turnstile/);
  await page.goto('/');
  await expect(page.locator('script[src="/signup.js"]')).toHaveCount(1);
  await expect(page.locator('form.signup')).toHaveCount(2);
  await page.route(/challenges\.cloudflare\.com/, (route) => route.abort());
  await page.locator('form.signup').nth(1).locator('input[type="email"]').focus();
  await turnstile;
});
