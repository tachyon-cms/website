// preview-docs.yml holds the Cloudflare secrets, so its guard rails are tested:
// never on pull_request (a fork's PR) or main, only in this repo, read-only,
// every action pinned by SHA, and the docs Worker set to serve preview URLs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wf = parse(read(".github/workflows/preview-docs.yml"));

test("preview-docs runs on pushes to branches other than main, and nothing else", () => {
  assert.deepEqual(Object.keys(wf.on), ["push"]);
  assert.deepEqual(wf.on.push, { "branches-ignore": ["main"] });
});

test("preview-docs is read-only and runs only in this repo", () => {
  assert.deepEqual(wf.permissions, { contents: "read" });
  for (const job of Object.values(wf.jobs)) {
    assert.equal(job.if, "github.repository == 'tachyon-cms/website'");
    assert.equal(job.permissions, undefined);
  }
});

test("preview-docs pins every action by SHA and skips without the secrets", () => {
  for (const job of Object.values(wf.jobs)) {
    const [check, ...rest] = job.steps;
    assert.equal(check.id, "secrets");
    for (const step of rest) {
      assert.equal(step.if, "steps.secrets.outputs.ready == 'true'", step.name ?? step.uses ?? step.run);
      if (step.uses) assert.match(step.uses, /@[0-9a-f]{40}$/);
    }
  }
});

test("preview-docs builds the docs and uploads a version, never a deploy", () => {
  const runs = Object.values(wf.jobs).flatMap((job) => job.steps.map((s) => s.run ?? "")).join("\n");
  assert.match(runs, /^npm ci$/m);
  assert.match(runs, /^npm run build:docs$/m);
  assert.match(runs, /wrangler versions upload -c docs\/wrangler\.jsonc/);
  assert.doesNotMatch(runs, /wrangler (deploy|versions deploy)/);
  assert.match(runs, /GITHUB_STEP_SUMMARY/);
});

test("the docs Worker serves preview URLs but no workers.dev route", () => {
  const config = JSON.parse(read("docs/wrangler.jsonc").replace(/^\s*\/\/.*$/gm, ""));
  assert.equal(config.preview_urls, true);
  assert.equal(config.workers_dev, false);
});
