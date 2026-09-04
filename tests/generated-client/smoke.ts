import createClient from "openapi-fetch";
import type { components, operations, paths } from "../../.generated/openapi.js";

const authoredOperations = {
  approveClusterPrivateLinkConnection: true,
  cancelClusterUpgrade: true,
  createAccessToken: true,
  createCluster: true,
  createClusterBackupToken: true,
  createClusterFirewallRule: true,
  createClusterLogger: true,
  createClusterPrivateLink: true,
  createClusterReplica: true,
  createClusterUpgrade: true,
  createNetworkFirewallRule: true,
  createNetworkPeering: true,
  createPostgresRole: true,
  createQuery: true,
  createTeam: true,
  createTeamMember: true,
  destroyAccessToken: true,
  destroyAccount: true,
  destroyCluster: true,
  destroyClusterFirewallRule: true,
  destroyClusterLogger: true,
  destroyClusterPrivateLink: true,
  destroyNetworkFirewallRule: true,
  destroyNetworkPeering: true,
  destroyPostgresRole: true,
  destroyTeam: true,
  detachClusterReplica: true,
  disableClusterHighAvailability: true,
  disconnectClusterFromTailscale: true,
  enableClusterHighAvailability: true,
  forkCluster: true,
  getAccount: true,
  getChangelog: true,
  getCluster: true,
  getClusterConfigurationParameter: true,
  getClusterLogger: true,
  getClusterPrivateLink: true,
  getClusterStatus: true,
  getClusterUpgrade: true,
  getEvent: true,
  getMetricView: true,
  getNetwork: true,
  getNetworkFirewallRule: true,
  getNetworkPeering: true,
  getPostgresRole: true,
  getPostgresVersion: true,
  getTeam: true,
  getTeamCertificate: true,
  getTeamMember: true,
  listChangelogs: true,
  listClusterBackups: true,
  listClusterConfigurationParameters: true,
  listClusterFirewallRules: true,
  listClusterLoggers: true,
  listClusters: true,
  listClusterPrivateLinkConnections: true,
  listEvents: true,
  listNetworkFirewallRules: true,
  listNetworkPeerings: true,
  listNetworks: true,
  listPostgresRoles: true,
  listPostgresVersions: true,
  listProviders: true,
  listSupportedConfigurationParameters: true,
  listTeamMembers: true,
  listTeams: true,
  pingCluster: true,
  rejectClusterPrivateLinkConnection: true,
  removeTeamMember: true,
  restartCluster: true,
  resumeCluster: true,
  startClusterBackup: true,
  suspendCluster: true,
  updateCluster: true,
  updateClusterConfigurationParameters: true,
  updateClusterFirewallRule: true,
  updateClusterLogger: true,
  updateClusterUpgrade: true,
  updateNetwork: true,
  updateNetworkFirewallRule: true,
  updateTeam: true,
  updateTeamMember: true,
  upsertPostgresRole: true,
  connectClusterToTailscale: true,
} satisfies Record<keyof operations, true>;

type TeamCertificate =
  paths["/teams/{team_id}.pem"]["get"]["responses"][200]["content"]["application/pem-certificate-chain"];

type AccessTokenCreateRequest =
  paths["/access-tokens"]["post"]["requestBody"]["content"]["application/json"];
type AccessTokenCreateOkResponse = paths["/access-tokens"]["post"]["responses"][200];
type TeamCreateOkResponse = paths["/teams"]["post"]["responses"][200];
type LoggerUpdateOkResponse =
  paths["/clusters/{cluster_id}/loggers/{logger_id}"]["put"]["responses"][200];
type UpgradeUpdateCreatedResponse =
  paths["/clusters/{cluster_id}/upgrade"]["put"]["responses"][201];
type RoleUpsertCreatedResponse =
  paths["/clusters/{cluster_id}/roles/{role_name}"]["put"]["responses"][201];

