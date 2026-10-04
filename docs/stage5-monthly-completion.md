# Stage 5 monthly completion — 2026-10-04

This is the current monthly configuration. The earlier annual setup report is historical.

## Canonical mapping and documented price

Premium is USD **$2.99/month**, documented in the historical plan catalog at commit `b2b8db8` (`src/lib/subscription/plans.ts`, commented future monthly plan). Google Play regional prices are converted by Google; the app displays verified localized store pricing.

- Internal/Stripe lookup: `premium_monthly`
- Google Play: `questos_premium_monthly`, base plan `monthly`, P1M
- RevenueCat product: `questos_premium_monthly:monthly`
- Entitlement: `premium`; offering: `default`; package: `$rc_monthly`
- No Play trial offer. Existing app-managed trial remains seven days.
- AI quotas remain 10/day Free, 40/day Trial, 500/day Premium.

New purchases and checkout requests accept only monthly. Historical annual receipts remain recognized for their finite paid periods, refunds, cancellation, expiry, restore and reconciliation. Annual is absent from new offerings. Legacy subscribers can still open their own annual Play subscription management page. Old migrations are unchanged.

The additive migration `20261004180000_monthly_billing.sql` was applied once to `kqsoccbtookvwelctyhm`. It preserves ownership locks, service-role-only RPC permissions, event deduplication, transfer rules and refund/stale-event guards, resolves the actual verified plan, and updates product identity when a verified receipt changes plans. No records were deleted.

## Validation results

Frozen Bun install, type checking, production build and changed-file ESLint passed. All 92 tests passed with 456 assertions across 13 files. Live Supabase rollback security verification passed. Final secret scan checked 422 files with no findings. Production Android sync passed with 11 plugins. Billing verification reports EXTERNAL OWNER ACTION REQUIRED: four external checks remain (server RevenueCat presence, Worker secrets, Play API owner scope/permissions, RevenueCat catalog/SDK key).

## External configuration progress

Google owner CLI authentication confirmed. The existing QuestOS RevenueCat project is `f6813f52`; do not create a duplicate. Google project `questos-510417` has Android Publisher, Play Reporting and Pub/Sub enabled. Dedicated service account `questos-revenuecat` has RevenueCat's documented Pub/Sub Editor and Monitoring Viewer roles, without project Owner/Editor/Admin. Topic `projects/questos-510417/topics/questos-revenuecat` grants the Google Play notifications system account Pub/Sub Publisher. Private service-account JSON is outside the repository at `C:\QuestOS-Secrets\questos-revenuecat.service-account.json`.

The monthly Play subscription and one-month auto-renewing base plan are ACTIVE, with US USD 2.99 and Google-converted regional prices. There is no store trial offer. An initial form validation failure was corrected before successful save and activation. The old annual base plan is now deactivated for new subscribers; the product and existing subscriber records are retained. RevenueCat Play configuration is prepared but credential upload awaits the browser security confirmation. Backend RevenueCat secrets and actual Android public SDK key remain unconfigured; billing verification correctly fails closed.

No Google Play production release, actual purchase or new Worker deployment was performed in this pass. Worker deployment awaits clarification of the production publishing restriction. The unchanged Android native shell loads the existing HTTPS Worker, so these JavaScript-only changes do not require a versionCode bump or replacement AAB. VersionCode 1 and the existing signed AAB are retained.

## Owner device test, after CONFIG READY

Install from Internal Testing with a licensed tester, sign in as account A, open Premium, verify a monthly localized price, and make one authorized monthly test purchase yourself. Confirm unlock, restart, Restore Purchases, reinstall/restore if desired, then switch to account B and confirm it does not inherit A's access. Do not purchase automatically. Sandbox/license-test receipts never grant live access under the current live environment; any sandbox run must use an explicitly isolated sandbox runtime and matching database environment, without flipping production's global billing configuration.

## Exact post-purchase verification process

Codex runs `bun run billing:verify` first. After the owner provides account A's Supabase UUID (and account B's UUID for isolation), Codex performs these read-only checks through the existing authenticated Supabase CLI and privately authenticated RevenueCat API:

1. GET `https://api.revenuecat.com/v1/subscribers/<A_UUID>` with the private server key in an Authorization header, never logs key or raw provider response. Confirm App User ID equals A, premium product is `questos_premium_monthly:monthly`, store is Play, environment matches the runtime, expiry is finite/future and receipt is not a store trial or refunded.
2. Query `public.subscription_snapshot(A_UUID)` as the trusted backend: tier premium, current_plan premium_monthly, correct environment/provider and future paid/grace expiry. Query `billing_accounts` for exact A UUID customer identity; compare verified `billing_subscriptions` monthly product, GPA root, ownership, status and expiry with RevenueCat's current record.
3. Verify actual quota using `BEGIN; SELECT public.reserve_ai_request(A_UUID,'morning_brief',1000,1000,1000); ROLLBACK;` via the trusted SQL CLI: returned limit must be 500. Rollback ensures no consumption and no AI provider request. Existing per-user/global concurrency limits may require waiting for active requests to finish; never bypass them.
4. Query owner-scoped `subscription_events` plus provider/environment `billing_events` to confirm actual webhook ingestion and the unique event constraint. Verify the receipt owner and snapshot again after owner restart/restore; compare event/verification timestamps. Restore UI behavior itself requires the device test, not a database-only claim.
5. Confirm B has no A-owned receipt/account rows and its own snapshot reflects only its legitimate Free/Trial/paid state. A paid B account is not expected to be forcibly Free.
6. Duplicate/out-of-order delivery, cancellation, refund, expiry and transfer guards are covered by PostgreSQL tests. Actual provider lifecycle behavior requires the owner sandbox/license test and delivery checks; do not claim a live refund/cancellation test merely from unit tests or fabricate provider events as payment evidence.

Never print credentials or raw private records, mutate receipts to create access, refund automatically, or toggle production billing to sandbox for testing.
