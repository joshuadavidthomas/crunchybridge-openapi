import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

const document = parse(await readFile(new URL("../../dist/openapi.yaml", import.meta.url), "utf8"));
const capture = parse(await readFile(new URL("./fixtures.yaml", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const format of ["double", "float", "int32", "int64"]) ajv.addFormat(format, true);

function resolve(value) {
  if (!value?.$ref) return value;
  assert.ok(value.$ref.startsWith("#/"), "Fixtures require bundled, internal references");
  return resolve(value.$ref.slice(2).split("/")
    .map(part => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], document));
}

function compile(schema) {
  return ajv.compile({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    components: document.components,
    ...schema,
  });
}

function responseValidator(fixture) {
  const matches = Object.values(document.paths)
    .map(pathItem => pathItem.get)
    .filter(operation => operation?.operationId === fixture.operationId);
  assert.equal(matches.length, 1, `${fixture.operationId} must identify one GET operation`);
  const response = resolve(matches[0].responses[String(fixture.status)]);
  const schema = response?.content?.[fixture.contentType]?.schema;
  assert.ok(schema, `${fixture.operationId} must declare the observed status and media type`);
  return compile(schema);
}

const expectedOperations = [
  "getEvent", "getTeam", "getTeamMember", "listClusters",
  "listEvents", "listNetworks", "listTeamMembers",
];

test("authenticated fixture coverage is present and unique", () => {
  assert.equal(capture.source, "authenticated-executor-read-only");
  assert.deepEqual(capture.fixtures.map(fixture => fixture.operationId).sort(), expectedOperations);
});

for (const fixture of capture.fixtures) {
  test(`${fixture.operationId}: sanitized ${fixture.status} response`, () => {
    const validate = responseValidator(fixture);
    assert.equal(validate(fixture.body), true, JSON.stringify(validate.errors));
  });
}

test("Team billing addresses accept null or complete objects, but not malformed objects", () => {
  const fixture = capture.fixtures.find(item => item.operationId === "getTeam");
  const validate = responseValidator(fixture);
  assert.equal(validate({ ...fixture.body, billing_address: null }), true);
  assert.equal(validate({
    ...fixture.body,
    billing_address: { city: "Example", country: "US", line_1: "123 Example Street" },
  }), true);
  assert.equal(validate({ ...fixture.body, billing_address: {} }), false);
  assert.equal(validate({ ...fixture.body, billing_address: "invalid" }), false);
});

test("observed response nullability does not change the unverified Team update request", () => {
  const validate = compile({ $ref: "#/components/schemas/TeamUpdateRequest" });
  assert.equal(validate({ billing_address: null }), false);
  assert.equal(validate({
    billing_address: { city: "Example", country: "US", line_1: "123 Example Street" },
  }), true);
});

const inventory = parse(await readFile(new URL("./operations.yaml", import.meta.url), "utf8"));
test("all public method/path/status combinations and source pages match the contract", async () => {
  const pages = (await readFile(new URL("../../pages.txt", import.meta.url), "utf8"))
    .trim().split(/\r?\n/).filter(url => url.includes("/api/"));
  assert.deepEqual(Object.keys(inventory).sort(), pages.sort());
  const expected = Object.entries(inventory).flatMap(([url, operations]) => operations.map(
    ([method, path, status]) => `${method} ${path} ${status} ${url}`,
  ));
  assert.equal(expected.length, 84);
  assert.equal(new Set(expected).size, 84);
  const actual = Object.entries(document.paths).flatMap(([path, item]) => Object.entries(item)
    .filter(([method]) => ["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(method))
    .flatMap(([method, operation]) => Object.keys(operation.responses).filter(status => /^2\d\d$/.test(status))
      .map(status => `${method.toUpperCase()} ${path} ${status} ${operation["x-docs-url"].split("#")[0]}`)));
  assert.deepEqual(actual.sort(), expected.sort());
});

test("cluster placement accepts only private IPv4 CIDRs with prefixes up to 20 bits", () => {
  for (const name of ["ClusterCreateRequest", "ClusterForkRequest", "ClusterReplicaCreateRequest"]) {
    const validate = compile(document.components.schemas[name].properties.network_cidr4);
    for (const value of [null, "10.0.0.0/8", "10.255.0.0/20", "172.16.0.0/12", "172.31.240.0/20", "192.168.0.0/16", "192.168.240.0/20"]) {
      assert.equal(validate(value), true, `${name}: ${value}`);
    }
    for (const value of ["10.0.0.0/21", "10.0.0.0/7", "172.16.0.0/11", "172.15.0.0/20", "172.32.0.0/20", "192.168.0.0/15", "192.169.0.0/20", "203.0.113.0/20", "10.256.0.0/20", "10.0.0/20", "10.0.0.0", "::1/20"]) {
      assert.equal(validate(value), false, `${name}: ${value}`);
    }
  }
});

test("shared errors type public codes and multi-factor challenges", () => {
  const validate = compile({ $ref: "#/components/schemas/Error" });
  const base = { message: "Example error", request_id: "27a532f4-5bc8-4810-b602-88475a93167c" };
  assert.equal(validate(base), true);
  for (const code of [null, "account_disabled", "account_email_not_verified", "account_sso_only", "maintenance_mode", "transient_server_error"]) {
    assert.equal(validate({ ...base, code }), true, JSON.stringify(validate.errors));
  }
  for (const code of [42, false, {}, "unknown"]) assert.equal(validate({ ...base, code }), false);
  const challenge = {
    ...base, code: "multi_factor_challenge_required",
    multi_factor: {
      is_required: true,
      recovery_code: { header: "X-Crunchy-Multi-Factor-Recovery-Code", is_enabled: false, num_valid: 0 },
      totp: { header: "X-Crunchy-Multi-Factor-Totp", is_enabled: true },
      webauthn: { header: "X-Crunchy-Multi-Factor-WebAuthn", is_enabled: false },
    },
  };
  assert.equal(validate(challenge), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...base, code: challenge.code }), false);
  assert.equal(validate({ ...challenge, multi_factor: {} }), false);
  assert.equal(validate({ ...challenge, multi_factor: { ...challenge.multi_factor, is_required: false } }), false);
  assert.equal(validate({ ...challenge, multi_factor: { ...challenge.multi_factor, totp: { header: "example", is_enabled: "true" } } }), false);
});

const eid = "qvcw4hylovgyzbwzp53bmmlhga";
const timestamp = "2021-07-11T01:02:03Z";

test("synthetic SSO accounts may omit stored-account fields, but access groups have a known shape", () => {
  const validate = compile({ $ref: "#/components/schemas/Account" });
  const account = {
    email: "reader@example.com", name: "Example Reader", has_password: false,
    has_personal_team: true, has_sso: true, multi_factor_enabled: false, notifications_enabled: true,
  };
  assert.equal(validate(account), true, JSON.stringify(validate.errors));
  const group = { id: eid, team_id: eid, name: "Example", is_system: false };
  for (const access_groups of [null, [], [group]]) {
    assert.equal(validate({ ...account, access_groups }), true, JSON.stringify(validate.errors));
  }
  for (const access_groups of [[[]], [{}], ["group"]]) {
    assert.equal(validate({ ...account, access_groups }), false);
  }
  assert.equal(validate({ ...account, dashboard_settings: { rows_per_page: 25, skip_cluster_onboarding: false } }), true);
  assert.equal(validate({ ...account, dashboard_settings: { rows_per_page: null, skip_cluster_onboarding: null } }), true);
  assert.equal(validate({ ...account, dashboard_settings: { rows_per_page: "25" } }), false);
  assert.equal(validate({ ...account, dashboard_settings: { skip_cluster_onboarding: "false" } }), false);
  assert.equal(validate({ ...account, email: null }), false);
});

test("access-token responses may omit redacted fields but have a timestamp expiry", () => {
  const validate = compile({ $ref: "#/components/schemas/AccessToken" });
  const token = { id: eid, account_id: eid, api_key_id: eid, created_at: timestamp, expires_at: timestamp, expires_in: 0, token_type: "bearer" };
  assert.equal(validate(token), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...token, access_token: null, application_name: null }), true);
  assert.equal(validate({ ...token, expires_at: null }), false);
  assert.equal(validate({ ...token, expires_at: "tomorrow" }), false);
  // The public docs explicitly say this deprecated input is ignored.
  const request = compile({ $ref: "#/components/schemas/AccessTokenCreateRequest" });
  assert.equal(request({ client_secret: "REDACTED", grant_type: "" }), true);
});

