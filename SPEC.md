# Crunchy Bridge OpenAPI project specification

| Field | Value |
| --- | --- |
| Status | Active |
| Last updated | 2026-09-05 |
| Contract format | OpenAPI 3.1 YAML |
| Public API base URL | `https://api.crunchybridge.com` |
| Documented operations | 84 |
| Operations authored | 84 |
| Unauthenticated success operations observed | 5 |
| Authenticated operations contract-tested | 7 |
| Current source version | `0.1.1` |

## How to use this file

This file defines the project and tracks its progress. Update it in the same change as the work it records.

Checkboxes record three kinds of work:

- For authored files and operations, `[x]` means the source contains the change, `npm test` passes, and the work meets the acceptance rules below.
- For research or live verification, `[x]` means a source citation, sanitized test fixture, or completed check supports the claim.
- For decisions, `[x]` means the chosen outcome appears under Decisions and the matching item has left Open decisions.
- `[ ]` always means work remains. A partial draft stays unchecked.

An operation is complete when it has:

1. The exact method and path from an official source.
2. A stable `operationId`, tag, summary, description, and `x-docs-url`.
3. All documented path, query, header, and body inputs.
4. Documented success statuses, content types, response headers, and response schemas.
5. Shared error and rate-limit responses.
6. Deprecation, sensitivity, retry, disruption, and destruction metadata where they apply.
7. A note in this file for every unresolved conflict or undocumented shape.
8. A clean Redocly lint and bundle run.

A contract test is a separate claim. Authoring an operation does not imply that a live API response has confirmed it. The seven current authenticated checks validate sanitized response structures against the bundle. They preserve nulls and field presence, but use synthetic scalar values and omit event snapshots. Empty cluster and network lists do not validate item schemas. The certificate read has separate manual evidence and is not included in that count.

## Goal

Publish a complete, source-backed OpenAPI 3.1 description of the public Crunchy Bridge management API for generated clients and schema validators.

The OpenAPI document is the source. TypeScript types, Zod schemas, clients, MCP tools, and runtime adapters are generated or built from it.

## Deliverables

The project will provide:

- Modular OpenAPI 3.1 YAML under `openapi/`.
- A committed single-file bundle at `dist/openapi.yaml`, generated from the modular source and checked for freshness in CI.
- Reproducible linting and bundling through pinned tooling.
- Coverage records for every public docs page and documented operation.
- Source links and visible notes for contradictions or uncertain behavior.
- Agent-safety metadata for destructive, disruptive, sensitive, and long-running operations.
- Contract tests split by risk and cost.
- At least one generated TypeScript client and schema build as an interoperability check.
- A release and drift-detection process.

## Scope

### Included

- All operations documented by the 24 API resource pages in `pages.txt`.
- The four API concept pages: getting started, EIDs, event polling, and idempotency. Getting started defines authentication, pagination, errors, tracing, rate limits, and general HTTP behavior.
- Documented deprecated resources and fields. They remain part of the vendor's current public contract and must carry `deprecated: true`.
- Documented non-JSON responses, including the team certificate chain.
- Common errors, request IDs, rate limits, pagination, idempotency, and delete semantics.
- Enough examples to test schemas and make generated tools legible to agents.
- Read-only live contract checks against a real account when credentials become available.
- Opt-in mutation tests against disposable resources when cost and cleanup are bounded.

### Excluded

- Endpoints mentioned in prose but absent from the API reference. The Query page refers to get, list, results, and cancel behavior but documents only `POST /queries`; those missing endpoints stay out until an official source defines them.
- Dashboard-private endpoints, browser session APIs, and internal services.
- A hand-written Crunchy Bridge client as a second source of API types.
- Zod, Valibot, or TypeScript as the contract source.
- Compatibility aliases for incorrect field names or old local schema shapes.
- Destructive tests against a personal account, production team, or production cluster.
- Runtime integrations, custom MCP servers, and consumer approval-policy testing. These are separate from the OpenAPI contract and its release gates.

## Decisions

### Contract source

- Hand-maintain OpenAPI 3.1 YAML.
- Keep one path file and one schema file per documented resource where practical.
- Bundle the modular source with Redocly.
- Generate language-specific artifacts from the bundled OpenAPI document.
- Revisit TypeSpec only if repeated OpenAPI structure becomes a material maintenance cost. Do not move to Zod-first generation.

### Evidence order

Use sources in this order:

1. Current official Crunchy Bridge API docs, including rendered cURL examples.
2. Crunchy Data's generated Apiary API description documents. These expose useful machine structure but contain known copy, requiredness, and nullability defects, so the public pages remain authoritative when they differ.
3. Sanitized live API requests and responses.
4. First-party `CrunchyData/bridge-cli` and other CrunchyData client code.
5. Third-party clients and Jentic's unofficial OpenAPI document as cross-checks only.

Machine sources currently used:

- <https://crunchybridgeapi.docs.apiary.io/api-description-document>
- <https://crunchybridgeapiinternal.docs.apiary.io/api-description-document>

When sources conflict:

- Keep the documented public behavior unless live traffic proves the docs wrong.
- Record the conflict in the resource checklist and schema description.
- Use the least restrictive response schema that remains useful.
- Do not invent an enum member, required field, request parameter, endpoint, or status.
- Open a clarification issue before a stable release if the conflict affects callers.

### Schema policy

- Use OpenAPI 3.1 and JSON Schema 2020-12 syntax.
- Model null with JSON Schema unions such as `type: [string, "null"]` or `oneOf` when a `$ref` is involved.
- Keep optionality and nullability separate.
- Leave response objects open to added vendor fields with `additionalProperties: true` unless the API proves a closed shape.
- Close request objects with `additionalProperties: false` once every accepted field is known.
- Give request and response objects separate schemas when secrets, required fields, or visibility differ.
- Use `readOnly`, `writeOnly`, `deprecated`, formats, bounds, and enums only when the docs or live behavior support them.
- Define list envelopes explicitly. Do not assume every list has `has_more` and `next_cursor`; several pages omit them despite accepting pagination inputs.
- Preserve unusual documented statuses instead of normalizing them. Examples include `POST /access-tokens` and `POST /teams` returning `200`, and `PUT /clusters/{cluster_id}/upgrade` returning `201`.
- Treat fields rendered as “array of array” as unresolved until examples, live responses, or first-party models establish the item shape.
- Do not make response parsing reject new fields added by Crunchy Bridge.

### Naming policy

- Use lower camel case operation IDs: `listClusters`, `createCluster`, `getCluster`, `updateCluster`, `destroyCluster`.
- Name action operations by their effect: `restartCluster`, `approvePrivateLinkConnection`.
- Use PascalCase component names.
- Suffix request bodies with `Request`, list envelopes with `List`, and action responses with a concrete domain name rather than `Data` or `Payload`.
- Use the docs' field names verbatim.
- Use plural tags for top-level resource groups, matching the current `Accounts` tag.

### Common HTTP policy

