import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

const bundlePath = new URL("../dist/openapi.yaml", import.meta.url);
const specPath = new URL("../SPEC.md", import.meta.url);
const evidencePath = new URL("../tests/contract/unauthenticated-observations.yaml", import.meta.url);
const [bundleSource, specSource, evidenceSource, packageSource, changelogSource] = await Promise.all([
  readFile(bundlePath, "utf8"),
  readFile(specPath, "utf8"),
  readFile(evidencePath, "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8"),
]);
const document = parse(bundleSource);
const evidence = parse(evidenceSource);
const errors = [];
const packageInfo = JSON.parse(packageSource);
if (document.info?.version !== packageInfo.version) {
  errors.push("The OpenAPI and package versions must match before bundling a release.");
}
if (!changelogSource.split("\n").includes(`## [${packageInfo.version}]`)) {
  errors.push(`CHANGELOG.md must contain a section for ${packageInfo.version}.`);
}
if (document.info?.license?.identifier !== "MIT" || packageInfo.license !== "MIT") {
  errors.push("The OpenAPI and package license metadata must identify MIT.");
}

function inspect(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${path}[${index}]`));
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;

    if (key === "$ref" && (typeof child !== "string" || !child.startsWith("#/"))) {
      errors.push(`External reference at ${childPath}: ${JSON.stringify(child)}`);
    }

    inspect(child, childPath);
  }
}

inspect(document);

if (/:[ \t]*[&*][A-Za-z0-9_-]+|-[ \t]*\*[A-Za-z0-9_-]+/m.test(bundleSource)) {
  errors.push("The bundled YAML contains an anchor or alias; standalone output must be expanded.");
}

const httpMethods = new Set(["delete", "get", "head", "options", "patch", "post", "put", "trace"]);
function resolveLocal(value) {
  if (value === null || typeof value !== "object" || typeof value.$ref !== "string") {
    return value;
  }
  return value.$ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], document);
}

const createdOperationIds = new Set([
  "createCluster",
  "createClusterBackupToken",
  "createClusterFirewallRule",
  "createClusterLogger",
  "createClusterPrivateLink",
  "createClusterReplica",
  "createClusterUpgrade",
  "createNetworkFirewallRule",
  "createNetworkPeering",
  "createPostgresRole",
  "createQuery",
  "createTeamMember",
  "forkCluster",
  "updateClusterUpgrade",
  "upsertPostgresRole",
]);
const riskFlagNames = [
  "x-cost-bearing",
  "x-destructive",
  "x-disruptive",
  "x-long-running",
  "x-sensitive",
];
const reviewedLowRiskMutationIds = new Set([
  "pingCluster",
  "updateCluster",
  "updateNetwork",
]);
const requiredRiskFlags = {
  createCluster: ["x-cost-bearing", "x-long-running", "x-sensitive"],
  createQuery: ["x-destructive", "x-disruptive", "x-long-running", "x-sensitive"],
  destroyAccessToken: ["x-destructive", "x-sensitive"],
  destroyAccount: ["x-destructive", "x-sensitive"],
  destroyCluster: ["x-destructive"],
  destroyPostgresRole: ["x-destructive", "x-disruptive"],
  destroyTeam: ["x-destructive", "x-sensitive"],
  enableClusterHighAvailability: ["x-cost-bearing", "x-disruptive", "x-long-running"],
  forkCluster: ["x-cost-bearing", "x-long-running"],
  removeTeamMember: ["x-destructive", "x-disruptive", "x-sensitive"],
  updateTeam: ["x-cost-bearing", "x-disruptive", "x-sensitive"],
};
let operationCount = 0;
const operationsById = new Map();
for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!httpMethods.has(method)) continue;
    operationCount += 1;
    operationsById.set(operation.operationId, { method, operation, path });

    const location = `${method.toUpperCase()} ${path}`;
    const successStatuses = Object.keys(operation.responses ?? {}).filter((status) => /^2\d\d$/.test(status));
    const expectedSuccess = createdOperationIds.has(operation.operationId) ? "201" : "200";
    if (successStatuses.length !== 1 || successStatuses[0] !== expectedSuccess) {
      errors.push(`${location} has success statuses ${successStatuses.join(", ") || "none"}; expected only ${expectedSuccess}.`);
    }

    const isMutation = !["get", "head", "options"].includes(method);
    const hasRiskFlag = riskFlagNames.some((flag) => operation[flag] === true);
    if (isMutation && !hasRiskFlag && !reviewedLowRiskMutationIds.has(operation.operationId)) {
      errors.push(`${location} has no agent-risk classification or reviewed low-risk exemption.`);
    }

    const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
    if (method === "post" || method === "patch") {
      const hasIdempotencyKey = parameters.some(
        (parameter) => parameter.$ref === "#/components/parameters/IdempotencyKey",
      );
      if (!hasIdempotencyKey) errors.push(`${location} has no Idempotency-Key parameter.`);
      if (operation.responses?.["409"] === undefined) {
        errors.push(`${location} has no documented 409 idempotency conflict response.`);
      }

      for (const [status, responseReference] of Object.entries(operation.responses ?? {})) {
        if (!/^2\d\d$/.test(status)) continue;
        const response = resolveLocal(responseReference);
        const headers = response?.headers ?? {};
        if (headers["Idempotency-Key"] === undefined || headers["Idempotency-Replay"] === undefined) {
          errors.push(`${location} ${status} does not expose idempotency response headers.`);
        }
      }
    }

    if ((operation.operationId?.startsWith("destroy") || operation.operationId?.startsWith("remove"))
      && operation.responses?.["410"] === undefined) {
      errors.push(`${location} has no repeated-delete 410 response.`);
    }
  }
}
const authoredMatch = specSource.match(/^\| Operations authored \| (\d+) \|$/m);

for (const [operationId, flags] of Object.entries(requiredRiskFlags)) {
  const sourceOperation = operationsById.get(operationId)?.operation;
  if (sourceOperation === undefined) {
    errors.push(`Risk policy names unknown operation ${operationId}.`);
    continue;
  }
  for (const flag of flags) {
    if (sourceOperation[flag] !== true) errors.push(`${operationId} must set ${flag}: true.`);
  }
}

const anonymousOperationIds = new Set([
  "createAccessToken",
  "getChangelog",
  "getPostgresVersion",
  "listChangelogs",
  "listPostgresVersions",
  "listProviders",
]);
for (const [operationId, sourceOperation] of operationsById) {
  const effectiveSecurity = sourceOperation.operation.security ?? document.security ?? [];
  const allowsAnonymous = effectiveSecurity.length === 0 || effectiveSecurity.some(
    (requirement) => Object.keys(requirement).length === 0,
  );
  if (allowsAnonymous !== anonymousOperationIds.has(operationId)) {
    errors.push(`${operationId} has an unexpected anonymous-access classification.`);
  }
}

const expectedEvidenceOperationIds = new Set([
  "getChangelog",
  "getPostgresVersion",
  "listChangelogs",
  "listPostgresVersions",
  "listProviders",
  "listSupportedConfigurationParameters",
]);
const observedEvidenceOperationIds = new Set(
  (evidence.observations ?? []).map((observation) => observation.operation_id),
);
for (const operationId of expectedEvidenceOperationIds) {
  if (!observedEvidenceOperationIds.has(operationId)) {
    errors.push(`Unauthenticated evidence is missing ${operationId}.`);
  }
}
if (observedEvidenceOperationIds.size !== (evidence.observations ?? []).length) {
  errors.push("Unauthenticated evidence contains duplicate operation records.");
}

for (const observation of evidence.observations ?? []) {
  if (!expectedEvidenceOperationIds.has(observation.operation_id)) {
    errors.push(`Unauthenticated evidence contains unexpected operation ${observation.operation_id}.`);
  }
  if (observation.authentication !== "omitted") {
    errors.push(`Evidence authentication for ${observation.operation_id} must be omitted.`);
  }
  if (!Number.isInteger(observation.status)
    || !Array.isArray(observation.observed_top_level_fields)
    || observation.observed_top_level_fields.length === 0
    || !observation.observed_top_level_fields.every((field) => typeof field === "string")) {
    errors.push(`Evidence record for ${observation.operation_id} is malformed.`);
  }

  const sourceOperation = operationsById.get(observation.operation_id);
  if (sourceOperation === undefined) {
    errors.push(`Evidence names unknown operation ${observation.operation_id}.`);
    continue;
  }
  if (sourceOperation.method.toUpperCase() !== observation.method) {
    errors.push(`Evidence method for ${observation.operation_id} does not match the contract.`);
  }
  if (sourceOperation.operation.responses?.[String(observation.status)] === undefined) {
    errors.push(`Evidence status ${observation.status} is absent from ${observation.operation_id}.`);
  }
  const effectiveSecurity = sourceOperation.operation.security ?? document.security ?? [];
  const allowsAnonymous = effectiveSecurity.length === 0 || effectiveSecurity.some(
    (requirement) => Object.keys(requirement).length === 0,
  );
  if (observation.authentication === "omitted" && observation.status >= 200
    && observation.status < 300 && !allowsAnonymous) {
    errors.push(`Evidence says ${observation.operation_id} succeeded anonymously, but security forbids it.`);
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const format of ["double", "float", "int32", "int64"]) ajv.addFormat(format, true);
function compileComponent(name) {
  return ajv.compile({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://local.test/${name}`,
    components: { schemas: document.components.schemas },
    $ref: `#/components/schemas/${name}`,
  });
}

