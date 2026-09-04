# crunchybridge-openapi

An unofficial OpenAPI 3.1 description of the [Crunchy Bridge API](https://docs.crunchybridge.com/api).

The public docs are the main source. Crunchy Data's generated Apiary descriptions, the `cb` CLI, and observed API traffic help recover hidden structure, but they do not replace the docs. Unclear or contradictory behavior stays visible in schema descriptions until live requests settle it.

## Status

The spec authors all 84 documented operations across the 24 public API resource pages. [`SPEC.md`](SPEC.md) tracks coverage, open questions, implementation phases, and release gates. `pages.txt` lists the source pages.

## Use the bundle

Import the versioned [v0.1.1 bundle](https://github.com/joshuadavidthomas/crunchybridge-openapi/releases/download/v0.1.1/openapi.yaml) into an OpenAPI consumer. The bundle contains all schemas; the modular source entry point requires the rest of `openapi/`.

This is a preview. Executor imports all 84 operations, and eight authenticated read operations have succeeded on an approved test team. Seven sanitized JSON response fixtures now validate offline; empty cluster and network lists do not verify resource item schemas. See [the smoke report](evidence/executor-smoke.yaml) for limits. Start with read-only operations. Configure bearer credentials in the consumer's secret storage, not in the YAML or prompts. Risk extensions do not enforce approvals themselves; keep writes disabled until the consumer's policy is tested. The spec points to the real Crunchy Bridge API.

[CHANGELOG.md](CHANGELOG.md) records release changes.

## Layout

- `openapi/openapi.yaml` is the source entry point.
- `openapi/paths/` groups operations by documented resource.
- `openapi/components/schemas/` holds resource and shared schemas.
- `openapi/components/headers/` and `openapi/components/responses/` hold shared HTTP behavior.
- `dist/openapi.yaml` is the generated single-file bundle and is not committed.
- `evidence/` stores compact sanitized records for live observations that support contract claims.

Each operation links back to its source page with `x-docs-url`. Destructive operations use `x-destructive: true`; operations that are safe to retry use `x-idempotent: true`. These extensions let agent tooling apply approval and retry policy without guessing from operation names. Hey API supplies a second TypeScript/Zod interoperability check, while Ajv validates JSON Schema rules that code generators cannot preserve.

## Work on the spec

Use Node.js 22.18 or newer, then install dependencies:

```sh
npm ci
```

Lint the modular source and bundle, verify the standalone JSON Schema invariants, then generate and compile both the `openapi-fetch` and Hey API TypeScript/Zod checks:

```sh
npm test
```

Run each step on its own:

```sh
npm run lint
npm run bundle
npm run lint:bundle
npm run check:bundle
npm run check:fixtures
npm run check:generated
npm run check:hey-api
```

[Response fixture checks](tests/contract/README.md) describes the offline tests and the procedure for capturing sanitized evidence. No live requests run in `npm test`.

## Contribute and release

Check changed operations against their linked public documentation. Update `SPEC.md` and the `Unreleased` section of `CHANGELOG.md` in the same change, then run `npm test`. Keep generated files out of commits. GitGuardian handles repository secret scanning; fixtures still need manual review for personal data and credentials.

To release, update the version in `package.json` and `openapi/openapi.yaml`, refresh the npm lockfile, and move the changelog's unreleased entries into that version's section. Push the change and wait for CI and GitGuardian checks. Publish a GitHub release tagged `v<version>` using that changelog section as its notes. The release workflow checks the version, runs `npm test`, and uploads `openapi.yaml`. It refuses to overwrite an existing asset.

## License

[MIT](LICENSE). This project is unofficial and is not endorsed by Crunchy Data.

## Known gaps

The Crunchy Bridge docs guarantee that errors contain `message` and `request_id`, but they do not show the full error shape. A live unauthenticated request also returned `code` and `is_transient`; the non-null type of `code` remains unknown. The Account example conflicts with its field table: `access_groups` is marked non-nullable but shown as `null`, and `dashboard_settings` appears only in the example. The current schema records those facts rather than hiding them.