- Apply bearer authentication globally. Override it when official docs or live traffic proves that an endpoint accepts another credential or no credential.
- Model both long-lived API keys and short-lived access tokens under the bearer scheme.
- Add the client-supplied `X-Request-Id` request header and the returned `X-Request-Id` response header.
- Add `Idempotency-Key` to documented `POST` and `PATCH` operations. Model the echoed `Idempotency-Key` and conditional `Idempotency-Replay` response headers.
- Mark `GET`, `PUT`, and `DELETE` operations idempotent. Mark `POST` and `PATCH` retryable only when an idempotency key is supplied or the endpoint has a stronger documented guarantee.
- Model `429` with `Retry-After` in seconds.
- Model documented `404` and `410` behavior. A repeated successful delete may return `410`; clients should treat `404` and `410` as absent resources where appropriate.
- Include a default JSON error response while the vendor's status-specific error contract remains incomplete.

### Agent metadata policy

Every operation must be classified before completion:

- `x-destructive: true` for irreversible data loss, credential revocation, account or team deletion, and equivalent actions.
- `x-disruptive: true` for restarts, suspension, failover, connectivity changes, firewall changes, role changes, and changes that may drop connections.
- `x-sensitive: true` when a request or response contains credentials, connection strings, tokens, private endpoints, or query results that should not enter logs.
- `x-idempotent: true` when the method or endpoint contract makes retries safe.
- `x-long-running: true` when the operation starts asynchronous work that callers must poll.
- `x-docs-url` on every operation.

Policy consumers should require explicit approval for destructive operations and normally require approval for disruptive operations. They should redact sensitive fields before logging tool results.

The contract keeps these flat extensions. HTTP method supplies the baseline `read` or `write` class; boolean extensions add independent hazards without forcing sensitive, disruptive, destructive, long-running, and cost-bearing effects into one ordered enum. `x-cost-bearing: true` marks operations that can start or increase billed infrastructure.

Redocly configurable rules require `x-docs-url` and a boolean `x-idempotent` on every operation. The recommended-strict ruleset and explicit example rules turn lint warnings into CI failures.

### Publication

- License the repository and contract under MIT.
- Publish versioned YAML assets through GitHub releases, with notes from `CHANGELOG.md`.
- Commit `dist/openapi.yaml` for consumers that follow the raw `main` URL. Keep source and bundle in the same change.
- Keep exploratory reports, approval transcripts, resource inventories, and per-session test plans out of the repository. Commit only sanitized fixtures used by tests and data needed by automated checks.

### Generated files

- Commit `dist/openapi.yaml` with every modular-source change. Generate it with `npm run bundle`; never hand-edit it.
- `npm test` rebuilds into a temporary directory and fails if the committed bundle differs. It does not silently repair a stale bundle.
- Do not hand-edit or commit generated TypeScript clients or Zod schemas. They remain downstream interoperability checks.
- Keep generated-code experiments outside the contract source directories.

## Current repository state

### Foundation

