# Check contract and documentation changes

`npm test` stays offline. It checks the committed bundle, schema fixtures, generated clients, and the maintenance scripts' unit tests. The two commands below contact public services. Neither needs Crunchy Bridge credentials or changes the OpenAPI source.

## Compare against a release

Install Go as well as the project's Node dependencies, then run:

```sh
npm run check:breaking
```

The command finds the most recently published GitHub release with an `openapi.yaml` asset, including previews. Draft releases and releases without an uploaded bundle are excluded. It runs pinned `oasdiff` v1.30.0 against the committed bundle. External schema references are disabled. Go downloads and builds the pinned tool on its first run.

To compare against a specific older release:

```sh
npm run check:breaking -- --base-tag v0.1.0
```

Reports go to `.generated/breaking-changes.md` and `.generated/breaking-changes.json`. The command exits nonzero for oasdiff warnings/errors, changes to agent-risk or idempotency flags, or a failed download/comparison. It does not treat a failed comparison as a clean result.

The OpenAPI workflow runs this as a separate job on pull requests and pushes to `main`, and uploads the reports even when the comparison fails. Ordinary local tests do not need Go or network access.

Read each finding before release. A schema correction can break generated callers even when the vendor changed nothing: `v0.1.1` allowing a null billing address is one example. Record that distinction in `CHANGELOG.md`. Intentional breaks need human review and an appropriate version; this workflow does not auto-approve them or suppress findings on a version bump. The release workflow does not enforce branch protection; require the comparison check in repository rules if it must block merges.

## Check upstream documentation

```sh
npm run check:docs
```

The command checks every URL in `pages.txt`, the API resource index, and all pages of the public API changelog. It compares normalized content hashes against `.github/docs-baseline.json`.

Documentation extraction requires exactly one article with an h1. It keeps article text, document structure, code whitespace, and content attributes such as link targets and table spans. It excludes site navigation, scripts, styles, SVGs, and presentation classes. A missing or ambiguous article fails the check instead of producing an empty hash. The resource links in the API index must match `pages.txt`; added or removed resource pages require inventory review.

Changelog extraction keeps published entry content and new fields, but excludes database `created_at`/`updated_at` bookkeeping timestamps and pagination transport fields. Published dates remain included. Repeated cursors, duplicate entries, malformed responses, network failures, and the page limit all fail the check. A partial fetch cannot update the baseline.

The Documentation drift workflow runs every Monday at 08:17 UTC and can be run manually from GitHub Actions. It uploads `.generated/docs-drift.md` and the candidate hashes in `.generated/docs-current.json`. A changed hash or failed fetch makes the run fail; enable GitHub Actions failure notifications for this repository to receive alerts. No issue, pull request, or schema edit is created automatically.

When drift is reported:

1. Read the report and inspect each linked source. Hashes locate changed pages; they are not a semantic diff or an archive of the old page.
2. If the document layout changed, review the extractor before trusting new hashes.
3. Compare relevant text with the contract. Update schemas and `SPEC.md` where evidence warrants it, then run `npm run bundle` and `npm test`.
4. Only after reviewing the changes, refresh the baseline:

   ```sh
   npm run update:docs-baseline
   ```

5. Review and commit the baseline with any contract changes. A fresh baseline records an observation date; it does not prove the whole API was re-audited.
