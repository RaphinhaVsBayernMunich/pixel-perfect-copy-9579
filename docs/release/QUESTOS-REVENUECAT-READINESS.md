# RevenueCat and subscription readiness

Updated 2026-11-07. **Configuration PASS; purchase lifecycle BLOCKED.**

| Check | Status | Evidence / repair / next step |
| --- | --- | --- |
| Canonical catalog | PASS | Live billing verifier: project f6813f52, app app.questos.android, questos_premium_monthly:monthly → premium; default → $rc_monthly → monthly product. Public Android key matches app. No product/price changes. |
| Store setup | PASS | Monthly base plan and absence of stacked store trial verified. Historical annual receipt parsing retained; no annual offer introduced. |
| Credentials/RTDN configuration | PASS | Verifier checks dedicated service account, Google APIs, topic projects/questos-510417/topics/questos-revenuecat and publisher permission. Secrets not printed or committed. |
| Webhook configuration | PASS | Live RevenueCat shows one active QuestOS Production connection to production /api/public/revenuecat-webhook; Play app, all events, both environments. Backend still filters environment. |
| Unauthorized webhook | PASS | Empty unauthenticated POST returns HTTP 401; no event processed. |
| Actual lifecycle delivery | BLOCKED | Dashboard shows no events in displayed history. No new provider test/fabricated events injected into production. Actual Play → RTDN → RevenueCat → backend lifecycle not proved. |
| Server authority | PASS | Approved live rollback test and isolated PGlite tests pass; billing columns and privileged RPCs cannot be written by clients. |
| SDK identities / restore | PASS (logic only) | Native billing tests validate UUID binding, logout cleanup, account-switch invalidation and restore identity checks. Not a real store restoration. |

## Twelve isolated logic scenarios

All application tests pass: 113 tests, 606 assertions. PGlite is disposable local storage, not production SQL fixtures.

| Scenario | Status | Test evidence |
| --- | --- | --- |
| Free access | PASS | premium-billing.test.ts baseline snapshot |
| Trusted premium | PASS | premium-billing + account-sync tests; server-only event application |
| Expired loses premium | PASS | premium-billing expiry snapshots |
| Canceled unexpired retains access | PASS | Added explicit tier assertion after cancel flag |
| Failed validation cannot grant | PASS | billing-adapters/native-billing tests; malformed/foreign/sandbox evidence rejected |
| Duplicate events idempotent | PASS | premium-billing event replay |
| Out-of-order active cannot resurrect expiry | PASS | Added stale-active-after-newer-expired regression |
| Account switch cannot transfer access | PASS | native-billing identity and in-flight result tests; receipt ownership rollback |
| Trial quota | PASS | ai-quota tests: 40 per day, expired trial returns to 10 |
| Paid quota | PASS | ai-quota tests: 500 per day only with valid server state |
| Unauthenticated billing writes | PASS | premium-billing role grants tests and live rollback check |
| Cross-account isolation | PASS | account-sync ownership/conflict/atomic rollback tests |

Refund revocation, stale restore after refund, genuine newer renewal, provider overlap, batch rollback, grace deadline and historical annual receipts retain regression coverage. These simulated cases are not Play purchase evidence.

## Isolation decision

Connected Supabase inventory lists only production QuestOS. Repository default is BILLING_ENVIRONMENT=live; RevenueCat parser deliberately discards is_sandbox=true records. No authorized hosted sandbox was found. Do not flip production to sandbox, inject synthetic paid records, or interpret a successful checkout as successful backend entitlement synchronization.

Safest strategy: separate test Supabase/database and Worker with sandbox environment, separate webhook authorization and test-only users, same canonical identifiers and genuine RevenueCat sandbox receipts. Apply existing migrations to that isolated database and retain server authority/identity checks. Keep production service-role keys and customer records out. Provisioning/credentials and any cost need owner decision.

The current Play AAB points at the production Worker. A separate backend alone will not exercise that artifact end to end. Before purchases, explicitly choose either a later test artifact targeting the isolated runtime, or a separately reviewed server-side routing design restricted to an explicit test-account allowlist with isolated storage and sandbox-only receipt verification. The second option requires implementation and security review; it does not exist today. Do not silently change runtime routing or rebuild the submitted release.