- [x] Add the OpenAPI 3.1 root at `openapi/openapi.yaml`.
- [x] Add modular `paths`, `schemas`, `headers`, and `responses` directories.
- [x] Add bearer authentication and the production server.
- [x] Add the shared EID schema.
- [x] Add a provisional shared error schema.
- [x] Confirm a live unauthenticated `401` contains `code`, `is_transient`, `message`, and `request_id`.
- [x] Add shared `X-Request-Id` and `Retry-After` response headers.
- [x] Add Redocly lint and bundle commands.
- [x] Add a pinned npm lockfile.
- [x] Add GitHub Actions configuration for `npm test`.
- [x] Commit `dist/openapi.yaml` and verify its freshness in CI so consumers can re-fetch a stable raw URL.
- [x] Observe the GitHub Actions workflow passing in the remote repository ([initial run](https://github.com/joshuadavidthomas/crunchybridge-openapi/actions/runs/33927904977)).
- [x] Choose and add a repository/spec license (MIT).
- [x] Add the shared `X-Request-Id` request parameter.
- [x] Add the shared `Idempotency-Key` request parameter.
- [x] Add shared idempotency response headers.
- [x] Add reusable cursor, limit, order, and cursor-envelope schemas without imposing them on non-paginated lists.
- [x] Add reusable EID path parameters without applying them to dual-form identifiers such as Postgres version ID-or-major-version.
- [x] Enforce source links, idempotency classification, and operation ID form with Redocly configurable rules.
- [x] Validate schema, parameter, and media-type examples with explicit recommended-strict Redocly rules.

### Coverage totals

| Area | Authored | Documented | Authenticated contract tests |
| --- | ---: | ---: | ---: |
| Access tokens | 2 | 2 | 0 |
| Account | 2 | 2 | 0 |
| Certificates | 1 | 1 | 0 |
| Changelogs | 2 | 2 | 0 |
| Events | 2 | 2 | 2 |
| Providers | 1 | 1 | 0 |
| Postgres versions | 2 | 2 | 0 |
| Teams | 5 | 5 | 1 |
| Team members | 5 | 5 | 2 |
| Networks | 3 | 3 | 1 |
| Network firewall rules | 5 | 5 | 0 |
| Deprecated cluster firewall rules | 4 | 4 | 0 |
| Network peerings | 4 | 4 | 0 |
| Private links | 3 | 3 | 0 |
| Private-link connections | 3 | 3 | 0 |
| Clusters | 16 | 16 | 1 |
| Cluster backups | 2 | 2 | 0 |
| Cluster loggers | 5 | 5 | 0 |
| Cluster replicas | 2 | 2 | 0 |
| Cluster upgrades | 4 | 4 | 0 |
| Configuration parameters | 4 | 4 | 0 |
| Metric views | 1 | 1 | 0 |
| Postgres roles | 5 | 5 | 0 |
| Queries | 1 | 1 | 0 |
| Total | 84 | 84 | 7 |

## API coverage checklist

### Access tokens

Source: <https://docs.crunchybridge.com/api/access-token>

- [x] Model `AccessToken`, create request, expiry choices, and creation-only secret fields.
- [x] `POST /access-tokens` — `createAccessToken` (`200`).
- [x] `DELETE /access-tokens/{access_token_id}` — `destroyAccessToken` (`200`).
- [x] Mark token creation and deletion sensitive; mark deletion destructive.
- [ ] Resolve the docs conflict between the one-week and one-month maximum expiry.
- [x] Keep deprecated `client_id`, `grant_type`, and response `expires_in` fields marked deprecated rather than removing them from the vendor contract.
- [x] Confirm with safe unauthenticated requests that `POST /access-tokens` authenticates through `client_secret` and does not require an existing bearer token.

### Account

Source: <https://docs.crunchybridge.com/api/account>

- [x] Model `Account`, including synthetic SSO account optionality.
- [x] `GET /account` — `getAccount` (`200`).
- [x] `DELETE /account` — `destroyAccount` (`200`).
- [x] Mark account deletion destructive and idempotent.
- [x] Record that `access_groups` is marked non-nullable but shown as `null`.
- [x] Record that `dashboard_settings` appears in the example but not the field table.
- [ ] Capture and validate an authenticated `GET /account` fixture.
- [x] Model `access_groups` as nullable arrays of `AccessGroupMinimal`, using the public Apiary schema.
- [x] Type dashboard preferences from the public example and internal Apiary field definitions.
- [ ] Keep `destroyAccount` out of every contract-test suite; model and review it without calling it.

### Certificates

Source: <https://docs.crunchybridge.com/api/certificate>

- [x] `GET /teams/{team_id}.pem` — `getTeamCertificate` (`200`).
- [x] Model `application/pem-certificate-chain` as a string response rather than JSON.
- [x] Verify that generated TypeScript preserves the `.pem` path suffix and types the PEM media body as a string.
- [x] Observe an authenticated Executor read returning `200`, `application/pem-certificate-chain`, and a PEM-prefixed string. Certificate bytes and cryptographic validity were not checked into fixtures.

### Changelogs

Source: <https://docs.crunchybridge.com/api/changelog>

- [x] Model `Changelog` and `ChangelogList`.
- [x] `GET /changelogs` — `listChangelogs` (`200`).
- [x] `GET /changelogs/{changelog_id_or_name}` — `getChangelog` (`200`).
- [x] Model the `component` filter enum and `id`-only ordering.
- [x] Use the endpoint-specific maximum limit of 200 from its structured definition.
- [x] Model the ID-or-name path parameter without claiming both forms use EID syntax.
- [x] Confirm both operations return `200` without authentication.

### Clusters

Source: <https://docs.crunchybridge.com/api/cluster>

- [x] Model `Cluster` and its nested resource schemas, including nullable arrays and disk data shown as null in examples.
- [x] Model `ClusterList`, `ClusterStatus`, status-upgrade, operation, action-message, create, update, fork, restart, and Tailscale request schemas.
- [x] `GET /clusters` — `listClusters` (`200`).
- [x] `POST /clusters` — `createCluster` (`201`).
- [x] `GET /clusters/{cluster_id}` — `getCluster` (`200`).
- [x] `PATCH /clusters/{cluster_id}` — `updateCluster` (`200`).
- [x] `DELETE /clusters/{cluster_id}` — `destroyCluster` (`200`).
- [x] `GET /clusters/{cluster_id}/status` — `getClusterStatus` (`200`).
- [x] `POST /clusters/{cluster_id}/forks` — `forkCluster` (`201`).
- [x] `PUT /clusters/{cluster_id}/actions/disable-ha` — `disableClusterHighAvailability` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/enable-ha` — `enableClusterHighAvailability` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/ping` — `pingCluster` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/restart` — `restartCluster` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/resume` — `resumeCluster` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/start-backup` — `startClusterBackup` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/suspend` — `suspendCluster` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/tailscale-connect` — `connectClusterToTailscale` (`200`).
- [x] `PUT /clusters/{cluster_id}/actions/tailscale-disconnect` — `disconnectClusterFromTailscale` (`200`).
- [x] Mark billed create/fork/HA/resume operations and disruptive or long-running lifecycle actions with applicable metadata.
- [x] Mark create and Tailscale credential input sensitive.
- [x] Mark destroy destructive; the global contract-test policy requires explicit opt-in and disposable resources.
- [x] Preserve the cluster list's documented default ordering by `name`.
- [x] Define the previously unnamed `ClusterDashboardSettings` and `ClusterUpdateVariableBackups` shapes from Apiary.
- [x] Accept null create-time `parameters`/`roles` and update-time `variable_backups` shown in public request examples.
- [x] Enforce RFC 1918 CIDRs with prefixes no longer than 20 bits for create, fork, and replica requests.
- [x] Keep provider/network exclusions specific to each endpoint; the fork docs require plan and region overrides but do not prohibit a network ID.
- [x] Separate `ClusterStatusUpgrade` from the standalone Phase 5 `ClusterUpgrade` resource.
- [x] Mark deprecated `disk_usage`, `cluster_id`, and `cpu` fields.
- [ ] Confirm whether Cluster update accepts an omitted body; its fields are optional and Apiary omits body-level requiredness.
- [x] Reject requests that provide both Tailscale credential forms.
- [ ] Confirm whether Tailscale connect accepts an omitted or empty request or requires exactly one credential field; the published schema requires neither.
- [ ] Resolve the operation-state prose value `scheduled` against the Apiary enum that omits it; do not add it without live evidence.

### Cluster backups

Source: <https://docs.crunchybridge.com/api/cluster-backup>

- [x] Model `ClusterBackup`, `ClusterBackupList`, `ClusterBackupToken`, and provider-specific credential objects.
- [x] `GET /clusters/{cluster_id}/backups` — `listClusterBackups` (`200`).
- [x] `POST /clusters/{cluster_id}/backup-tokens` — `createClusterBackupToken` (`201`).
- [x] Mark backup-token output sensitive and avoid storing examples with real credentials.
- [ ] Resolve whether the backup list has cursor metadata; the page accepts pagination inputs but omits `has_more` and `next_cursor` from the response.
- [ ] Confirm the example-derived `Backup` field types.
- [ ] Confirm whether the sparse GCP token shape is complete.

### Deprecated cluster firewall rules

Source: <https://docs.crunchybridge.com/api/cluster-firewall-rule>

- [x] Reuse the canonical firewall-rule response schema while keeping distinct legacy requests.
- [x] `GET /clusters/{cluster_id}/firewall` — `listClusterFirewallRules` (`200`).
- [x] `POST /clusters/{cluster_id}/firewall` — `createClusterFirewallRule` (`201`).
- [x] `PUT /clusters/{cluster_id}/firewall/{rule_id}` — `updateClusterFirewallRule` (`200`).
- [x] `DELETE /clusters/{cluster_id}/firewall/{rule_id}` — `destroyClusterFirewallRule` (`200`).
- [x] Mark the operations deprecated and point callers to network firewall rules.
- [x] Mark create, update, and destroy disruptive because they alter network access for the associated network.
- [x] Require bodies for legacy create and update because both require `rule`; record that the generated first-party description omits body requiredness.
- [ ] Resolve omitted cursor metadata in the list response.

### Cluster loggers

Source: <https://docs.crunchybridge.com/api/cluster-logger>

- [x] Model `ClusterLogger`, distinct create/update requests, and the cursor-less list response.
- [x] `GET /clusters/{cluster_id}/loggers` — `listClusterLoggers` (`200`).
- [x] `POST /clusters/{cluster_id}/loggers` — `createClusterLogger` (`201`).
- [x] `GET /clusters/{cluster_id}/loggers/{logger_id}` — `getClusterLogger` (`200`).
- [x] `PUT /clusters/{cluster_id}/loggers/{logger_id}` — `updateClusterLogger` (`200`).
- [x] `DELETE /clusters/{cluster_id}/loggers/{logger_id}` — `destroyClusterLogger` (`200`).
- [x] Keep the resource page's separate create/update contract; do not infer a `201` PUT upsert from older getting-started material.
- [x] Mark logger data sensitive because templates may contain ingestion credentials, and mutations disruptive because they alter external observability.
- [ ] Resolve omitted cursor metadata in the list response.

### Cluster replicas

Source: <https://docs.crunchybridge.com/api/cluster-replica>

- [x] Reuse the canonical cluster response schema and model the replica request.
- [x] `POST /clusters/{cluster_id}/replicas` — `createClusterReplica` (`201`).
- [x] `PUT /clusters/{cluster_id}/actions/detach` — `detachClusterReplica` (`200`).
- [x] Mark replica creation as cost-bearing and long-running.
- [x] Reject enforceable invalid placement combinations and provider selection without both plan and region in JSON Schema.
- [x] Mark detach disruptive, long-running, and idempotent.
- [x] Preserve documented mutual-exclusion rules among network, provider, and region inputs in the operation description.

### Cluster upgrades

Source: <https://docs.crunchybridge.com/api/cluster-upgrade>

- [x] Model `ClusterUpgrade`, reuse canonical operation entries, and define create/update requests.
- [x] `GET /clusters/{cluster_id}/upgrade` — `getClusterUpgrade` (`200`).
- [x] `POST /clusters/{cluster_id}/upgrade` — `createClusterUpgrade` (`201`).
- [x] `PUT /clusters/{cluster_id}/upgrade` — `updateClusterUpgrade` (`201`).
- [x] `DELETE /clusters/{cluster_id}/upgrade` — `cancelClusterUpgrade` (`200`).
- [x] Mark upgrade creation and changes disruptive, cost-bearing where relevant, and long-running.
- [x] Preserve the unusual `201` update status.
- [x] Resolve the `operations` item shape from Apiary and share it with Cluster status.
- [x] Resolve malformed `postgres_version_id` prose as a major integer, EID, or null from Apiary.
- [x] Record refresh, resize, and major-version work as modes of the same operation family.
- [x] Describe the pre-failover update boundary and rescheduling/rebuild behavior.
- [x] Reject update requests that provide both scheduling modes.
- [ ] Confirm whether upgrade create/update require a request body; every field is optional and Apiary omits body-level requiredness.
- [ ] Resolve the current `200` cancel response against an old first-party CLI fixture that expected `204`.

### Configuration parameters

Source: <https://docs.crunchybridge.com/api/configuration-parameter>

- [x] Model supported parameters, cluster parameter values, list responses, reset semantics, and batch update request.
- [x] `GET /configuration-parameters` — `listSupportedConfigurationParameters` (`200`, unpaginated).
- [x] `GET /clusters/{cluster_id}/configuration-parameters` — `listClusterConfigurationParameters` (`200`, unpaginated).
- [x] `PUT /clusters/{cluster_id}/configuration-parameters` — `updateClusterConfigurationParameters` (`200`).
- [x] `GET /clusters/{cluster_id}/configuration-parameters/{configuration_parameter_name}` — `getClusterConfigurationParameter` (`200`).
- [x] Document colon-bearing names such as `postgres:log_statement` in the path parameter.
- [x] Mark updates disruptive when `allow_restart` can restart Postgres.
- [x] Resolve both list item shapes from Apiary instead of accepting the rendered “array of array” text.
- [ ] Confirm Apiary's non-null `min_value` and `max_value` against the first-party CLI's nullable fields.

### Events

Source: <https://docs.crunchybridge.com/api/event>

- [x] Model `Event`, open-ended event data, previous properties, and `EventList`.
- [x] `GET /events` — `listEvents` (`200`).
- [x] `GET /events/{event_id}` — `getEvent` (`200`).
- [x] Model mutually exclusive `cluster_id` and `team_id` filters.
- [x] Model repeatable `kind`, `delay`, cursor, ordering, and the endpoint-specific limit maximum of 200.
- [x] Document 90-day retention and the rule that descriptions must not be parsed.
- [x] Add event-polling instructions that seed from the newest event and then read in ascending order with delay.
- [x] Keep event `data` and `previous_properties` open because their shape depends on event kind.
- [ ] Resolve whether `delay` is integer seconds or a duration string; the current union records both conflicting doc forms.
- [x] Make actor, request, and historical context optional as declared by the public Apiary schema; keep `actor_ip` non-null when present and `previous_properties` nullable as shown in the public example.
- [ ] Validate system-generated events and nonempty historical snapshots against live responses.

### Metric views

Source: <https://docs.crunchybridge.com/api/metric-view>

- [x] Model metric view, category, series, and interval objects.
- [x] `GET /metric-views/{name}` — `getMetricView` (`200`).
- [x] Model the metric-name enum.
- [x] Document the alternative time windows: paired `begin` and `end`, or `period`. Custom windows must last at least one minute; separate OpenAPI query schemas cannot enforce timestamp ordering.
- [x] Model `resolution_multiplier` as `1`, `2`, `4`, or `8`.
- [x] Resolve the rendered “array of array” series shape from the first-party machine description.
- [x] Mark interval `time` deprecated in favor of `period_begin`, omit the example-only `events` field, and add a schema-checked response example.

### Networks

Source: <https://docs.crunchybridge.com/api/network>

- [x] Model `Network`, update request, and `NetworkList`.
- [x] `GET /networks` — `listNetworks` (`200`).
- [x] `GET /networks/{network_id}` — `getNetwork` (`200`).
- [x] `PATCH /networks/{network_id}` — `updateNetwork` (`200`).
- [x] Preserve optional, nullable `cidr4` during network creation.
- [ ] Decide whether an empty update body is valid; the docs mark every update field optional.
- [x] Do not add create or destroy operations that the docs do not publish.

### Network firewall rules

Source: <https://docs.crunchybridge.com/api/network-firewall-rule>

- [x] Model `FirewallRule`, current and legacy request schemas, and the cursor-less documented list response.
- [x] `GET /networks/{network_id}/firewall-rules` — `listNetworkFirewallRules` (`200`).
- [x] `POST /networks/{network_id}/firewall-rules` — `createNetworkFirewallRule` (`201`).
- [x] `GET /networks/{network_id}/firewall-rules/{rule_id}` — `getNetworkFirewallRule` (`200`).
- [x] `PATCH /networks/{network_id}/firewall-rules/{rule_id}` — `updateNetworkFirewallRule` (`200`).
- [x] `DELETE /networks/{network_id}/firewall-rules/{rule_id}` — `destroyNetworkFirewallRule` (`200`).
- [x] Classify all firewall mutations as disruptive. Deletion is reversible by recreation, so it is not classified as irreversible data loss.
- [x] Use `order_field=rule` from the structured parameter enum and record the conflicting `cidr` prose.
- [x] Require the create body because `rule` is required; keep the all-optional update body optional as declared by the machine description.
- [ ] Resolve omitted cursor metadata in the list response.

### Network peerings

Source: <https://docs.crunchybridge.com/api/network-peering>

- [x] Model `Peering`, create request, status enum, and cursor-less documented list response.
- [x] `GET /networks/{network_id}/peerings` — `listNetworkPeerings` (`200`).
- [x] `POST /networks/{network_id}/peerings` — `createNetworkPeering` (`201`).
- [x] `GET /networks/{network_id}/peerings/{peering_id}` — `getNetworkPeering` (`200`).
- [x] `DELETE /networks/{network_id}/peerings/{peering_id}` — `destroyNetworkPeering` (`200`).
- [x] Mark every peering operation sensitive because provider identifiers expose customer-cloud topology.
- [x] Mark create and destroy disruptive and long-running where asynchronous states require polling.
- [x] Require the create body because `peer_identifier` is required; record that the generated first-party description omits body requiredness.
- [ ] Resolve omitted cursor metadata in the list response.

### Postgres roles

Source: <https://docs.crunchybridge.com/api/postgres-role>

- [x] Model `PostgresRole`, update request, redacted list/delete variants, and list response.
- [x] `GET /clusters/{cluster_id}/roles` — `listPostgresRoles` (`200`).
- [x] `POST /clusters/{cluster_id}/roles` — `createPostgresRole` (`201`).
- [x] `GET /clusters/{cluster_id}/roles/{role_name}` — `getPostgresRole` (`200`).
- [x] `PUT /clusters/{cluster_id}/roles/{role_name}` — `upsertPostgresRole` (`201` only).
- [x] `DELETE /clusters/{cluster_id}/roles/{role_name}` — `destroyPostgresRole` (`200`).
- [x] Mark credential-bearing responses sensitive and role mutations disruptive; deletion is destructive.
- [x] Model repeatable `account_id` filtering with Apiary's nullable item shape.
- [x] Constrain upsert names to `application`, `postgres`, `user`, and `u_<account_id>` as documented for PUT. Keep read/delete names open, including deprecated `default` roles.
- [x] Keep create bodyless: public docs declare none and the first-party CLI sends an empty object only as transport behavior.
- [x] Preserve the sole documented `201` upsert status; no first-party evidence confirms `200` on update.
- [ ] Confirm whether the all-optional upsert request body may be omitted.
- [ ] Resolve missing role-list cursor metadata despite accepted pagination inputs.

### Postgres versions

Source: <https://docs.crunchybridge.com/api/postgres-version>

- [x] Model `PostgresVersion` and the unpaginated list response.
- [x] `GET /postgres-versions` — `listPostgresVersions` (`200`).
- [x] `GET /postgres-versions/{postgres_version_id}` — `getPostgresVersion` (`200`).
- [x] Model the optional `team_id` filter.
- [x] Model the path parameter as EID or major-version string.
- [x] Confirm both operations return `200` without authentication for the default catalog.

### Private links

Source: <https://docs.crunchybridge.com/api/private-link>

- [x] Model `ClusterPrivateLink` and its asynchronous status enum.
- [x] `GET /clusters/{cluster_id}/private-link` — `getClusterPrivateLink` (`200`, documented `404` when absent).
- [x] `POST /clusters/{cluster_id}/private-link` — `createClusterPrivateLink` (`201`).
- [x] `DELETE /clusters/{cluster_id}/private-link` — `destroyClusterPrivateLink` (`200`).
- [x] Mark creation and destruction disruptive, sensitive, and long-running.
- [x] Document the singleton lifecycle; do not add a list operation.

### Private-link connections

Source: <https://docs.crunchybridge.com/api/private-link-connection>

- [x] Model `ClusterPrivateLinkConnection` and the unpaginated list response.
- [x] `GET /clusters/{cluster_id}/private-link-connections` — `listClusterPrivateLinkConnections` (`200`).
- [x] `POST /clusters/{cluster_id}/private-link-connections/{connection_id}/actions/approve` — `approveClusterPrivateLinkConnection` (`200`).
- [x] `POST /clusters/{cluster_id}/private-link-connections/{connection_id}/actions/reject` — `rejectClusterPrivateLinkConnection` (`200`).
- [x] Mark list output sensitive and approval/rejection disruptive and sensitive.
- [x] Do not add create or delete operations; customer-cloud endpoint creation controls connection appearance.

### Providers

Source: <https://docs.crunchybridge.com/api/provider>

- [x] Model provider, disk pricing, plan, region, and the unpaginated provider list response.
- [x] `GET /providers` — `listProviders` (`200`).
- [x] Model the optional `team_id` filter and its effect on available plans.
- [x] Resolve the response item shapes hidden behind the docs' “array of array” rendering.
- [x] Confirm the default provider catalog returns `200` without authentication.
- [ ] Resolve the declared optional/nullable `Provider.id` against live responses that always include a non-null value.

### Queries

Source: <https://docs.crunchybridge.com/api/query>

- [x] Model query request, query state, typed row matrix, inline result, and result-field shapes.
- [x] `POST /queries` — `createQuery` (`201`).
- [x] Mark SQL, results, and connection context sensitive.
- [x] Classify the operation for its write-capable, outside-transaction, and privileged modes.
- [x] Reject the `skip_tx: true` plus `async: true` combination with JSON Schema and a bundled-schema validation check.
- [x] Include `created_at`, `expires_at`, and `n` while stating that their semantics are unpublished.
- [x] Exclude the mentioned but undocumented get, list, results, and cancel endpoints until first-party docs define them.
- [x] Include publicly listed `is_insight_query` and `is_system_query` fields with private-context warnings.
- [x] Override Apiary's incorrect object-only result cell type with unrestricted JSON values because its own example contains numbers.
- [x] Add schema-checked request and response examples with a numeric result cell.

### Teams

Source: <https://docs.crunchybridge.com/api/team>

- [x] Model `Team`, `TeamAutomaticSSOJoin`, billing-address request/response shapes, requests, and `TeamList`.
- [x] `GET /teams` — `listTeams` (`200`).
- [x] `POST /teams` — `createTeam` (`200`).
- [x] `GET /teams/{team_id}` — `getTeam` (`200`).
- [x] `PATCH /teams/{team_id}` — `updateTeam` (`200`).
- [x] `DELETE /teams/{team_id}` — `destroyTeam` (`200`).
- [x] Preserve the unusual `200` create status and list ordering default of `name`.
- [x] Mark reads sensitive, deletion destructive, and access/billing/support updates disruptive, sensitive, and potentially cost-bearing.
- [x] Record the create/update naming drift around the deprecated automatic-SSO default role field.
- [ ] Clarify team deletion behavior when provisioned clusters exist.
- [x] Capture an authenticated Team fixture with `is_personal` present, `automatic_sso_join: null`, and `billing_address: null`; correct response billing-address nullability without changing the update request.
- [ ] Confirm null update semantics and empty PATCH behavior with a disposable team.
- [ ] Resolve `default_role_flavor` prose that omits the declared `nologin` enum value.

### Team members

Source: <https://docs.crunchybridge.com/api/team-member>

- [x] Model `TeamMember`, nested account and access-group summaries, requests, and `TeamMemberList`.
- [x] `GET /teams/{team_id}/members` — `listTeamMembers` (`200`).
- [x] `POST /teams/{team_id}/members` — `createTeamMember` (`201`).
- [x] `GET /teams/{team_id}/members/{account_id}` — `getTeamMember` (`200`).
- [x] `PUT /teams/{team_id}/members/{account_id}` — `updateTeamMember` (`200`).
- [x] `DELETE /teams/{team_id}/members/{account_id}` — `removeTeamMember` (`200`).
- [x] Mark reads sensitive, membership and role changes disruptive, and removal destructive.
- [x] Preserve account-ID addressing even though the resource also has an `id` field.
- [x] Mark duplicated flat account fields deprecated in favor of the nested account object.
- [x] Describe the overlap between create and update, both of which may add a member.
- [ ] Determine how callers remove an invitation whose member has no `account_id`.
- [ ] Confirm nullable `account`, `access_groups`, and `role` shapes with invited and active member responses.

## Shared concept checklist

### Authentication and access tokens

Source: <https://docs.crunchybridge.com/api-concepts/getting-started>

- [x] Define bearer authentication at the root.
- [x] Document API-key and access-token use without putting real secrets in examples.
- [ ] Define access-token lifetime and creation rules after resolving the docs conflict.
- [x] Confirm that `POST /access-tokens` uses the body `client_secret` without bearer authentication and override global security with `security: []`.
- [x] Confirm unauthenticated access to Changelogs, Providers, and Postgres Versions. Changelogs disable security; Provider and Postgres Version allow either bearer or anonymous access because `team_id` can select caller-specific availability.

### EIDs

Source: <https://docs.crunchybridge.com/api-concepts/eid>

- [x] Define lowercase, 26-character Base32 EIDs with the correct alphabet and canonical final-character restriction.
- [ ] Add separate descriptions for random and time-ordered EIDs where ordering matters.
- [ ] Verify EID regex behavior in generated clients.
- [ ] Avoid applying the EID schema to ID-or-name and ID-or-major-version parameters.

### Pagination

Source: <https://docs.crunchybridge.com/api-concepts/getting-started>

The getting-started page defines the general behavior; each resource page may override its limits, order fields, or response envelope.

- [x] Define reusable cursor, limit, order, and cursor-envelope components.
- [x] Keep endpoint-specific order fields, defaults, and limit maxima in each operation.
- [ ] Resolve the global maximum of 100 versus page-level maxima of 200.
- [ ] Confirm response cursor fields for pages that accept pagination but omit cursor metadata.
- [ ] Add a pagination example that stops on `has_more: false` and sends `next_cursor` unchanged.

### Event polling

Source: <https://docs.crunchybridge.com/api-concepts/event-polling>

- [x] Document the initial newest-event query.
- [x] Document ascending cursor reads with a stream delay.
- [x] Preserve the 30-second maximum request duration.
- [x] Add an agent/client note to drain pages immediately while `has_more` is true.

### Idempotency

Source: <https://docs.crunchybridge.com/api-concepts/idempotency>

- [x] Define `Idempotency-Key` as a UUID request header.
- [x] Define echoed `Idempotency-Key` and conditional `Idempotency-Replay` response headers.
- [x] Document the one-hour server retention window.
- [x] Document `409` for key reuse with a changed request or an in-flight duplicate.
- [x] Document that stored failures replay except transient `429`, `500`, and `503` responses.
- [x] Apply the header to every currently authored `POST` and `PATCH` operation.
- [x] Apply the header to all `POST` and `PATCH` operations.
- [x] Mark documented no-op action retries, such as replica detach and cluster restart, explicitly idempotent and describe their retry bounds.

### Errors, tracing, and rate limits

Source: <https://docs.crunchybridge.com/api-concepts/getting-started>

- [x] Model guaranteed `message` and `request_id` fields.
- [x] Type error codes and multi-factor challenge data from the public Apiary schemas; retain the public docs' required `message` and `request_id` fields.
- [x] Model `X-Request-Id` on current responses.
- [x] Model `Retry-After` on `429`.
- [x] Add the client-supplied `X-Request-Id` request header.
- [ ] Capture sanitized `400`, `403`, `404`, `409`, `410`, and `429` examples when safe.
- [ ] Determine the non-null type and value set of `code`.
- [ ] Determine whether `is_transient`, `code`, `message`, and `request_id` are always present.
- [ ] Decide whether to use one error schema or status-specific variants after evidence exists.

## Implementation plan

Phases show the intended order. Phase 0's schema and tooling work must settle before broad resource authoring; owner-controlled gates such as licensing and a remote CI run may remain open. Later phases may overlap when their named dependencies exist; each phase status records its own work rather than a global lock.

Allowed statuses are `not started`, `in progress`, `blocked`, and `exited`.

### Phase 0: foundation

Status: exited; shared contract tooling, MIT licensing, and the first remote GitHub Actions run pass.

Work:

- Finish shared headers, parameters, error responses, schema conventions, and agent metadata rules.
- Add a license after the owner chooses one.
- Turn the conventions in this file into Redocly rules where a machine can enforce them.
- Keep Account as the reference resource and revise it when the common pieces settle.

Exit gate:

- `npm test` passes under Redocly's recommended-strict ruleset, which promotes warnings to errors.
- `npm run check:bundle` confirms that the generated bundle contains no external `$ref` values.
- Account contains the settled root security, request-ID, source-link, idempotency, risk, success-response, `401`, `410`, `429`, and default-error conventions.
- The GitHub Actions job has passed remotely.

### Phase 1: contract mechanics

Status: exited.

Resources: Access tokens and Events.

Why these come first:

- Access tokens establish request bodies, secret fields, deprecations, alternate expiry inputs, and sensitive output.
- Events establish the full pagination envelope, repeatable filters, mutual exclusion, open event data, and long polling.

Exit gate:

- Both resources meet the operation completion rules.
- Shared idempotency and pagination components exist.
- At least one generated TypeScript client compiles these operations.
- No secret appears in committed examples or test output.

### Phase 2: low-risk reference and identity resources

Status: in progress; all operations are authored. Team and active Team Member fixtures pass. Team lists, invitations, and SSO-enabled variants need more coverage.

Resources: Certificates, Changelogs, Providers, Postgres versions, Teams, and Team members.

Work:

- Establish non-JSON output, unpaginated lists, ID-or-name lookup, nested reference data, full CRUD, deprecated fields, and membership addressing.
- Use read-only live calls for list/get verification.
- Keep create/update/delete contract tests disabled unless a disposable team is available.

Exit gate:

- Every operation in the phase is authored.
- Read-only endpoints have sanitized fixtures or recorded manual evidence.
- Generated clients preserve certificate media type, mixed identifiers, and repeatable query parameters.

### Phase 3: network resources

Status: in progress; all 22 operations are authored. An empty NetworkList fixture passes. Populated network responses need verification.

Resources: Networks, network firewall rules, deprecated cluster firewall rules, network peerings, private links, and private-link connections.

Work:

- Share schemas across deprecated and current firewall routes without hiding route differences.
- Classify all connectivity mutations for approval.
- Model async statuses and absent singleton behavior.
- Resolve missing pagination cursor fields from live read calls where possible.

Exit gate:

- Every network operation is authored.
- Deprecated paths point to their replacements.
- Agent metadata blocks unattended connectivity changes by default.
- Read-only network calls validate against the schemas.

### Phase 4: cluster core

Status: in progress; all 16 operations are authored. An empty ClusterList fixture passes. Cluster get/status fixtures need verification.

Resources: Cluster list/create/get/update/delete/status plus cluster actions.

Work:

- Build the central Cluster schema from docs, CLI models, examples, and read-only live data.
- Split create, update, status, action, and response shapes.
- Model costs, async states, restarts, suspension, HA changes, backup actions, and Tailscale actions.
- Keep destructive and cost-bearing contract tests behind explicit environment flags.

Exit gate:

- All 16 Cluster operations are authored.
- List/get/status responses validate against sanitized fixtures.
- Offline checks verify unique operation names, resolved input schemas, and documented request constraints.
- Destructive operations carry approval metadata.

### Phase 5: cluster adjunct resources

Status: in progress; all 22 operations are authored. Authenticated fixtures and redaction checks remain open.

Resources: Backups, loggers, replicas, upgrades, configuration parameters, and Postgres roles.

Work:

- Reuse Cluster without copying its schema.
- Settle provider-specific backup tokens, logger upsert behavior, replica detach idempotency, upgrade operation entries, colon-bearing config names, and secret-bearing role responses.
- Verify every resource-specific status rather than replacing it with generic CRUD expectations.

Exit gate:

- Every operation in the phase is authored.
- Sensitive outputs have redaction guidance.
- Disruptive actions carry the corresponding operation metadata.
- All remaining “array of array” gaps have either a concrete schema or a visible unresolved note.

### Phase 6: metrics and queries

Status: exited; both operations are authored, generated TypeScript and Zod preserve the known metric/query structure, semantic conflicts have Ajv checks, and undocumented Query routes remain absent.

Resources: Metric views and Queries.

Work:

- Model metric series containing interval objects from examples and the first-party machine description.
- Model safe query creation without claiming undocumented lifecycle endpoints.
- Express valid time-window combinations and query-mode conflicts.
- Keep SQL and results out of logs and snapshots unless sanitized.

Exit gate:

- The two documented operations are authored.
- Generated clients represent metric interval objects and query result rows without collapsing known structure to `any`.
- Undocumented query endpoints remain absent.

### Phase 7: contract verification

Status: in progress; seven sanitized authenticated response fixtures validate offline against their bundled GET schemas. Certificate media handling has separate manual evidence. Remaining read coverage, automated live capture, and opt-in mutation suites are still open.

Work:

- Add a test harness that validates sanitized responses against the bundled schemas.
- Split tests into public unauthenticated, authenticated read-only, opt-in mutation, and opt-in destructive/cost-bearing suites.
- Add fixtures only after removing tokens, passwords, connection strings, personal data, SQL, and customer identifiers.
- Test documented error statuses where requests are safe and deterministic.
- Track endpoints that cannot be tested without spending money or harming resources.

Exit gate:

- Every read-only operation has a passing contract check or a written reason it cannot.
- Mutation tests create disposable resources, clean them up, and fail safely if cleanup cannot run.
- Default CI never contacts the live API and never needs secrets.
- Secret scanning passes on fixtures and logs.

### Phase 8: generated contract checks

Status: exited; OpenAPI TypeScript and Hey API output compile, and generated Zod validators pass runtime tests.

Exit gate:

- Generated TypeScript covers all operation IDs and compiles without hand edits.
- Generated types preserve representative required inputs, enums, nullable fields, arrays, and request bodies.
- Generated validators pass positive and negative tests. Ajv checks JSON Schema constraints that generators cannot preserve.

### Phase 9: release and drift control

Status: in progress; previews through `v0.1.1` are published. Release comparison and weekly documentation drift checks are implemented and tested in CI. Stable-release live-contract checks remain open.

Work:

- Choose the project license and release location.
- Publish the bundled YAML at a stable, versioned URL and attach it to releases.
- Add `oasdiff` or an equivalent breaking-change report between releases.
- Add a scheduled job that checks the URLs in `pages.txt` and the API changelog for changes.
- Store content hashes or compact extracted evidence rather than a silent, lossy scrape of the full docs.
- Require human review when docs extraction changes an enum, required field, status, or destructive operation.
- Add release notes that separate vendor API changes from corrections to this unofficial contract.

Exit gate:

- A tagged prerelease exposes the bundle at a stable URL.
- A consumer can pin an immutable version.
- Drift checks report source changes without rewriting the contract automatically.
- The completion definition below is met before `1.0.0`.

## Verification plan

### Current local gate

```sh
npm test
```

This runs:

```sh
npm run lint
npm run check:bundle-fresh
npm run lint:bundle
npm run check:bundle
npm run check:fixtures
npm run check:maintenance
npm run check:generated
npm run check:hey-api
```

### Planned automated gates

- [x] Lint the modular source with Redocly.
- [x] Bundle to one OpenAPI 3.1 YAML file and reject a stale committed bundle without overwriting it.
- [x] Lint the bundle as a standalone document.
- [x] Assert that the bundle contains no external `$ref` values.
- [x] Validate all committed schema, parameter, and media-type examples.
- [x] Assert operation ID uniqueness and lower-camel naming.
- [x] Assert every operation has a Crunchy Bridge `x-docs-url`.
- [x] Assert the bundle operation count matches `SPEC.md`, generated operation IDs have an exhaustive type-only map, and the standalone YAML contains no aliases.
- [x] Assert every operation has a description and every POST/PATCH exposes idempotency request, conflict, and replay contracts.
- [x] Assert all 84 method/path/success-status combinations against `tests/contract/operations.yaml`, grouped by their public source pages.
- [x] Assert the anonymous-access classification for every operation.
- [x] Validate compact unauthenticated observation records against operation IDs, statuses, and effective security.
- [x] Validate high-risk request invariants and backup-token provider variants against the bundled JSON Schemas with Ajv.
- [x] Require every mutation to carry an agent-risk flag or appear in the reviewed low-risk allowlist, and pin critical operations to their required flag sets.
- [x] Generate OpenAPI TypeScript declarations and compile the `openapi-fetch` smoke client.
- [x] Generate and compile Hey API's TypeScript and Zod outputs; use Ajv 2020 for semantic keywords the Zod generator cannot preserve.
- [x] Report breaking changes against the newest published bundle with pinned oasdiff, plus explicit agent-risk and idempotency flag comparisons. Historical `v0.1.0` comparison correctly reports the billing-address correction.
- [x] Check all 28 source pages, the API resource index, and the complete public changelog against stored hashes. Report resource inventory changes and schedule weekly checks without modifying schemas or baselines.
- [ ] Run secret scanning on the repository and fixtures.
- [x] Run offline contract tests against sanitized fixtures (seven operations; empty collections and synthetic scalars have explicit coverage limits).
- [ ] Run authenticated read-only tests only in an explicitly configured environment.
- [ ] Run mutation tests only with disposable resource IDs and opt-in flags.

### Manual checks before each release

- [ ] Compare every changed operation with its official docs page.
- [ ] Review changed operation names, descriptions, and risk metadata.
- [ ] Confirm that auth credentials stay outside prompts, generated code, fixtures, and logs.
- [ ] Confirm that examples contain no real account, team, cluster, email, endpoint, token, SQL, or customer data.
- [ ] Review unresolved questions and block stable release on contract-breaking unknowns.

## Live-test safety

Use four test levels:

| Level | Contents | Default |
| --- | --- | --- |
| 0 | Lint, bundle, generation, fixture validation | On |
| 1 | Unauthenticated errors and public-safe behavior | On only when network tests are requested |
| 2 | Authenticated read-only list/get operations | Off; requires `CRUNCHY_API_KEY` |
| 3 | Mutations on disposable resources | Off; requires `CRUNCHY_CONTRACT_MUTATIONS=1` and exact resource IDs |
| 4 | Destructive, disruptive, or cost-bearing operations | Off; requires `CRUNCHY_CONTRACT_DANGEROUS=1`, an operation allowlist, exact resource IDs, a written test plan, and explicit approval |

Rules:

- Never print `CRUNCHY_API_KEY` or access tokens.
- Never store raw credential-bearing responses.
- Never create a cluster merely to satisfy routine CI.
- Never call `destroyAccount` in any contract test, including tests against synthetic or disposable accounts.
- Never target production resources.
- Level 4 also requires `CRUNCHY_CONTRACT_ALLOW` with the exact permitted operation IDs; a broad wildcard is invalid.
- Track every resource created by a test and attempt bounded cleanup by exact ID.
- If cleanup fails, stop and report the exact resource ID without issuing broader delete commands.
- Treat query text and results as sensitive even when the query is read-only.

## Drift policy

Crunchy Data publishes public docs and generated Apiary descriptions, but it does not advertise a stable, versioned OpenAPI release. Source drift still needs its own control:

1. Keep every source page in `pages.txt`.
2. Link every operation to its section with `x-docs-url`.
3. Check the pages and changelog on a schedule.
4. Produce a review report when content changes; never auto-merge generated schema edits.
5. Recheck first-party CLI models when resource fields change.
6. Use live read-only traffic to settle nullability and response-envelope questions.
7. Release corrections with a note that says whether Crunchy Bridge changed or this project corrected an earlier reading.

Changes that require manual review:

- A new or removed operation.
- A method or path change.
- A new required request field.
- A narrowed enum or bound.
- A success-status or content-type change.
- A field that becomes sensitive.
- A change in destructive or disruptive effect.
- A pagination or idempotency change.

## Known gaps and risks

| Gap | Risk | Planned resolution |
| --- | --- | --- |
| Global pagination max says 100 while resource pages say 200 | Valid requests may be rejected by generated validation | Use endpoint-specific maxima and keep the conflict recorded |
| Several paginated list schemas omit cursor metadata | Clients may stop after one page or model a false envelope | Verify with live read-only calls before claiming fields |
| Docs render many collection fields as “array of array” | Generated types may become nested arrays or `unknown` | Use named resource examples, CLI models, and live fixtures |
| Account fields conflict with its example | Live responses may differ from the source-backed schema | Capture stored and synthetic SSO account fixtures; item types and optionality now have offline regression tests |
| Event `delay` is called an integer while examples use `10s` and `30s` | Clients may send the wrong wire type | Keep the integer-or-duration union until a safe live request settles it |
| Event historical context varies by event kind | Synthetic tests cannot confirm every live variant | Capture system-generated events and nonempty update snapshots |
| Provider `id` is declared optional and nullable but always appears live | Generated callers may handle an impossible null or the schema may reject a future edge case | Keep the declared shape until authenticated or broader evidence settles it |
| Team examples and field tables disagree on SSO settings and role flavor | Clients may misread missing or null fields | Extend the existing Team fixture coverage to SSO-enabled teams |
| Invited team members may have no `account_id`, but removal requires one | Callers may be unable to revoke a pending invitation | Ask Crunchy Data or capture dashboard traffic; do not invent an email- or member-ID route |
| Query prose mentions undocumented endpoints | Adding them would create an unsupported contract | Keep them excluded until official documentation appears |
| Some writes return unusual statuses | Generic generators may assume CRUD defaults | Preserve exact statuses and test generated clients |
| `openapi-typescript` makes declared response-header keys required even when the Header Object says `required: false` | Generated clients may overstate `Idempotency-Key` and `Idempotency-Replay` presence | Record the generator limitation and compare runtime-validator/client generators in Phase 8 |
| Live mutation tests can cost money or damage data | Verification could become unsafe | Keep them opt-in, bounded, and tied to disposable resources |
| Generated first-party Apiary descriptions exist but are unversioned and contain schema defects | Treating them as a canonical release could import bad requiredness, nullability, or copy errors | Diff both Apiary documents, keep public docs authoritative, and review every machine-derived change |

## Open decisions

Resolve these before the named phase exits:

- [x] Before Phase 0 exits: choose the repository and spec license (MIT).
- [ ] Before `1.0.0`: settle the access-token default and maximum lifetime.
- [x] Before Phase 2 exits: choose a sanitized fixture format and redaction procedure (`tests/contract/fixtures.yaml` and `tests/contract/README.md`; sanitize before emitting from Executor).
- [x] Before Phase 8 exits: choose the generator checks (OpenAPI TypeScript and Hey API TypeScript/Zod).
- [x] Before Phase 9 exits: choose the stable publication URL and release version policy (GitHub release assets at `/releases/download/v<version>/openapi.yaml`, starting with a `0.1.0` preview; `1.0.0` still requires the stable-release checks).

## Stable-release completion definition

Version `1.0.0` requires all of the following:

- [ ] All 84 documented operations meet the operation completion rules.
- [ ] Every documented schema field is modeled or called out as unresolved with a source-backed reason.
- [x] Every public docs page in `pages.txt` maps to a checklist section here.
- [x] Shared authentication, EID, pagination, idempotency, request ID, error, and rate-limit behavior is modeled.
- [x] Deprecated fields and operations carry `deprecated: true`.
- [ ] Destructive, disruptive, sensitive, idempotent, long-running, and cost-bearing operations have settled metadata.
- [x] The modular source and bundled document lint without warnings.
- [x] The bundle contains no external references.
- [ ] Committed examples validate and contain no secrets or personal data.
- [ ] Read-only contract checks cover every endpoint that a test account can reach.
- [ ] Untested writes and destructive operations are listed with their safety reason.
- [x] A generated TypeScript client and validator set compile without hand edits.
- [x] Versioned releases publish immutable bundles.
- [x] CI runs breaking-change and docs-drift checks and schedules weekly documentation checks.
- [x] README usage and contributor instructions match the released workflow.
- [x] The repository has a license.

