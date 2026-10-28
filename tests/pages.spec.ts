import { expect, test } from '@playwright/test';

const docs = 'https://docs.tachyoncms.com';

// Features that ship in v0.1.0, each with the docs page it hands over to.
const today = [
  { path: '/product/content-modelling', docs: 'content-types' },
  { path: '/product/querying', docs: 'querying' },
  { path: '/product/access-control', docs: 'access-rules' },
  { path: '/product/sign-in', docs: 'sign-in' },
  { path: '/product/schema-as-code', docs: 'schema-files' },
];
// Pages about what isn't built yet. They have to say so where you can see it.
const headed = ['/editors', '/product/admin'];
const all = [...today.map((p) => p.path), ...headed, '/why', '/security'];

for (const path of all) {
  test(`${path} has one h1, a title and lists its v0.1.0 sources`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.title()).not.toBe('');
    const sources = page.locator('.sources a[href^="https://github.com/tachyon-cms/tachyoncms/blob/v0.1.0/"]');
    expect(await sources.count()).toBeGreaterThan(0);
  });
}

for (const path of headed) {
  test(`${path} says it's on the roadmap`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.page-hero').getByText('On the roadmap', { exact: true })).toBeVisible();
  });
}

for (const { path, docs: slug } of today) {
  test(`${path} shows code and links into the docs`, async ({ page }) => {
    await page.goto(path);
    expect(await page.locator('main pre').count()).toBeGreaterThan(0);
    await expect(page.locator(`main a[href="${docs}/${slug}"]`).first()).toBeVisible();
    await expect(page.getByText('On the roadmap', { exact: true })).toHaveCount(0);
  });
}

test('product pages link to each other', async ({ page }) => {
  await page.goto('/product/querying');
  const nav = page.locator('nav.product-nav');
  await expect(nav.locator('a')).toHaveCount(7);
  await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute('href', '/product/querying');
});

test('the security page covers the supply chain and how to report', async ({ page }) => {
  await page.goto('/security');
  const main = page.locator('main');
  for (const text of [/unsafe/, /bound parameter/, /compiled to SQL/i, /Argon2id/, /breach/, /cosign/, /SBOM/, /provenance/i, /SECURITY\.md/]) {
    await expect(main).toContainText(text);
  }
  for (const href of [
    'https://www.bestpractices.dev/projects/16021',
    'https://scorecard.dev/viewer/?uri=github.com/tachyon-cms/tachyoncms',
    'mailto:security@tachyoncms.com',
    'https://github.com/tachyon-cms/tachyoncms/security/advisories/new',
    `${docs}/security-model`,
  ]) {
    await expect(main.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
});

test('the editors page offers the admin signup', async ({ page }) => {
  await page.goto('/editors');
  await expect(page.locator('form.signup')).toHaveCount(1);
  await expect(page.locator('form.signup label').first()).toHaveText('Tell me when the admin is ready');
});

test('every signup form promises the same list', async ({ page }) => {
  for (const path of ['/', '/editors']) {
    await page.goto(path);
    for (const fine of await page.locator('form.signup .fine').allTextContents()) {
      expect(fine).toContain('releases and news about the admin');
    }
  }
  await page.goto('/confirmed');
  await expect(page.locator('main')).toContainText('releases and news about the admin');
});

test('nothing runs off the side of a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of all) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
