import { expect, test } from '@playwright/test';

const pages = ['/', '/404', '/check-your-inbox', '/confirmed', '/link-expired', '/signup-problem'];

const productLinks = [
  '/product/content-modelling',
  '/product/querying',
  '/product/access-control',
  '/product/sign-in',
  '/product/schema-as-code',
  '/product/admin',
  '/security',
  '/why',
];

for (const path of pages) {
  test(`${path} has one h1, a skip link and a title`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('a.skip[href="#main"]')).toHaveCount(1);
    await expect(page.locator('main#main')).toHaveCount(1);
    expect(await page.title()).not.toBe('');
  });
}

test('the site is dark only, whatever the OS or a stored choice says', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  // The old toggle's key: a returning visitor may still have it.
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0c0d0d');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  await expect(page.locator('[data-theme-toggle]')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(12, 13, 13)');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the Product menu opens and its links are reachable', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('nav[aria-label="Main"] details');
    await menu.locator('summary').click();
    for (const href of productLinks) await expect(menu.locator(`a[href="${href}"]`)).toBeVisible();
  });

  test('the mark is drawn', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
    const offsets = await page
      .locator('header .brand .mark .stroke')
      .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).strokeDashoffset));
    expect(offsets).toEqual(['0px', '0px', '0px']);
  });

  test('the page renders dark and hides nothing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(12, 13, 13)');
    for (const el of ['header', 'main', 'footer', 'form.signup']) await expect(page.locator(el).first()).toBeVisible();
  });
});

test('the signup form posts to /api/subscribe with a Turnstile slot', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('form.signup');
  await expect(form).toHaveAttribute('action', '/api/subscribe');
  await expect(form).toHaveAttribute('method', 'post');
  await expect(form.locator('.cf-turnstile[data-sitekey]')).toHaveCount(1);
  await expect(form.getByLabel('Tell me when the admin is ready')).toHaveAttribute('name', 'email');
});

test('the CSP lets Turnstile load', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  expect(csp).toMatch(/frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  expect(csp).not.toContain("'unsafe-inline'");
});

test('the logo and post media may be embedded elsewhere; nothing else may', async ({ request }) => {
  const corp = async (path: string) => {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    return res.headers()['cross-origin-resource-policy'];
  };
  // Exactly one value: Cloudflare joins a header set by two matching rules.
  expect(await corp('/brand/logo.svg')).toBe('cross-origin');
  expect(await corp('/media/blog/v0-1-0/card.png')).toBe('cross-origin');
  expect(await corp('/')).toBe('same-origin');
  expect(await corp('/brand')).toBe('same-origin');
  // The narrower rules add to /*, so the rest of the headers still apply.
  const logo = (await request.get('/brand/logo.svg')).headers();
  expect(logo['x-content-type-options']).toBe('nosniff');
  expect(logo['content-security-policy']).toContain("default-src 'self'");
});

test('the header links the GitHub repo and Get started', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header a[href="https://github.com/tachyon-cms/tachyoncms"]:visible')).toHaveCount(1);
  await expect(page.locator('header a.cta')).toHaveAttribute('href', 'https://docs.tachyoncms.com/install');
  await expect(page.locator('header a.cta')).toHaveText('Get started');
});

test('the announcement bar names the latest release and links its notes', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.announce');
  await expect(bar).toContainText(/v\d+\.\d+\.\d+ is out\./);
  await expect(bar.getByRole('link', { name: 'Read the release notes' })).toHaveAttribute('href', '/releases');
});

test('the header stays at the top on scroll', async ({ page }) => {
  await page.goto('/');
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  const header = page.locator('header.site-header');
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(0);
  await expect(header).toBeInViewport();
});


test('Tab reaches every item in the Product menu, and Escape closes it', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('nav[aria-label="Main"] details');
  const summary = menu.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  for (const href of productLinks) {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('href', href);
  }
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open');
  await expect(summary).toBeFocused();
});

test('the Product menu closes when you click elsewhere', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('nav[aria-label="Main"] details');
  await menu.locator('summary').click();
  await expect(menu).toHaveAttribute('open', '');
  await page.mouse.click(8, 700);
  await expect(menu).not.toHaveAttribute('open');
});

test('aria-current marks the current link, and only that one', async ({ page }) => {
  await page.goto('/product/querying');
  const nav = page.locator('nav[aria-label="Main"]:visible');
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('a[href="/product/querying"]')).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator('summary')).toHaveClass(/\bcurrent\b/);
  await page.goto('/compare');
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('a[href="/compare"]')).toHaveAttribute('aria-current', 'page');
  await expect(nav.locator('summary')).not.toHaveClass(/\bcurrent\b/);
});

test('the footer lists every contact address and has no theme toggle', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  for (const box of ['hello', 'security', 'conduct', 'legal', 'sponsors']) {
    await expect(footer.locator(`a[href="mailto:${box}@tachyoncms.com"]`)).toHaveCount(1);
  }
  await expect(footer.locator('[data-theme-toggle], button')).toHaveCount(0);
});

test.describe('at phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the desktop links hide and the menu button shows', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header .links')).toBeHidden();
    await expect(page.locator('header details.mobile summary')).toBeVisible();
    await expect(page.locator('header a.cta')).toBeVisible();
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the menu opens full width with every link, and nothing overflows', async ({ page }) => {
      await page.goto('/');
      await page.locator('header details.mobile summary').click();
      const sheet = page.locator('header details.mobile .sheet');
      await expect(sheet).toBeVisible();
      expect((await sheet.boundingBox())?.width).toBe(390);
      for (const href of [...productLinks, 'https://docs.tachyoncms.com', '/compare', '/blog', '/roadmap']) {
        await expect(sheet.locator(`a[href="${href}"]`)).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });

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

test('the header mark draws itself in on load', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header .brand .mark')).toHaveClass(/\bdraw\b/);
  await expect(page.locator('header .brand')).toHaveText('TachyonCMS');
});

test('with reduced motion the mark is fully drawn from the start', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('header .brand .mark')).toHaveClass(/\bdraw\b/);
  // No animation is ever created, so this holds whenever it's checked.
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest('.mark')).length,
  );
  expect(running).toBe(0);
  const offsets = await page
    .locator('header .brand .mark .stroke')
    .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).strokeDashoffset));
  expect(offsets).toEqual(['0px', '0px', '0px']);
});

test('with JS the mark waits, undrawn, for its draw-in', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
  // Before the script adds .draw, the strokes are pushed out of sight, so there's no
  // drawn-then-blank flash.
  const offsets = await page.locator('header .brand .mark').evaluate((mark) => {
    mark.classList.remove('draw');
    return [...mark.querySelectorAll('.stroke')].map((p) => getComputedStyle(p).strokeDashoffset);
  });
  expect(offsets).toEqual(['1.05px', '1.05px', '1.05px']);
});

test('pointing at the brand replays the draw-in', async ({ page }) => {
  await page.goto('/');
  const stroke = page.locator('header .brand .mark .stroke').first();
  // Wait out the first draw, then check the replay starts the stroke over.
  await expect.poll(() => stroke.evaluate((p) => getComputedStyle(p).strokeDashoffset)).toBe('0px');
  await page.evaluate(() => {
    (window as any).draws = 0;
    addEventListener('animationstart', (e) => e.animationName.endsWith('mark-draw') && (window as any).draws++);
  });
  await page.locator('header .brand').hover();
  await expect.poll(() => page.evaluate(() => (window as any).draws)).toBe(3);
});
