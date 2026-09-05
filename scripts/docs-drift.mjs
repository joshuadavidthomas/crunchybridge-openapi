import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const root = new URL("../", import.meta.url);
const baselinePath = new URL(".github/docs-baseline.json", root);
export const changelogUrl = "https://api.crunchybridge.com/changelogs";
const apiIndexUrl = "https://docs.crunchybridge.com/api";
const contentAttributes = new Set(["href", "id", "title", "colspan", "rowspan", "start", "value", "type", "src", "alt"]);

export function articleContent(html) {
  const articles = [];
  function find(node) {
    if (node.tagName === "article") articles.push(node);
    for (const child of node.childNodes ?? []) find(child);
  }
  find(parse(html));
  if (articles.length !== 1) throw new Error(`Expected one documentation article; found ${articles.length}. Review the extractor.`);
  function content(node, literal = false) {
    if (node.nodeName === "#text") return literal ? node.value.replaceAll("\r\n", "\n") : node.value.replace(/\s+/g, " ");
    if (!node.tagName || ["script", "style", "svg"].includes(node.tagName)) return null;
    return {
      tag: node.tagName,
      attributes: (node.attrs ?? []).filter(attr => contentAttributes.has(attr.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
      children: (node.childNodes ?? []).map(child => content(child, literal || ["pre", "code"].includes(node.tagName)))
        .filter(child => child !== null),
    };
  }
  const normalized = content(articles[0]);
  const serialized = JSON.stringify(normalized);
  if (!serialized.includes('"tag":"h1"') || serialized.length < 200) {
    throw new Error("Documentation article has no h1 or too little content. Review the extractor.");
  }
  return serialized;
}

export function apiIndexContent(html, sourceUrls) {
  const content = articleContent(html);
  const linkedPages = new Set();
  function visit(node) {
    if (!node || typeof node !== "object") return;
    const href = node.attributes?.find(attribute => attribute.name === "href")?.value;
    if (node.tag === "a" && href) {
      const url = new URL(href, apiIndexUrl);
      if (url.origin === "https://docs.crunchybridge.com" && /^\/api\/[^/]+\/?$/.test(url.pathname)) {
        linkedPages.add(url.origin + url.pathname.replace(/\/$/, ""));
      }
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(JSON.parse(content));
  const expected = new Set(sourceUrls.filter(url => new URL(url).pathname.startsWith("/api/")));
  const added = [...linkedPages].filter(url => !expected.has(url));
  const removed = [...expected].filter(url => !linkedPages.has(url));
  if (!linkedPages.size || added.length || removed.length) {
    throw new Error(`API index differs from pages.txt. New links: ${added.join(", ") || "none"}; missing links: ${removed.join(", ") || "none"}. Review the resource inventory.`);
  }
  return content;
}

export function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortedJson(value) {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortedJson(value[key])]));
  return value;
}

export async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  if (new URL(response.url).origin !== new URL(url).origin) throw new Error(`${url}: unexpected cross-origin redirect`);
  const text = await response.text();
  if (text.length > 5_000_000) throw new Error(`${url}: response exceeds 5 MB`);
  return text;
}

export async function changelogContent(load = fetchText) {
  const entries = new Map();
  const cursors = new Set();
  let cursor;
  for (let page = 0; page < 50; page += 1) {
    const url = new URL(changelogUrl);
    url.searchParams.set("limit", "200");
    url.searchParams.set("order", "asc");
    if (cursor) url.searchParams.set("cursor", cursor);
    const body = JSON.parse(await load(url.href));
    if (!Array.isArray(body.changelogs) || typeof body.has_more !== "boolean") throw new Error("Unexpected changelog envelope");
    for (const item of body.changelogs) {
      if (typeof item.id !== "string" || typeof item.description !== "string" || typeof item.title !== "string") {
        throw new Error("Unexpected changelog entry");
      }
      if (entries.has(item.id)) throw new Error("Changelog pagination repeated an entry");
      // Database bookkeeping dates can change without a published content change.
      const { created_at, updated_at, ...publishedContent } = item;
      entries.set(item.id, publishedContent);
    }
    if (!body.has_more) return JSON.stringify(sortedJson([...entries.values()].sort((a, b) => a.id.localeCompare(b.id))));
    cursor = body.next_cursor;
    if (typeof cursor !== "string" || !cursor || cursors.has(cursor)) throw new Error("Changelog pagination did not advance");
    cursors.add(cursor);
  }
  throw new Error("Changelog exceeded 50 pages; refusing a partial snapshot");
}

