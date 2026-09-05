function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

import type {
  Account,
  GetTeamCertificateResponse,
  MetricView,
  QueryCreateRequest,
} from "../../.generated/hey-api/types.gen.js";
import {
  zAccount,
  zClusterBackupToken,
  zEid,
  zMetricView,
  zPrivateNetworkCidr4,
  zQueryCreateRequest,
  zTeam,
} from "../../.generated/hey-api/zod.gen.js";

const certificateTypeCheck: GetTeamCertificateResponse = "-----BEGIN CERTIFICATE-----";
const queryTypeCheck: QueryCreateRequest = { sql: "SELECT 1" };
const metricTypeCheck: MetricView["series"][number]["points"][number] = {
  period_begin: "2026-01-01T00:00:00Z",
  period_end: "2026-01-01T00:01:00Z",
  time: "2026-01-01T00:00:00Z",
  value: "0.25",
};

assert(zEid.safeParse("q7dvmz3ukfh5tmg4hy2tqzvama").success, "valid EID rejected");
assert(!zEid.safeParse("not-an-eid").success, "invalid EID accepted");
assert(zQueryCreateRequest.safeParse(queryTypeCheck).success, "minimal query rejected");
assert(!zQueryCreateRequest.safeParse({}).success, "query without SQL accepted");
assert(zMetricView.safeParse({
  category: { id: "general", name: "General", description: "General cluster metrics" },
  name: "cpu",
  series: [{ name: "cpu", title: "CPU", points: [metricTypeCheck] }],
}).success, "valid metric view rejected");
assert(!zMetricView.safeParse({
  category: { id: "general", name: "General", description: "General cluster metrics" },
  name: "cpu",
  series: [{ name: "cpu", title: "CPU", points: [{ value: 1 }] }],
}).success, "invalid metric interval accepted");
assert(zClusterBackupToken.safeParse({
  cluster_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  repo_path: "redacted",
  stanza: "db",
  team_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  type: "gcs",
  gcp: { gcs_bucket: "redacted" },
}).success, "valid GCS backup token rejected");
assert(!zClusterBackupToken.safeParse({
  cluster_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  repo_path: "redacted",
  stanza: "db",
  team_id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  type: "gcs",
}).success, "GCS backup token without credentials accepted");

const teamWithNoBillingAddress = {
  id: "q7dvmz3ukfh5tmg4hy2tqzvama",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  default_role_flavor: "read",
  is_default: false,
  name: "example",
  support_tier: "standard",
  billing_address: null,
};
assert(zTeam.safeParse(teamWithNoBillingAddress).success, "team with null billing address rejected");
assert(!zTeam.safeParse({ ...teamWithNoBillingAddress, billing_address: {} }).success,
  "team with incomplete billing address accepted");

const syntheticAccount: Account = {
  email: "reader@example.com", name: "Example Reader", has_password: false,
  has_personal_team: true, has_sso: true, multi_factor_enabled: false, notifications_enabled: true,
  access_groups: [{ id: "q7dvmz3ukfh5tmg4hy2tqzvama", team_id: "q7dvmz3ukfh5tmg4hy2tqzvama", name: "Example", is_system: false }],
};
assert(zAccount.safeParse(syntheticAccount).success, "synthetic account rejected");
assert(!zAccount.safeParse({ ...syntheticAccount, access_groups: [[]] }).success, "nested account access groups accepted");
assert(zPrivateNetworkCidr4.safeParse("172.16.0.0/12").success, "private CIDR rejected");
assert(!zPrivateNetworkCidr4.safeParse("203.0.113.0/20").success, "public CIDR accepted");
assert(!zPrivateNetworkCidr4.safeParse("10.256.0.0/20").success, "malformed IPv4 accepted");
assert(!zPrivateNetworkCidr4.safeParse("10.0.0.0/21").success, "small private subnet accepted");

void certificateTypeCheck;
