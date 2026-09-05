import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const repository = "joshuadavidthomas/crunchybridge-openapi";
export const oasdiffModule = "github.com/oasdiff/oasdiff@v1.30.0";
const riskFlags = ["x-destructive", "x-disruptive", "x-sensitive", "x-cost-bearing", "x-long-running", "x-idempotent"];

export function selectRelease(releases) {
  if (!Array.isArray(releases)) throw new Error("Unexpected GitHub release-list response");
  const eligible = releases.filter(release => !release.draft && release.published_at
    && release.assets?.some(asset => asset.name === "openapi.yaml"));
  eligible.sort((a, b) => b.published_at.localeCompare(a.published_at));
  if (!eligible.length) throw new Error("No published release with openapi.yaml found; choose --base-tag explicitly");
  return eligible[0];
}

export function riskChanges(before, after) {
  function operations(document) {
    return new Map(Object.values(document.paths ?? {}).flatMap(pathItem =>
      ["get", "post", "put", "patch", "delete", "head", "options", "trace"].flatMap(method => {
        const operation = pathItem[method];
        return operation?.operationId ? [[operation.operationId, operation]] : [];
      })));
  }
  const oldOperations = operations(before), newOperations = operations(after);
  const changes = [];
  for (const [id, operation] of newOperations) {
    const previous = oldOperations.get(id);
    for (const flag of riskFlags) {
      const newValue = operation[flag] === true;
      if (!previous) {
        // New safe reads need no warning, but new hazards need review.
        if (newValue && flag !== "x-idempotent") changes.push({ operationId: id, flag, before: null, after: true });
      } else {
        const oldValue = previous[flag] === true;
        if (oldValue !== newValue) changes.push({ operationId: id, flag, before: oldValue, after: newValue });
      }
    }
  }
  return changes;
}

async function publishedReleases() {
  const releases = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub release lookup failed: HTTP ${response.status}`);
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error("Unexpected GitHub release-list response");
    releases.push(...items);
    if (items.length < 100) return releases;
  }
  throw new Error("Release lookup exceeded 1,000 entries; choose --base-tag explicitly");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--base-tag")) throw new Error("Usage: node scripts/compare-release.mjs [--base-tag vX.Y.Z]");
  const tag = args[1] ?? selectRelease(await publishedReleases()).tag_name;
  if (!/^v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(tag)) throw new Error("Baseline tag must use vX.Y.Z or vX.Y.Z-prerelease");
  const url = `https://github.com/${repository}/releases/download/${tag}/openapi.yaml`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Baseline bundle download failed: HTTP ${response.status}`);
  const baseline = await response.text();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "crunchybridge-oasdiff-"));
  try {
    const baselinePath = join(temporaryDirectory, "baseline.yaml");
    await writeFile(baselinePath, baseline);
    const currentPath = fileURLToPath(new URL("dist/openapi.yaml", root));
    const current = await readFile(currentPath, "utf8");
    const result = spawnSync("go", ["run", oasdiffModule, "breaking", baselinePath, currentPath,
      "--format", "json", "--fail-on", "WARN", "--allow-external-refs=false"],
    { cwd: fileURLToPath(root), encoding: "utf8", timeout: 240_000, maxBuffer: 16_000_000 });
    if (result.error) throw result.error;
    if (result.stderr) process.stderr.write(result.stderr);
    let changes;
    try { changes = JSON.parse(result.stdout); } catch { throw new Error("oasdiff returned no valid JSON report"); }
    if (!Array.isArray(changes) || ![0, 1].includes(result.status) || (result.status === 1 && changes.length === 0)) {
      throw new Error(`oasdiff did not complete a comparison (exit ${result.status})`);
    }
    const metadataChanges = riskChanges(parse(baseline), parse(current));
    const report = `# Contract comparison against ${tag}\n\nBaseline: ${url}\n\nTool: ${oasdiffModule}\n\n`
      + (changes.length ? changes.map(change => `- ${change.operation ?? ""} ${change.path ?? ""}: ${change.text} (${change.id})${change.comment ? `\n  - Tool caveat: ${change.comment}` : ""}`).join("\n") : "No breaking changes reported by oasdiff.")
      + "\n\n## Agent metadata\n\n"
      + (metadataChanges.length ? metadataChanges.map(change => `- ${change.operationId}: ${change.flag} changed from ${change.before ?? "absent"} to ${change.after}.`).join("\n") : "No agent-risk or idempotency flag changes.")
      + "\n\nReview flagged changes before release. This report does not rewrite schemas or infer whether the vendor changed. JSON Schema and generator limitations still need human review.\n";
    await writeFile(new URL(".generated/breaking-changes.json", root), JSON.stringify({ baseline: tag, changes, metadataChanges }, null, 2) + "\n");
    await writeFile(new URL(".generated/breaking-changes.md", root), report);
    console.log(report);
    if (result.status !== 0 || metadataChanges.length) process.exitCode = 1;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(new URL(".generated/", root), { recursive: true });
  await main().catch(async error => {
    await writeFile(new URL(".generated/breaking-changes.md", root), `# Contract comparison failed\n\n${error.message}\n`);
    await writeFile(new URL(".generated/breaking-changes.json", root), JSON.stringify({ error: error.message }, null, 2) + "\n");
    console.error(error.message);
    process.exitCode = 1;
  });
}
