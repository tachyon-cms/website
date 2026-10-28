// gen-cli.mjs against a fake binary: it walks the "Commands:" lists and writes a page per command.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const gen = fileURLToPath(new URL('./gen-cli.mjs', import.meta.url));

const help = {
  '': `Fake server

Usage: tachyon [OPTIONS] <COMMAND>

Commands:
  schema  Keep schemas in a file
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
`,
  schema: `Keep schemas in a file

Usage: tachyon schema <COMMAND>

Commands:
  diff  Show what would change
  help  Print this message or the help of the given subcommand(s)
`,
  'schema diff': `Show what would change

Usage: tachyon schema diff <FILE>

Arguments:
  <FILE>
`,
};

test('writes one page per command, nested commands included', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gen-cli-'));
  const bin = join(dir, 'tachyon');
  writeFileSync(
    bin,
    `#!/usr/bin/env node
const help = ${JSON.stringify(help)};
const args = process.argv.slice(2);
if (args.at(-1) !== '--help') process.exit(2);
const key = args.slice(0, -1).join(' ');
if (!(key in help)) { console.error('unknown: ' + key); process.exit(2); }
process.stdout.write(help[key]);
`,
  );
  chmodSync(bin, 0o755);
  const out = join(dir, 'out');
  // A page for a command that no longer exists goes; the hand-written index stays.
  mkdirSync(out);
  writeFileSync(join(out, 'tachyon-gone.md'), 'stale');
  writeFileSync(join(out, 'index.md'), 'kept');
  execFileSync(process.execPath, [gen, bin, out]);

  assert.deepEqual(readdirSync(out).sort(), ['index.md', 'tachyon-schema-diff.md', 'tachyon-schema.md', 'tachyon.md']);
  for (const [key, text] of Object.entries(help)) {
    const name = ['tachyon', ...key.split(' ').filter(Boolean)].join('-');
    const page = readFileSync(join(out, `${name}.md`), 'utf8');
    assert.match(page, new RegExp(`^title: "tachyon${key ? ' ' + key : ''}"$`, 'm'), name);
    assert.ok(page.includes('```text\n' + text.trimEnd() + '\n```'), `${name} has the exact help text`);
  }
  assert.match(readFileSync(join(out, 'tachyon-schema-diff.md'), 'utf8'), /^description: "Show what would change"$/m);
});