const validateQueryCreate = compileComponent("QueryCreateRequest");
if (validateQueryCreate({ sql: "SELECT 1", async: true, skip_tx: true })) {
  errors.push("QueryCreateRequest accepts the forbidden async + skip_tx combination.");
}
if (!validateQueryCreate({ sql: "SELECT 1" })) {
  errors.push("QueryCreateRequest rejects a minimal read query.");
}

const validateClusterCreate = compileComponent("ClusterCreateRequest");
const clusterCreateBase = {
  name: "invalid",
  plan_id: "standard-8",
  team_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
};
if (!validateClusterCreate(clusterCreateBase)) {
  errors.push("ClusterCreateRequest rejects its minimal valid body.");
}
if (!validateClusterCreate({ ...clusterCreateBase, network_cidr4: "10.0.0.0/20" })) {
  errors.push("ClusterCreateRequest rejects a valid private network CIDR.");
}
if (validateClusterCreate({
  ...clusterCreateBase,
  network_cidr4: "10.0.0.0/20",
  network_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
})) {
  errors.push("ClusterCreateRequest accepts conflicting network selectors.");
}
if (validateClusterCreate({
  ...clusterCreateBase,
  firewall_mode: "deny_all",
  network_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
})) {
  errors.push("ClusterCreateRequest accepts firewall_mode with network_id.");
}

