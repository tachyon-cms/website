// Refreshes the snapshots the Releases and Community pages fall back to when GitHub
// can't be reached at build time. Run `npm run snapshot` after a release and commit
// the result. Unlike the build, this fails loudly: a bad snapshot is worse than an old one.
import { writeFileSync } from 'node:fs';
import { getContributors, getReleases } from '../src/lib/github.ts';

const write = (name: string, data: unknown[]) => {
  if (data.length === 0) throw new Error(`snapshot: GitHub sent no ${name}`);
  writeFileSync(new URL(`../src/data/${name}.snapshot.json`, import.meta.url), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`snapshot: ${data.length} ${name}`);
};

write('releases', await getReleases());
write('contributors', await getContributors());
