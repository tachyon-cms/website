// gen-cli.mjs against a fake binary: it walks the "Commands:" lists and writes a page per command.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const gen = fileURLToPath(new URL('./gen-cli.mjs', import.meta.url));

// `schema diff` has a wrapped description line, which must not be read as a command.
// `extra` has no intro in gen-cli.mjs, so it gets a warning. Trailing spaces are clap's.
const help = {
  '': `Fake server

Usage: tachyon [OPTIONS] <COMMAND>

Commands:
  schema  Keep schemas in a file
  extra   Something new
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
`,
  schema: `Keep schemas in a file

Usage: tachyon schema <COMMAND>

Commands:
  diff  Show what would change
          when the description wraps
  help  Print this message or the help of the given subcommand(s)
`,
  'schema diff': `Show what would change

Usage: tachyon schema diff <FILE>

Arguments:
  <FILE>
`,
  extra: `Something new

Usage: tachyon extra
`,
};

const order = ['', 'schema', 'schema diff', 'extra'];
const pageName = (key) => ['tachyon', ...key.split(' ').filter(Boolean)].join('-');

// A fake tachyon that prints the canned help, or fails on `failOn`.
const fakeBinary = (dir, failOn) => {
  const bin = join(dir, 'tachyon');
  writeFileSync(
    bin,
    `#!/usr/bin/env node
const help = ${JSON.stringify(help)};
const args = process.argv.slice(2);
if (args.at(-1) !== '--help') process.exit(2);
const key = args.slice(0, -1).join(' ');
if (key === ${JSON.stringify(failOn ?? null)} || !(key in help)) { console.error('unknown: ' + key); process.exit(2); }
process.stdout.write(help[key]);
`,
  );
  chmodSync(bin, 0o755);
  return bin;
};

const setup = (failOn) => {
  const dir = mkdtempSync(join(tmpdir(), 'gen-cli-'));
  const out = join(dir, 'out');
  mkdirSync(out);
  writeFileSync(join(out, 'tachyon-gone.md'), 'stale');
  writeFileSync(join(out, 'index.md'), 'kept');
  const run = spawnSync(process.execPath, [gen, fakeBinary(dir, failOn), out], { encoding: 'utf8' });
  return { out, run };
};

test('writes one page per command, nested commands included', () => {
  const { out, run } = setup();
  assert.equal(run.status, 0, run.stderr);

  // The stale page goes; the hand-written index stays.
  assert.deepEqual(readdirSync(out).sort(), [
    'index.md',
    'tachyon-extra.md',
    'tachyon-schema-diff.md',
    'tachyon-schema.md',
    'tachyon.md',
  ]);
  order.forEach((key, i) => {
    const page = readFileSync(join(out, `${pageName(key)}.md`), 'utf8');
    const text = help[key]
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n')
      .trimEnd();
    assert.match(page, new RegExp(`^title: "tachyon${key ? ' ' + key : ''}"$`, 'm'), key);
    assert.match(page, new RegExp(`^  order: ${i + 1}$`, 'm'), `${key} sidebar order`);
    assert.ok(page.includes('```text\n' + text + '\n```'), `${key} has the help text`);
    assert.doesNotMatch(page, / +$/m, `${key} has no trailing spaces`);
  });
  assert.match(readFileSync(join(out, 'tachyon-schema-diff.md'), 'utf8'), /^description: "Show what would change"$/m);

  // The intro sits between the frontmatter and the help text.
  assert.match(
    readFileSync(join(out, 'tachyon-schema-diff.md'), 'utf8'),
    /^---\n\nSee \[Schema files: Compare with `diff`\]\(\/schema-files#compare-with-diff\)\.\n\n```text\n/m,
  );
  assert.match(readFileSync(join(out, 'tachyon-extra.md'), 'utf8'), /^---\n\n```text\n/m);

  // Only the command without an intro is flagged.
  assert.match(run.stderr, /no intro for `tachyon extra`/);
  assert.equal(run.stderr.match(/no intro/g).length, 1);
});

test('a failing binary leaves the existing pages untouched', () => {
  const { out, run } = setup('schema diff');
  assert.notEqual(run.status, 0);
  assert.deepEqual(readdirSync(out).sort(), ['index.md', 'tachyon-gone.md']);
  assert.equal(readFileSync(join(out, 'tachyon-gone.md'), 'utf8'), 'stale');
});
