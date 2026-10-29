// preview-docs.yml holds the Cloudflare secrets, so its guard rails are tested:
// never on pull_request (a fork's PR) or main, only in this repo, read-only,
// every action pinned by SHA, the branch's code kept in a job with no secrets,
// and the job that holds them running only main's code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wf = parse(read(".github/workflows/preview-docs.yml"));
const { build, upload } = wf.jobs;
// The same strip the workflow's sed does: drop whole-line // comments, then parse.
const jsonc = (path) => JSON.parse(read(path).replace(/^\s*\/\/.*$/gm, ""));
const runs = (job) => job.steps.map((s) => s.run ?? "").join("\n");

test("preview-docs runs on pushes to branches other than main, and nothing else", () => {
  assert.deepEqual(Object.keys(wf.on), ["push"]);
  assert.deepEqual(wf.on.push, { "branches-ignore": ["main"] });
});

test("preview-docs is read-only, runs only in this repo, and pins every action", () => {
  assert.deepEqual(wf.permissions, { contents: "read" });
  assert.deepEqual(Object.keys(wf.jobs), ["build", "upload"]);
  for (const job of Object.values(wf.jobs)) {
    assert.equal(job.if, "github.repository == 'tachyon-cms/website'");
    assert.equal(job.permissions, undefined);
    for (const step of job.steps) if (step.uses) assert.match(step.uses, /@[0-9a-f]{40}$/);
  }
});

test("the build job runs the branch's code with no secrets", () => {
  assert.doesNotMatch(JSON.stringify(build), /secrets\./);
  assert.match(runs(build), /^npm ci$/m);
  assert.match(runs(build), /^npm run build:docs$/m);
  assert.ok(build.steps.some((s) => s.uses?.startsWith("actions/upload-artifact@") && s.with.path === "docs/dist"));
});

test("the upload job has the secrets but runs only main's code", () => {
  assert.equal(upload.needs, "build");
  assert.match(JSON.stringify(upload), /secrets\.CLOUDFLARE_API_TOKEN/);
  // Every checkout in the job is main, never the branch.
  const checkouts = upload.steps.filter((s) => s.uses?.startsWith("actions/checkout@"));
  assert.equal(checkouts.length, 1);
  for (const c of checkouts) assert.deepEqual(c.with, { ref: "main", "persist-credentials": false });
  // Node with no cache: a cache the branch's build job wrote must not reach this job.
  for (const s of upload.steps.filter((s) => s.uses?.startsWith("actions/setup-node@"))) {
    assert.deepEqual(s.with, { "node-version-file": ".nvmrc", "package-manager-cache": false });
  }
  assert.ok(!upload.steps.some((s) => /^actions\/(cache|setup-\w+)@/.test(s.uses ?? "") && !s.uses.startsWith("actions/setup-node@")));
  // The one install is main's lockfile with scripts off, and nothing is built.
  assert.deepEqual(runs(upload).match(/\bnpm \S+.*$/gm), ["npm ci --ignore-scripts --workspace docs"]);
  // The branch's files unpack outside the checkout.
  const download = upload.steps.find((s) => s.uses?.startsWith("actions/download-artifact@"));
  assert.equal(download.with.path, "${{ runner.temp }}/preview/dist");
  assert.match(runs(upload), /cp docs\/wrangler\.jsonc "\$PREVIEW\/wrangler\.jsonc"/);
  assert.doesNotMatch(JSON.stringify(upload), new RegExp(jsonc("docs/wrangler.jsonc").name));
});

test("the upload job skips without the secrets, then uploads with main's wrangler", () => {
  const [check, ...rest] = upload.steps;
  assert.equal(check.id, "secrets");
  for (const step of rest) assert.equal(step.if, "steps.secrets.outputs.ready == 'true'", step.name ?? step.uses);
  assert.match(runs(upload), /"\$GITHUB_WORKSPACE\/node_modules\/\.bin\/wrangler" versions upload -c wrangler\.jsonc/);
  assert.doesNotMatch(runs(upload), /npx/);
  assert.doesNotMatch(runs(upload), /wrangler(@\S+)? (deploy|versions deploy)/);
  assert.match(runs(upload), /GITHUB_STEP_SUMMARY/);
});

test("the docs Worker serves preview URLs but no workers.dev route", () => {
  const config = jsonc("docs/wrangler.jsonc");
  assert.equal(config.preview_urls, true);
  assert.equal(config.workers_dev, false);
});
