import { expect, test, type Page } from '@playwright/test';

const diagrams = ['schema-to-api', 'rule-hides-draft', 'schema-diff'];

// toBeVisible() ignores opacity, and opacity is what hides a piece before its turn.
async function hiddenPieces(page: Page) {
  return page.locator('[data-play] [data-at]').evaluateAll((els) =>
    els.filter((el) => {
      const s = getComputedStyle(el);
      return s.opacity !== '1' || s.visibility === 'hidden' || s.display === 'none';
    }).length,
  );
}

test('the three diagrams are on the page, each with data-play', async ({ page }) => {
  await page.goto('/');
  for (const id of diagrams) {
    const d = page.locator(`[data-diagram="${id}"]`);
    await expect(d).toHaveCount(1);
    await expect(d).toHaveAttribute('data-play', /^\d+$/);
    expect(await d.locator('[data-at]').count()).toBeGreaterThan(0);
  }
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every diagram piece shows at load and stays put', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-play] [data-at]').first()).toBeAttached();
    for (const id of diagrams) await page.locator(`[data-diagram="${id}"]`).scrollIntoViewIfNeeded();
    expect(await hiddenPieces(page)).toBe(0);
    await expect(page.locator('[data-play].armed')).toHaveCount(0);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every diagram piece shows', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-play] [data-at]').first()).toBeAttached();
    expect(await hiddenPieces(page)).toBe(0);
  });
});

test('a diagram plays once it is on screen', async ({ page }) => {
  await page.goto('/');
  const d = page.locator('[data-diagram="schema-diff"]');
  await d.scrollIntoViewIfNeeded();
  await expect(d).toHaveClass(/\barmed\b/);
  const last = d.locator('[data-at]').last();
  await expect(last).toHaveClass(/\bon\b/, { timeout: 15_000 });
});

test('the hero offers the docs and the repo', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', /^https:\/\/docs\.tachyoncms\.com/);
  await expect(hero.getByRole('link', { name: /Star on GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/tachyon-cms/tachyoncms',
  );
});

test('the trust strip links the OpenSSF badge and Scorecard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="https://www.bestpractices.dev/projects/16021"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://scorecard.dev/viewer/?uri=github.com/tachyon-cms/tachyoncms"]')).toHaveCount(1);
});

test('the contributor invite links good first issues and CONTRIBUTING.md', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.locator(
      'a[href="https://github.com/tachyon-cms/tachyoncms/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"]',
    ),
  ).toHaveCount(1);
  await expect(page.locator('a[href="https://github.com/tachyon-cms/tachyoncms/blob/main/CONTRIBUTING.md"]')).toHaveCount(1);
});

test('the editors section is told as direction and has the signup form', async ({ page }) => {
  await page.goto('/');
  const editors = page.locator('#editors');
  await expect(editors).toContainText('On the roadmap');
  await expect(editors.locator('form.signup')).toHaveCount(1);
  await expect(page.locator('script[src="/signup.js"]')).toHaveCount(1);
});

test('the schema diff shows the CLI wording', async ({ page }) => {
  await page.goto('/');
  const d = page.locator('[data-diagram="schema-diff"]');
  await expect(d).toContainText('~ change posts: rename title to headline');
  await expect(d).toContainText('~ change posts: remove title, deleting its data; add headline (text)');
});

test('the latest posts section stays out until a post is published', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#latest')).toHaveCount(0);
});

test('the sections run in order', async ({ page }) => {
  await page.goto('/');
  const order = await page
    .locator('main > section[id]')
    .evaluateAll((els) => els.map((el) => el.id));
  expect(order).toEqual(['top', 'how', 'developers', 'rules', 'editors', 'schema', 'trust', 'contribute', 'start']);
});
