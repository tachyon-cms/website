import { expect, test } from '@playwright/test';
import { overflowing } from './fit';

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
// Pages that are only their header: the signup steps and the 404 (any path that isn't a page).
const short = ['/confirmed', '/check-your-inbox', '/link-expired', '/signup-problem', '/no-such-page'];
// Every other inner page: the project pages, the blog, the comparisons, the signup
// steps and the 404 (any path that isn't a page).
const rest = [
  '/compare',
  ...['wordpress', 'strapi', 'contentful', 'sanity', 'directus'].map((s) => `/compare/${s}`),
  '/blog',
  '/blog/v0-1-0',
  '/blog/where-tachyoncms-is-headed',
  '/roadmap',
  '/releases',
  '/community',
  '/starters',
  '/faq',
  '/brand',
  '/privacy',
  '/trademark',
  ...short,
];
const inner = [...all, ...rest];
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

// 320 px is the WCAG reflow width; 390 is a common phone.
for (const width of [320, 390]) {
  test(`nothing runs off the side of a ${width} px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', ...all]) {
      await page.goto(path);
      expect(await overflowing(page), path).toEqual([]);
    }
  });
}

// The signup steps and the 404; the other pages are checked in their own specs.
for (const width of [320, 390]) {
  test(`the short pages fit a ${width} px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of short) {
      await page.goto(path);
      expect(await overflowing(page), path).toEqual([]);
    }
  });
}

// Only the preloaded faces, and only our two families: Geist Mono 400, and Inter 400
// or 600 for everything else, headings, bold and table headers included. Text that
// falls back to the browser's own monospace, or synthesises a bold, fails here.
test('inner pages set type in the preloaded weights', async ({ page }) => {
  const found: string[] = [];
  for (const path of rest) {
    await page.goto(path);
    const off = await page.locator('main').evaluate((main) =>
      [...main.querySelectorAll('*')]
        .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
        .map((el) => ({ el, css: getComputedStyle(el) }))
        .filter(({ css }) => {
          const family = css.fontFamily.split(',')[0];
          if (family.includes('Geist Mono')) return css.fontWeight !== '400';
          if (family.includes('Inter')) return !['400', '600'].includes(css.fontWeight);
          return true;
        })
        .map(({ el, css }) => `${el.tagName.toLowerCase()}.${el.className} ${css.fontFamily.split(',')[0]} ${css.fontWeight}`),
    );
    found.push(...[...new Set(off)].map((o) => `${path}: ${o}`));
  }
  expect(found).toEqual([]);
});

const compare = ['wordpress', 'strapi', 'contentful', 'sanity', 'directus'];