const validateClusterFork = compileComponent("ClusterForkRequest");
if (!validateClusterFork({ name: "valid" })) {
  errors.push("ClusterForkRequest rejects its minimal valid body.");
}
if (!validateClusterFork({
  name: "valid",
  provider_id: "aws",
  plan_id: "standard-8",
  region_id: "us-east-1",
})) {
  errors.push("ClusterForkRequest rejects a complete provider placement.");
}
if (validateClusterFork({ name: "invalid", provider_id: "aws" })) {
  errors.push("ClusterForkRequest accepts a provider without plan and region.");
}
if (validateClusterFork({
  name: "invalid",
  firewall_mode: "deny_all",
  network_cidr4: "10.0.0.0/20",
})) {
  errors.push("ClusterForkRequest accepts firewall_mode with network_cidr4.");
}

const validateTailscaleConnect = compileComponent("TailscaleConnectRequest");
if (validateTailscaleConnect({
  auth_key: "redacted",
  tailscale_oauth_client_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
})) {
  errors.push("TailscaleConnectRequest accepts both credential forms.");
}

const validateReplicaCreate = compileComponent("ClusterReplicaCreateRequest");
if (validateReplicaCreate({
  name: "invalid",
  network_cidr4: "10.0.0.0/20",
  network_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
})) {
  errors.push("ClusterReplicaCreateRequest accepts both network_cidr4 and network_id.");
}
if (validateReplicaCreate({ name: "invalid", provider_id: "aws" })) {
  errors.push("ClusterReplicaCreateRequest accepts a provider without plan and region.");
}

const validateUpgradeUpdate = compileComponent("ClusterUpgradeUpdateRequest");
if (validateUpgradeUpdate({
  starting_from: "2026-01-01T00:00:00Z",
  use_cluster_maintenance_window: true,
})) {
  errors.push("ClusterUpgradeUpdateRequest accepts both scheduling modes.");
}

const validateBackupToken = compileComponent("ClusterBackupToken");
const backupTokenBase = {
  cluster_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  repo_path: "redacted",
  stanza: "db",
  team_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
};
if (!validateBackupToken({
  ...backupTokenBase,
  type: "s3",
  aws: {
    s3_bucket: "redacted",
    s3_key: "redacted",
    s3_key_secret: "redacted",
    s3_region: "us-east-1",
    s3_token: "redacted",
  },
})) {
  errors.push("ClusterBackupToken rejects its S3 variant.");
}
if (validateBackupToken({ ...backupTokenBase, type: "s3" })) {
  errors.push("ClusterBackupToken accepts an S3 token without AWS credentials.");
}

if (authoredMatch === null) {
  errors.push("SPEC.md has no Operations authored row.");
} else if (Number(authoredMatch[1]) !== operationCount) {
  errors.push(
    `SPEC.md claims ${authoredMatch[1]} authored operations, but the bundle contains ${operationCount}.`,
  );
}

if (errors.length > 0) {
  console.error("Bundle check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Bundle check passed: ${operationCount} operations and every $ref is internal.`);
}