const certificateTypeCheck: TeamCertificate = "-----BEGIN CERTIFICATE-----";
const nullableBillingAddressTypeCheck: components["schemas"]["Team"]["billing_address"] = null;
// @ts-expect-error A non-null billing address still requires city, country, and line_1.
const invalidBillingAddressTypeCheck: components["schemas"]["Team"]["billing_address"] = {};
const accessTokenRequestTypeCheck: AccessTokenCreateRequest = {
  client_secret: "REDACTED_API_KEY_SECRET",
  expires_in: "1w",
};
const clusterCreateTypeCheck: components["schemas"]["ClusterCreateRequest"] = {
  name: "example",
  plan_id: "standard-8",
  team_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
};
const clusterForkTypeCheck: components["schemas"]["ClusterForkRequest"] = {
  name: "example-fork",
};
const emptyClusterRestartTypeCheck: components["schemas"]["ClusterRestartRequest"] = {};
const nullableReplicasTypeCheck: components["schemas"]["Cluster"]["replicas"] = null;
const nullableOperationsTypeCheck: components["schemas"]["Cluster"]["ongoing_operations"] = null;
const nullableUpgradeTypeCheck: components["schemas"]["ClusterStatus"]["ongoing_upgrade"] = null;
const nullableDiskTypeCheck: components["schemas"]["ClusterStatus"]["disk_usage"] = null;
const clusterPathTypeCheck: operations["getCluster"]["parameters"]["path"] = {
  cluster_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
};
const clusterLoggerCreateTypeCheck: components["schemas"]["ClusterLoggerCreateRequest"] = {
  host: "logs.example.test",
  port: 6514,
  template: "redacted",
};
const configurationUpdateTypeCheck: components["schemas"]["ConfigurationParameterUpdateRequest"] = {
  parameters: [{ name: "postgres:log_statement", value: null }],
};
const emptyUpgradeCreateTypeCheck: components["schemas"]["ClusterUpgradeCreateRequest"] = {};
const backupTokenVariantTypeCheck: components["schemas"]["ClusterBackupToken"] = {
  cluster_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  repo_path: "redacted",
  stanza: "db",
  team_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  type: "gcs",
  gcp: { gcs_bucket: "redacted" },
};
const redactedRolePasswordTypeCheck: components["schemas"]["PostgresRoleList"]["roles"][number]["password"] = null;
const metricIntervalTypeCheck: components["schemas"]["MetricView"]["series"][number]["points"][number] = {
  period_begin: "2026-01-01T00:00:00Z",
  period_end: "2026-01-01T00:01:00Z",
  time: "2026-01-01T00:00:00Z",
  value: 0.25,
};
const nullableQueryResultTypeCheck: components["schemas"]["Query"]["result"] = null;
const queryResultRowsTypeCheck: components["schemas"]["Query"]["result"] = [[1, "two", null]];
const queryCreateTypeCheck: components["schemas"]["QueryCreateRequest"] = { sql: "SELECT 1" };
const upgradeUpdateCreatedTypeCheck: UpgradeUpdateCreatedResponse | undefined = undefined;
const roleUpsertCreatedTypeCheck: RoleUpsertCreatedResponse | undefined = undefined;
const accessTokenCreateOkTypeCheck: AccessTokenCreateOkResponse | undefined = undefined;
const teamCreateOkTypeCheck: TeamCreateOkResponse | undefined = undefined;
const loggerUpdateOkTypeCheck: LoggerUpdateOkResponse | undefined = undefined;
const changelogIdentifierTypeCheck: operations["getChangelog"]["parameters"]["path"] = {
  changelog_id_or_name: "connection-pooling",
};
const postgresVersionIdentifierTypeCheck: operations["getPostgresVersion"]["parameters"]["path"] = {
  postgres_version_id: "17",
};
const repeatableAccountFilterTypeCheck: operations["listPostgresRoles"]["parameters"]["query"] = {
  account_id: ["q7dvmz3ukfh5tmg4hy2tqzvama", "q7dvmz3ukfh5tmg4hy2tqzvame"],
};
// @ts-expect-error Cluster creation requires name, plan_id, and team_id.
const invalidClusterCreate: components["schemas"]["ClusterCreateRequest"] = { name: "incomplete" };
// @ts-expect-error Cluster forks require a name.
const invalidClusterFork: components["schemas"]["ClusterForkRequest"] = {};
// @ts-expect-error Cluster paths require cluster_id.
const invalidClusterPath: operations["getCluster"]["parameters"]["path"] = {};
// @ts-expect-error Logger creation requires host, port, and template.
const invalidLoggerCreate: components["schemas"]["ClusterLoggerCreateRequest"] = { host: "incomplete" };
// @ts-expect-error Configuration updates require the parameters array.
const invalidConfigurationUpdate: components["schemas"]["ConfigurationParameterUpdateRequest"] = {};
// @ts-expect-error Query creation requires SQL.
const invalidQueryCreate: components["schemas"]["QueryCreateRequest"] = {};
// @ts-expect-error Redacted role collections never expose plaintext passwords.
const invalidRedactedRolePassword: components["schemas"]["PostgresRoleList"]["roles"][number]["password"] = "secret";

void authoredOperations;
void certificateTypeCheck.toUpperCase();
void nullableBillingAddressTypeCheck;
void invalidBillingAddressTypeCheck;
void accessTokenRequestTypeCheck;
void clusterCreateTypeCheck;
void clusterForkTypeCheck;
void emptyClusterRestartTypeCheck;
void nullableReplicasTypeCheck;
void nullableOperationsTypeCheck;
void nullableUpgradeTypeCheck;
void nullableDiskTypeCheck;
void clusterPathTypeCheck;
void clusterLoggerCreateTypeCheck;
void configurationUpdateTypeCheck;
void emptyUpgradeCreateTypeCheck;
void backupTokenVariantTypeCheck;
void redactedRolePasswordTypeCheck;
void metricIntervalTypeCheck;
void nullableQueryResultTypeCheck;
void queryResultRowsTypeCheck;
void queryCreateTypeCheck;
void upgradeUpdateCreatedTypeCheck;
void roleUpsertCreatedTypeCheck;
void accessTokenCreateOkTypeCheck;
void teamCreateOkTypeCheck;
void loggerUpdateOkTypeCheck;
void changelogIdentifierTypeCheck;
void postgresVersionIdentifierTypeCheck;
void repeatableAccountFilterTypeCheck;
void invalidClusterCreate;
void invalidClusterFork;
void invalidClusterPath;
void invalidLoggerCreate;
void invalidConfigurationUpdate;
void invalidQueryCreate;
void invalidRedactedRolePassword;

export function createCrunchyBridgeClient(apiKey?: string) {
  return createClient<paths>({
    baseUrl: "https://api.crunchybridge.com",
    headers: apiKey === undefined ? undefined : { Authorization: `Bearer ${apiKey}` },
  });
}
