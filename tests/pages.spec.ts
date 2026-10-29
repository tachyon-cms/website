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
// Pages that show working code, beyond the feature pages checked below.
const withCode = ['/why', '/security'];

for (const path of all) {
  test(`${path} has one h1, a title and lists its v0.1.0 sources`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.title()).not.toBe('');
    const sources = page.locator('.sources a[href^="https://github.com/tachyon-cms/tachyoncms/blob/v0.1.0/"]');
    expect(await sources.count()).toBeGreaterThan(0);
  });
}

for (const path of withCode) {
  test(`${path} shows a code sample`, async ({ page }) => {
    await page.goto(path);
    expect(await page.locator('main pre').count()).toBeGreaterThan(0);
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
  for (const path of ['/', '/editors', '/product/admin', '/releases']) {
    await page.goto(path);
    for (const fine of await page.locator('form.signup .fine').allTextContents()) {
      expect(fine).toContain("write only when there's a release or news of the admin");
      // Unsubscribing is by the link in an update or by email (see /privacy), not promised as one click.
      expect(fine).not.toContain('One click');
    }
  }
  await page.goto('/confirmed');
  await expect(page.locator('main')).toContainText("write only when there's a release or news of the admin");
});

test('nothing runs off the side of a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of all) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

const compare = ['wordpress', 'strapi', 'contentful', 'sanity', 'directus'];

test('/compare links to every comparison', async ({ page }) => {
  await page.goto('/compare');
  await expect(page.locator('h1')).toHaveCount(1);
  for (const slug of compare) await expect(page.locator(`main a[href="/compare/${slug}"]`)).toHaveCount(1);
  await expect(page.locator('header a[href="/compare"]')).toHaveAttribute('aria-current', 'page');
});

for (const slug of compare) {
  test(`/compare/${slug} cites every row, then says where we're behind and who should pick which`, async ({ page }) => {
    await page.goto(`/compare/${slug}`);
    await expect(page.locator('h1')).toHaveCount(1);
    const rows = page.locator('main tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) await expect(row.locator('a.src[href^="https://"]')).toHaveCount(1);
    const headings = await page.locator('main h2').allTextContents();
    expect(headings.indexOf("Where TachyonCMS isn't there yet")).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf('Who should pick which')).toBeGreaterThan(headings.indexOf("Where TachyonCMS isn't there yet"));
    await expect(page.locator('main time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
  });
}

test('compare pages fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/compare', ...compare.map((s) => `/compare/${s}`)]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
