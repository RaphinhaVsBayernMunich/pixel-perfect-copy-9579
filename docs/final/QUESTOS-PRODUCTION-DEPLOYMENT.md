# Production deployment

## November 20 verified lifecycle update

The genuine no-charge Play purchase, server Premium activation, same-account restore, accelerated renewal, voluntary cancellation, access through the paid period, and expiration/access removal now PASS. All four provider lifecycle webhooks returned HTTP 200 on attempt 1. Sandbox B remained free. Offline cold start and Retry recovered Sandbox A with its session intact. See [dated evidence and remaining coverage limits](QUESTOS-SANDBOX-LIFECYCLE-2026-11-19.md). This supersedes older pending-lifecycle and inaccessible-device statements below. Cross-account store restoration, reinstall and final production eligibility are not yet passed. No real payment, AAB rebuild or production submission occurred.

## November 18 continuation

See [native billing repair and actual Play checkout evidence](QUESTOS-NATIVE-BILLING-REPAIR-2026-11-18.md). This supersedes the older missing-installation and inaccessible-emulator blockers below. Native pricing and sandbox receipt ingestion now work. RevenueCat and Supabase confirm refund/revocation; provider webhook delivery returned HTTP 200. Active Premium, renewal, voluntary cancellation and restore still need a fresh promptly completed no-charge cycle. No production submission or AAB rebuild was performed.


November 16 continuation: billing verification again passed 10/10, including production health and server configuration. Both dedicated sandbox accounts now authenticate successfully. No new Worker deployment or migration was necessary for email confirmation and evidence updates.

Updated 2026-11-13.

- Runtime: https://questos.questos-1fd92776.workers.dev
- Supabase: `kqsoccbtookvwelctyhm` only.
- Approved migration: `20261109144028_account_scoped_billing_sandbox.sql`, applied November 9; migration ledger independently confirmed November 13.
- Worker version: `b1d3636d-1c9a-414d-9d34-b56d854a0855`, deployed November 9 using `.output/server/wrangler.json`.
- Previous Worker rollback target: `e1858c37-b8f3-4f6c-982c-0811c716f71c`.
- Source repair commit: `a6bc9a5` on `codex/production-release-2026-11-09`.

November 13 billing verification passes production app/backend health and billing configuration. Production Android sync also passes its health preflight. November 9 private reviewer password authentication verification passed; this is not a claim of a new Android UI session test.

No production customer was enrolled as a test user. The two approved sandbox identities were created through normal signup and enrolled for 14 days. No synthetic premium subscription was inserted. No secret rotation, product change, price change or signed AAB replacement occurred.

Rollback requires deliberate review: the previous Worker does not accept sandbox receipts. Keep the additive database guards in place; do not remove test isolation or switch the global environment to sandbox. Deployment logs are ignored local evidence under `supabase/.temp/final-evidence/`.