test("system events need no actor or request context", () => {
  const validate = compile({ $ref: "#/components/schemas/Event" });
  const event = { id: eid, kind: "cluster.created", object_id: eid, object_kind: "cluster", created_at: timestamp, description: "Example event" };
  assert.equal(validate(event), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...event, actor_ip: "192.0.2.1", previous_properties: null }), true);
  assert.equal(validate({ ...event, actor_ip: null }), false);
  assert.equal(validate({ ...event, object_id: null }), false);
});

test("cursor metadata allows omission of next_cursor, not omission of has_more", () => {
  const validate = compile({ $ref: "#/components/schemas/EventList" });
  assert.equal(validate({ events: [], has_more: false }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ events: [], has_more: false, next_cursor: null }), true);
  assert.equal(validate({ events: [], has_more: true, next_cursor: eid }), true);
  assert.equal(validate({ events: [] }), false);
});

test("team member updates require a non-null role", () => {
  const validate = compile({ $ref: "#/components/schemas/TeamMemberUpdateRequest" });
  for (const role of ["admin", "manager", "member"]) assert.equal(validate({ role }), true);
  for (const input of [{}, { role: null }, { role: "unknown" }]) assert.equal(validate(input), false);
});

test("role upserts use their documented name set without restricting role reads", () => {
  const path = document.paths["/clusters/{cluster_id}/roles/{role_name}"];
  const parameter = path.put.parameters.map(resolve).find(item => item.name === "role_name");
  const validate = compile(parameter.schema);
  for (const name of ["application", "postgres", "user", `u_${eid}`]) assert.equal(validate(name), true);
  for (const name of ["arbitrary", "default", "u_invalid"]) assert.equal(validate(name), false);
  const readParameter = path.parameters.map(resolve).find(item => item.name === "role_name");
  assert.equal(compile(readParameter.schema)("default"), true);
});

