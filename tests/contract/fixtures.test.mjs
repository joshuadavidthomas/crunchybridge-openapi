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
