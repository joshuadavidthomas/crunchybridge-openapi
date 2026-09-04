# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project attempts to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
## [${version}]
### Added - for new features
### Changed - for changes in existing functionality
### Deprecated - for soon-to-be removed features
### Removed - for now removed features
### Fixed - for any bug fixes
### Security - in case of vulnerabilities
[${version}]: https://github.com/joshuadavidthomas/crunchybridge-openapi/releases/tag/v${version}
-->

## [Unreleased]

## [0.1.0]

First public preview. All documented operations are authored, but authenticated
response validation and Executor approval enforcement have not been tested.
See [SPEC.md](SPEC.md) for documentation conflicts and remaining checks.

### Added

- Unofficial OpenAPI 3.1 description of all 84 operations across the 24 public Crunchy Bridge API resource pages.
- Modular YAML source and a standalone `openapi.yaml` bundle attached to GitHub releases.
- Shared authentication, pagination, errors, request IDs, and idempotency contracts.
- Operation metadata for sensitive, destructive, disruptive, long-running, and cost-bearing behavior. Consumers must enforce their own approval policy.
- Strict Redocly linting, bundle checks, and Ajv validation of cross-field request constraints and provider-specific backup tokens.
- Generated TypeScript checks through `openapi-typescript`/`openapi-fetch` and Hey API, plus executed Zod validation checks.
- Compact anonymous observations for five public success operations and one authenticated endpoint's `401` response.
- MIT license.

[unreleased]: https://github.com/joshuadavidthomas/crunchybridge-openapi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/joshuadavidthomas/crunchybridge-openapi/releases/tag/v0.1.0
