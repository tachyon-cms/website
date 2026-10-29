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

test('turning on reduced motion mid-visit stops on the finished picture', async ({ page }) => {
  await page.goto('/');
  const d = page.locator('[data-diagram="schema-diff"]');
  await d.scrollIntoViewIfNeeded();
  await expect(d).toHaveClass(/\barmed\b/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-play].armed')).toHaveCount(0);
  await expect(d.locator('[data-at]:not(.on)')).toHaveCount(0);
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
  await expect(d).toContainText("2 of 2 documents won't validate against the new fields");
});

test('the sections run in order', async ({ page }) => {
  await page.goto('/');
  const order = await page
    .locator('main > section[id]')
    .evaluateAll((els) => els.map((el) => el.id));
  expect(order).toEqual(['top', 'how', 'developers', 'rules', 'editors', 'schema', 'trust', 'latest', 'contribute', 'start']);
});

test.describe('the hero', () => {
  // Counts requestAnimationFrame calls, so a test can tell whether the field is running.
  const countFrames = () => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__frames++;
      return raf(cb);
    };
  };
  const frames = (page: Page) => page.evaluate(() => (window as unknown as { __frames: number }).__frames);
  const idle = async (page: Page) => {
    const before = await frames(page);
    await page.waitForTimeout(500);
    return (await frames(page)) - before;
  };

  test('has the headline, the canvas and the pre-alpha line', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.locator('h1')).toHaveText('Content at the speed of your code.');
    await expect(hero.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
    await expect(hero).toContainText('v0.1.0 is pre-alpha.');
    await expect(hero).toContainText('docker pull ghcr.io/tachyon-cms/tachyoncms:v0.1.0');
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('runs no frame loop, and still draws the streaks', async ({ page }) => {
      await page.addInitScript(countFrames);
      await page.goto('/');
      await expect(page.locator('.hero canvas')).toHaveClass(/\bon\b/);
      expect(await idle(page)).toBe(0);
      expect(await frames(page)).toBe(0);
    });
  });

  test('stops while the tab is hidden and starts again when it comes back', async ({ page }) => {
    await page.addInitScript(countFrames);
    await page.goto('/');
    await expect.poll(() => frames(page)).toBeGreaterThan(5);
    const setHidden = (hidden: boolean) =>
      page.evaluate((hidden) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await setHidden(true);
    expect(await idle(page)).toBe(0);
    await setHidden(false);
    expect(await idle(page)).toBeGreaterThan(5);
  });

  // The brightest canvas pixel behind each piece of copy, sampled over a few frames.
  const behindCopy = (page: Page, samples = 6) =>
    page.evaluate(async (samples) => {
      const canvas = document.querySelector<HTMLCanvasElement>('.hero canvas')!;
      const ctx = canvas.getContext('2d')!;
      const c = canvas.getBoundingClientRect();
      const sx = canvas.width / c.width;
      let max = 0;
      for (let i = 0; i < samples; i++) {
        for (const el of document.querySelectorAll('.hero .copy > *')) {
          const r = el.getBoundingClientRect();
          const data = ctx.getImageData((r.left - c.left) * sx, (r.top - c.top) * sx, r.width * sx, r.height * sx).data;
          for (let a = 3; a < data.length; a += 4) max = Math.max(max, data[a]);
        }
        await new Promise((done) => setTimeout(done, 120));
      }
      return max;
    }, samples);

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test.describe(`at ${viewport.width} px`, () => {
      test.use({ viewport });

      test('no streak ever crosses the copy', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.hero canvas')).toHaveClass(/\bon\b/);
        expect(await behindCopy(page)).toBeLessThanOrEqual(8);
      });

      test('nor in the reduced-motion still', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        await expect(page.locator('.hero canvas')).toHaveClass(/\bon\b/);
        expect(await behindCopy(page, 1)).toBeLessThanOrEqual(8);
      });
    });
  }

  test.describe('at desktop width', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('each wire runs from the schema panel into the left side of the response', async ({ page }) => {
      await page.goto('/');
      const schema = (await page.locator('.hero .schema').boundingBox())!;
      const response = (await page.locator('.hero .response').boundingBox())!;
      const ends = await page.locator('.hero .wires path.wire').evaluateAll((paths) =>
        (paths as SVGPathElement[]).map((p) => {
          const m = p.getScreenCTM()!;
          const at = (len: number) => new DOMPoint(p.getPointAtLength(len).x, p.getPointAtLength(len).y).matrixTransform(m);
          const end = at(p.getTotalLength());
          const before = at(p.getTotalLength() - 4);
          return { start: at(0), end, horizontal: Math.abs(end.y - before.y) < 0.5 };
        }),
      );
      expect(ends).toHaveLength(3);
      for (const { start, end, horizontal } of ends) {
        expect(Math.abs(start.y - (schema.y + schema.height))).toBeLessThan(2);
        expect(start.x).toBeGreaterThan(schema.x);
        expect(Math.abs(end.x - response.x)).toBeLessThan(2);
        expect(end.y).toBeGreaterThan(response.y + 30);
        expect(end.y).toBeLessThan(response.y + response.height);
        expect(horizontal).toBe(true);
      }
    });

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('still streaks stand in for the field', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.hero .still')).toBeVisible();
        expect(await page.locator('.hero .still rect').count()).toBeGreaterThan(3);
      });
    });

    test('the still streaks give way once the field is running', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.hero canvas')).toHaveClass(/\bon\b/);
      await expect(page.locator('.hero .still')).toHaveCSS('opacity', '0');
    });
  });

  test('code colours strings and quiets punctuation', async ({ page }) => {
    await page.goto('/');
    const d = page.locator('[data-diagram="schema-to-api"]');
    await expect(d.locator('.s').first()).toHaveText('"posts"');
    expect(await d.locator('.p').count()).toBeGreaterThan(5);
  });

  test('stops once the hero is scrolled away', async ({ page }) => {
    await page.addInitScript(countFrames);
    await page.goto('/');
    await expect.poll(() => frames(page)).toBeGreaterThan(5);
    await page.locator('#trust').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    expect(await idle(page)).toBe(0);
  });
});

test('a warning in a diagram reads differently from a good outcome', async ({ page }) => {
  await page.goto('/');
  const d = page.locator('[data-diagram="schema-diff"]');
  const colour = (sel: string) => d.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
  expect(await colour('.warn')).not.toBe(await colour('.ok'));
});
