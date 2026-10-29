import { expect, test } from '@playwright/test';

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

test('dark is the default even when the OS prefers light, and the toggle switches', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('[data-theme-toggle]:visible').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/cli');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('no horizontal overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const link of [...topics.map((t) => t.link), '/access-rules', '/deploy/docker', '/tutorials/build-a-blog', '/reference/http-api', '/reference/http-api/documents', '/reference/field-types', '/reference/errors', '/cli/tachyon-schema-apply']) {
    await page.goto(link);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, link).toBeLessThanOrEqual(0);
  }
});

test.describe('without JS', () => {
  test.use({ javaScriptEnabled: false });

  test('the theme toggle is hidden, since it could not work', async ({ page }) => {
    await page.goto('/');
    const toggles = await page.locator('[data-theme-toggle]').all();
    expect(toggles.length).toBeGreaterThan(0);
    for (const toggle of toggles) await expect(toggle).toBeHidden();
  });
});
