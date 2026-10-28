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
  await page.goto('/confirmed');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
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