test('/compare links to every comparison', async ({ page }) => {
  await page.goto('/compare');
  await expect(page.locator('h1')).toHaveCount(1);
  for (const slug of compare) await expect(page.locator(`main a[href="/compare/${slug}"]`)).toHaveCount(1);
  await expect(page.locator('header a[href="/compare"]:visible')).toHaveAttribute('aria-current', 'page');
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

for (const width of [320, 390]) {
  test(`compare pages fit a ${width} px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/compare', ...compare.map((s) => `/compare/${s}`)]) {
      await page.goto(path);
      expect(await overflowing(page), path).toEqual([]);
    }
  });
}

test.describe('the still header', () => {
  for (const path of inner) {
    test(`${path} opens on the still header, with no canvas`, async ({ page }) => {
      await page.goto(path);
      const hero = page.locator('.page-hero');
      await expect(hero).toHaveCount(1);
      await expect(hero.locator('h1')).toHaveCount(1);
      // Four frozen streaks on the grid rows, each a tail and a glowing head.
      const streaks = hero.locator('svg.streaks');
      await expect(streaks).toHaveAttribute('aria-hidden', 'true');
      await expect(streaks.locator('rect')).toHaveCount(4);
      await expect(streaks.locator('circle')).toHaveCount(4);
      await expect(page.locator('canvas')).toHaveCount(0);
    });
  }

  for (const path of inner) {
    test(`${path}: it stays put, nothing in it animates or transitions`, async ({ page }) => {
      await page.goto(path);
      const moving = await page.locator('.page-hero, .page-hero *').evaluateAll((els) =>
        els
          .filter((el) => {
            const css = getComputedStyle(el);
            const timed = css.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
            return css.animationName !== 'none' || timed;
          })
          .map((el) => el.tagName),
      );
      expect(moving).toEqual([]);
      await expect(page.locator('.page-hero svg :is(animate, animateTransform, animateMotion, set)')).toHaveCount(0);
    });
  }
});

test('every page is dark', async ({ page }) => {
  for (const path of ['/', ...inner]) {
    await page.goto(path);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), path).toBe('rgb(12, 13, 13)');
  }
});

test('on a phone the product tabs show the current page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/security');
  await expect(page.locator('nav.product-nav a[aria-current="page"]')).toBeInViewport({ ratio: 1 });
});

// The tabs sit in a scrolling row, and a scroller clips whatever reaches past its
// edges, a focus ring included. Every ring has to show in full.
for (const width of [1440, 390]) {
  test(`at ${width} px each product tab's focus ring shows in full`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/product/querying');
    const tabs = page.locator('nav.product-nav a');
    await tabs.first().focus();
    for (let i = 0; i < (await tabs.count()); i++) {
      if (i) await page.keyboard.press('Tab');
      await expect(tabs.nth(i)).toBeFocused();
      const cut = () => tabs.nth(i).evaluate((a) => {
        const css = getComputedStyle(a);
        const grow = parseFloat(css.outlineOffset) + parseFloat(css.outlineWidth);
        const r = a.getBoundingClientRect();
        const nav = a.parentElement!;
        const n = nav.getBoundingClientRect();
        const bottom = n.bottom - parseFloat(getComputedStyle(nav).borderBottomWidth);
        const ring = { top: r.top - grow, bottom: r.bottom + grow, left: r.left - grow, right: r.right + grow };
        return [
          ring.top < n.top && 'top',
          ring.bottom > bottom && 'bottom',
          ring.left < Math.max(n.left, 0) && 'left',
          ring.right > Math.min(n.right, innerWidth) && 'right',
        ].filter(Boolean);
      });
      await expect.poll(cut, { message: `tab ${i}` }).toEqual([]);
    }
  });
}

// The tabs carry side padding for their focus rings; neither the first label nor the
// current tab's blue rule may stick out past the page's left edge because of it.
test('at 1440 px the first product tab and its rule line up with the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/product/content-modelling');
  const edges = await page.evaluate(() => {
    const text = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getClientRects()[0].left;
    };
    const tab = document.querySelector('nav.product-nav a[aria-current="page"]')!;
    const box = tab.getBoundingClientRect().left;
    const after = getComputedStyle(tab, '::after');
    // The rule is either the tab's own bottom border or a ::after drawn under the label.
    const rule = after.content !== 'none' && after.content !== 'normal' ? box + parseFloat(after.left) : box;
    return { edge: text(document.querySelector('.page-hero .eyebrow')!), label: text(tab), rule };
  });
  expect(edges.label).toBeCloseTo(edges.edge, 0);
  expect(edges.rule).toBeCloseTo(edges.edge, 0);
});

test('the heading weight is preloaded with the body weight, and no unused mono face ships', async ({ page }) => {
  for (const path of ['/', '/product/querying']) {
    await page.goto(path);
    const faces = await page.evaluate(() => {
      const rules = [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r instanceof CSSFontFaceRule);
      return rules.map((r) => ({
        family: r.style.getPropertyValue('font-family').replace(/"/g, ''),
        weight: r.style.getPropertyValue('font-weight'),
        src: r.style.getPropertyValue('src'),
      }));
    });
    const preloads = await page.locator('link[rel="preload"][as="font"]').evaluateAll((ls) => ls.map((l) => new URL((l as HTMLLinkElement).href).pathname));
    const preloaded = (family: string) =>
      faces.filter((f) => f.family.startsWith(family) && !f.family.includes('fallback') && preloads.some((p) => f.src.includes(p))).map((f) => f.weight).sort();
    expect(preloaded('Inter'), path).toEqual(['400', '600']);
    expect(preloaded('Geist Mono'), path).toEqual(['400']);
    const mono = faces.filter((f) => f.family.includes('Geist Mono') && !f.family.includes('fallback')).map((f) => f.weight);
    expect(mono, path).toEqual(['400']);
  }
});
