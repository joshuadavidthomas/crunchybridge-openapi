import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const temporaryDirectory = await mkdtemp(join(tmpdir(), "crunchybridge-bundle-"));

try {
  const generatedPath = join(temporaryDirectory, "openapi.yaml");
  execFileSync(process.execPath, [
    fileURLToPath(new URL("node_modules/@redocly/cli/bin/cli.js", root)),
    "bundle", "crunchy-bridge@v0", "--output", generatedPath,
  ], { cwd: fileURLToPath(root), stdio: "inherit" });

  const [committed, generated] = await Promise.all([
    readFile(new URL("dist/openapi.yaml", root)),
    readFile(generatedPath),
  ]);
  if (!committed.equals(generated)) {
    console.error("dist/openapi.yaml is stale. Run npm run bundle and commit the result.");
    process.exitCode = 1;
  } else {
    console.log("Committed bundle matches the modular source.");
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
