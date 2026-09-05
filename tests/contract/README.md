# Response fixture checks

Run `npm test` to check the committed bundle and validate these fixtures offline. After editing the modular source, run `npm run bundle` first. Run `npm run check:fixtures` to repeat only the fixture tests. CI never contacts Crunchy Bridge or needs an API key.

`fixtures.yaml` holds seven JSON responses captured through Executor from an owner-approved test team. Each record names the operation, observed status, content type, and sanitized body. The test finds that operation's GET response schema in the bundle rather than selecting a schema by hand.

The initial fixtures preserve field presence, nulls, object structure, and array lengths. They replace sensitive scalar values before leaving Executor. Booleans are synthetic too: the fixtures do not describe the test account's actual security settings. Event snapshots are emptied. The fixture file records these limits. Empty cluster and network collections establish only their envelopes, not their item schemas.

## Add an observation

1. Confirm the exact non-production team and permitted reads with the owner. Use only resource IDs obtained from that team. Do not collect account-wide data from a work account.
2. Inspect the generated tool inputs before calling it. Supply credentials through the consumer's secret storage, never as emitted output or committed configuration.
3. Verify returned resource ownership inside the consumer before any follow-up call.
4. Sanitize inside the consumer before emitting a response. Do not print or save the raw response first. Replace identifiers, emails, IPs, timestamps, free text, and credentials. Remove historical event snapshots. Preserve nulls and absent fields; replacing them with strings would hide schema errors.
5. Preserve public enum values only after checking them against the documented set. Use format-valid synthetic EIDs, UUIDs, dates, and IP addresses. Never assume an unfamiliar field is safe to emit.
6. Review the sanitized result manually, then add it to `fixtures.yaml` and the test's expected operation list. Record the observation and its limits in `evidence/` and update `SPEC.md` coverage. GitGuardian scanning supplements this review; it cannot identify every piece of personal data.
7. Run `npm test`. A failure may expose a contract mistake or a sanitization mistake. Trace it back to the in-consumer observation before changing the schema.

The certificate read is recorded separately in `evidence/executor-smoke.yaml`. No certificate bytes are stored here. No mutation runner exists, and adding a fixture never authorizes a live write.