test("provider rates and hardware counts are integers, while shared capacity can be fractional", () => {
  for (const [schema, fields] of [["ProviderDisk", ["rate", "rate_warehouse"]], ["Plan", ["cpu", "iops_baseline", "iops_maximum", "rate"]]]) {
    for (const field of fields) {
      const validate = compile(document.components.schemas[schema].properties[field]);
      assert.equal(validate(10), true, `${schema}.${field}`);
      assert.equal(validate(10.5), false, `${schema}.${field}`);
    }
  }
  for (const [schema, field] of [["Plan", "vcpu"], ["Plan", "memory"], ["Region", "multiplier"]]) {
    assert.equal(compile(document.components.schemas[schema].properties[field])(0.5), true);
  }
});

test("documented cluster request examples accept null collections and backup settings", () => {
  const create = compile({ $ref: "#/components/schemas/ClusterCreateRequest" });
  const base = { name: "Example", plan_id: "hobby-0", team_id: eid };
  assert.equal(create({ ...base, parameters: null, roles: null }), true, JSON.stringify(create.errors));
  assert.equal(create({ ...base, parameters: [{ name: "log_min_duration_statement", value: "1000" }], roles: [] }), true);
  assert.equal(create({ ...base, parameters: [null] }), false);
  assert.equal(create({ ...base, roles: [null] }), false);
  const update = compile({ $ref: "#/components/schemas/ClusterUpdateRequest" });
  assert.equal(update({ variable_backups: null }), true);
  assert.equal(update({ variable_backups: { daily: 10 } }), true);
  assert.equal(update({ variable_backups: { daily: "10" } }), false);
});

test("fork provider overrides require placement fields without inheriting the create-only network exclusion", () => {
  const validate = compile({ $ref: "#/components/schemas/ClusterForkRequest" });
  const fork = { name: "Example", network_id: eid, provider_id: "aws", plan_id: "hobby-0", region_id: "us-east-1" };
  assert.equal(validate(fork), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...fork, plan_id: null }), false);
  assert.equal(validate({ ...fork, region_id: null }), false);
});
