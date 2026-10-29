// Renders a post's media kit from the HTML beside this script:
//   <slug>/card.html        -> public/media/blog/<slug>/card.png (1200x630, the social card)
//   <slug>/infographic.html -> public/media/blog/<slug>/infographic.png (1600 wide, full height)
//   <slug>/video.html       -> public/media/blog/<slug>/video.mp4, if the post has one. The page
//                              must define window.seek(seconds) and <body data-seconds="N">;
//                              each frame is a screenshot at 30 fps, encoded with ffmpeg.
//
//   node scripts/post-graphics/render.mjs <slug> [card|infographic|video]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [slug, only] = process.argv.slice(2);
if (!slug || !existsSync(join(here, slug))) {
  console.error('usage: node scripts/post-graphics/render.mjs <slug> [card|infographic|video]');
  process.exit(1);
}
const out = join(here, '../../public/media/blog', slug);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const open = async (file, width, height) => {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${join(here, slug, file)}`);
  await page.evaluate(() => document.fonts.ready);
  // A face that failed to load (a removed package, a wrong path) would render in a
  // fallback font without a word; fail instead.
  const broken = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'error').map((f) => `${f.family} ${f.weight}`));
  if (broken.length) {
    await browser.close();
    throw new Error(`${slug}/${file} could not load ${broken.join(', ')}`);
  }
  // Everything stays inside the .frame's content box: a chip running into the
  // margin, or off the image, fails the render instead of shipping.
  const over = await page.evaluate(() => {
    const frame = document.querySelector('.frame');
    if (!frame) return [];
    const style = getComputedStyle(frame);
    const box = frame.getBoundingClientRect();
    const left = box.left + parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.paddingRight);
    const bad = [...frame.querySelectorAll('*')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > right + 0.5 || r.left < left - 0.5);
      })
      .map((el) => `<${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`);
    if (frame.scrollWidth > frame.clientWidth) bad.unshift('.frame scrolls sideways');
    return bad;
  });
  if (over.length) {
    await browser.close();
    throw new Error(`${slug}/${file} overflows its frame:\n  ${over.join('\n  ')}`);
  }
  return page;
};

const jobs = {
  card: async () => (await open('card.html', 1200, 630)).screenshot({ path: join(out, 'card.png') }),
  infographic: async () =>
    (await open('infographic.html', 1600, 900)).screenshot({ path: join(out, 'infographic.png'), fullPage: true }),
  video: async () => {
    const page = await open('video.html', 1920, 1080);
    const fps = 30;
    const seconds = Number(await page.evaluate(() => document.body.dataset.seconds));
    const frames = mkdtempSync(join(tmpdir(), `${slug}-frames-`));
    for (let i = 0; i < seconds * fps; i++) {
      await page.evaluate((t) => window.seek(t), i / fps);
      await page.screenshot({ path: join(frames, `f${String(i).padStart(5, '0')}.png`) });
    }
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', join(frames, 'f%05d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', join(out, 'video.mp4')]);
    rmSync(frames, { recursive: true });
  },
};

for (const [name, job] of Object.entries(jobs)) {
  if (only ? only !== name : !existsSync(join(here, slug, `${name}.html`))) continue;
  await job();
  console.log(`${slug}: ${name}`);
}
await browser.close();
