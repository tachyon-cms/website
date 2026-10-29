// preview-docs.yml holds the Cloudflare secrets, so its guard rails are tested:
// never on pull_request (a fork's PR) or main, only in this repo, read-only,
// every action pinned by SHA, and the branch's code kept in a job with no
// secrets, apart from the job that holds them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wf = parse(read(".github/workflows/preview-docs.yml"));
const { build, upload } = wf.jobs;
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

test("the upload job has the secrets but no branch code", () => {
  assert.equal(upload.needs, "build");
  assert.match(JSON.stringify(upload), /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.ok(!upload.steps.some((s) => s.uses?.startsWith("actions/checkout@")), "no checkout");
  assert.doesNotMatch(runs(upload), /npm (ci|install|run)|setup-node/);
  // Its config comes from main, so the branch can't rename the Worker or add bindings.
  assert.match(runs(upload), /contents\/docs\/wrangler\.jsonc\?ref=main/);
  assert.doesNotMatch(JSON.stringify(upload), new RegExp(JSON.parse(read("docs/wrangler.jsonc")).name));
});

test("the upload job skips without the secrets, then uploads with a pinned wrangler", () => {
  const [check, ...rest] = upload.steps;
  assert.equal(check.id, "secrets");
  for (const step of rest) assert.equal(step.if, "steps.secrets.outputs.ready == 'true'", step.name ?? step.uses);
  const pinned = JSON.parse(read("docs/package.json")).devDependencies.wrangler;
  assert.match(runs(upload), new RegExp(`npx --yes wrangler@${pinned.replaceAll(".", "\\.")} versions upload -c wrangler\\.jsonc`));
  assert.ok(upload.steps.some((s) => s.env?.npm_config_ignore_scripts === "true" && /wrangler@/.test(s.run)));
  assert.doesNotMatch(runs(upload), /wrangler(@\S+)? (deploy|versions deploy)/);
  assert.match(runs(upload), /GITHUB_STEP_SUMMARY/);
});

test("the docs Worker serves preview URLs but no workers.dev route", () => {
  const config = JSON.parse(read("docs/wrangler.jsonc").replace(/^\s*\/\/.*$/gm, ""));
  assert.equal(config.preview_urls, true);
  assert.equal(config.workers_dev, false);
});