export function compareSnapshots(baseline, current) {
  function index(snapshot) {
    if (snapshot.version !== 1 || !Array.isArray(snapshot.sources) || snapshot.sources.length === 0) throw new Error("Invalid docs snapshot");
    const entries = new Map();
    for (const item of snapshot.sources) {
      if (typeof item.url !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256) || entries.has(item.url)) throw new Error("Invalid or duplicate docs snapshot entry");
      entries.set(item.url, item.sha256);
    }
    return entries;
  }
  const before = index(baseline), after = index(current);
  return [...new Set([...before.keys(), ...after.keys()])].sort().flatMap(url => {
    if (before.get(url) === after.get(url)) return [];
    return [{ url, change: !before.has(url) ? "added" : !after.has(url) ? "removed" : "changed", before: before.get(url), after: after.get(url) }];
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--update")) throw new Error("Usage: node scripts/docs-drift.mjs [--update]");
  const update = args[0] === "--update";
  const urls = (await readFile(new URL("pages.txt", root), "utf8")).trim().split(/\r?\n/);
  if (!urls.length || new Set(urls).size !== urls.length || urls.some(url => new URL(url).origin !== "https://docs.crunchybridge.com")) {
    throw new Error("pages.txt must contain unique Crunchy Bridge documentation URLs");
  }
  const sources = [], errors = [];
  for (const url of [apiIndexUrl, ...urls, changelogUrl]) {
    try {
      const content = url === changelogUrl ? await changelogContent()
        : url === apiIndexUrl ? apiIndexContent(await fetchText(url), urls)
        : articleContent(await fetchText(url));
      sources.push({ url, sha256: hash(content) });
    } catch (error) { errors.push(`${url}: ${error.message}`); }
  }
  await mkdir(new URL(".generated/", root), { recursive: true });
  const snapshot = { version: 1, observed_on: new Date().toISOString().slice(0, 10), sources };
  await writeFile(new URL(".generated/docs-current.json", root), JSON.stringify(snapshot, null, 2) + "\n");
  let report;
  if (errors.length) {
    report = "# Documentation check failed\n\nNo baseline was updated.\n\n" + errors.map(error => `- ${error}`).join("\n") + "\n";
    process.exitCode = 1;
  } else if (update) {
    await writeFile(baselinePath, JSON.stringify(snapshot, null, 2) + "\n");
    report = `# Documentation baseline updated\n\nCaptured ${sources.length} sources. Review and commit the baseline; no OpenAPI files were changed.\n`;
  } else {
    const changes = compareSnapshots(JSON.parse(await readFile(baselinePath, "utf8")), snapshot);
    report = "# Documentation drift\n\n" + (changes.length
      ? changes.map(change => `- ${change.change}: ${change.url}\n  - before: ${change.before ?? "absent"}\n  - after: ${change.after ?? "absent"}`).join("\n") + "\n\nReview the source changes before refreshing the baseline. No OpenAPI files were changed.\n"
      : `All ${sources.length} source hashes match the reviewed baseline.\n`);
    if (changes.length) process.exitCode = 1;
  }
  await writeFile(new URL(".generated/docs-drift.md", root), report);
  console.log(report);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch(async error => {
    await mkdir(new URL(".generated/", root), { recursive: true });
    await writeFile(new URL(".generated/docs-drift.md", root), `# Documentation check failed\n\n${error.message}\n`);
    console.error(error.message);
    process.exitCode = 1;
  });
}
