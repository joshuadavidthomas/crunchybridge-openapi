import assert from "node:assert/strict";
import test from "node:test";
import { apiIndexContent, articleContent, changelogContent, compareSnapshots, hash } from "../scripts/docs-drift.mjs";
import { riskChanges, selectRelease } from "../scripts/compare-release.mjs";

const article = '<article class="old"><h1>Account API</h1><p>Returns an account.</p><a href="/api/account">Details</a><pre>field: string\n  required: true</pre></article>';

test("article extraction ignores site chrome and presentation, but preserves contract content", () => {
  const original = articleContent(`<nav>Old nav</nav>${article}<script>oldBuild()</script>`);
  assert.equal(articleContent(`<nav>New nav</nav>${article.replace('class="old"', 'class="new" style="color:red"')}<script>newBuild()</script>`), original);
  for (const changed of [
    article.replace("Returns an account", "Returns no account"),
    article.replace('href="/api/account"', 'href="/api/team"'),
    article.replace("required: true", "required: false"),
    article.replace("  required", "    required"),
  ]) assert.notEqual(articleContent(changed), original);
});

test("missing or ambiguous article structure fails instead of hashing an empty extraction", () => {
  assert.throws(() => articleContent("<h1>Moved page</h1>"), /one documentation article/);
  assert.throws(() => articleContent(article + article), /one documentation article/);
  assert.throws(() => articleContent("<article><p>Missing heading</p></article>"), /no h1/);
});

test("API index additions and removals require inventory review", () => {
  const sources = ["https://docs.crunchybridge.com/api/account", "https://docs.crunchybridge.com/api-concepts/eid"];
  assert.equal(apiIndexContent(article, sources), articleContent(article));
  assert.throws(() => apiIndexContent(article.replace("</article>", '<a href="/api/new-resource">New</a></article>'), sources), /New links:.*new-resource/);
  assert.throws(() => apiIndexContent(article.replace('href="/api/account"', 'href="/elsewhere"'), sources), /missing links:.*account/);
});

const snapshot = entries => ({ version: 1, sources: entries.map(([url, content]) => ({ url, sha256: hash(content) })) });
test("snapshot comparison detects changes, additions, and removals", () => {
  const before = snapshot([["https://example.test/a", "a"], ["https://example.test/b", "b"]]);
  assert.deepEqual(compareSnapshots(before, before), []);
  const after = snapshot([["https://example.test/a", "changed"], ["https://example.test/c", "c"]]);
  assert.deepEqual(compareSnapshots(before, after).map(item => item.change), ["changed", "removed", "added"]);
  assert.throws(() => compareSnapshots({ version: 1, sources: [] }, after), /Invalid docs snapshot/);
  assert.throws(() => compareSnapshots(snapshot([["a", "x"], ["a", "x"]]), after), /duplicate/);
});

const entry = (id, description = "Published change") => ({ id, title: "Change", description, published_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
test("changelog capture follows cursors and ignores bookkeeping timestamps only", async () => {
  const requested = [];
  const content = await changelogContent(async url => {
    requested.push(new URL(url));
    return JSON.stringify(requested.length === 1
      ? { changelogs: [entry("a")], has_more: true, next_cursor: "next" }
      : { changelogs: [entry("b")], has_more: false });
  });
  assert.equal(requested.length, 2);
  assert.equal(requested[1].searchParams.get("cursor"), "next");
  const onePage = items => changelogContent(async () => JSON.stringify({ changelogs: items, has_more: false }));
  assert.equal(content, await onePage([{ ...entry("b"), updated_at: "later" }, entry("a")]));
  assert.notEqual(content, await onePage([entry("a"), entry("b", "Corrected text")]));
  assert.notEqual(content, await onePage([entry("a"), { ...entry("b"), added_field: "new" }]));
});

test("changelog capture rejects malformed, failed, or stalled pagination", async () => {
  await assert.rejects(changelogContent(async () => JSON.stringify({ changelogs: [] })), /envelope/);
  await assert.rejects(changelogContent(async () => { throw new Error("HTTP 503"); }), /503/);
  await assert.rejects(changelogContent(async () => JSON.stringify({ changelogs: [], has_more: true, next_cursor: "same" })), /did not advance/);
  await assert.rejects(changelogContent(async () => JSON.stringify({ changelogs: [entry("a"), entry("a")], has_more: false })), /repeated an entry/);
  let page = 0;
  await assert.rejects(changelogContent(async () => JSON.stringify({ changelogs: [], has_more: true, next_cursor: String(++page) })), /partial snapshot/);
});

test("release baseline includes published previews but excludes drafts and missing assets", () => {
  const release = (tag, date, extra = {}) => ({ tag_name: tag, published_at: date, draft: false, assets: [{ name: "openapi.yaml" }], ...extra });
  assert.equal(selectRelease([
    release("v0.2.0", "2026-04-01", { draft: true }),
    release("v0.1.2", "2026-03-01", { assets: [] }),
    release("v0.1.0", "2026-01-01"),
    release("v0.1.1", "2026-02-01", { prerelease: true }),
  ]).tag_name, "v0.1.1");
  assert.throws(() => selectRelease([]), /No published release/);
});

test("risk comparison catches hazard and retry changes beyond oasdiff", () => {
  const spec = operation => ({ paths: { "/items": { get: { operationId: "listItems", ...operation } } } });
  assert.deepEqual(riskChanges(spec({}), spec({ "x-sensitive": false })), []);
  assert.deepEqual(riskChanges(spec({ "x-sensitive": true, "x-idempotent": true }), spec({})), [
    { operationId: "listItems", flag: "x-sensitive", before: true, after: false },
    { operationId: "listItems", flag: "x-idempotent", before: true, after: false },
  ]);
  assert.equal(riskChanges(spec({}), spec({ "x-cost-bearing": true })).length, 1);
  assert.deepEqual(riskChanges({ paths: {} }, spec({ "x-destructive": true, "x-idempotent": true })), [
    { operationId: "listItems", flag: "x-destructive", before: null, after: true },
  ]);
  assert.deepEqual(riskChanges({ paths: {} }, spec({ "x-idempotent": true })), []);
});
