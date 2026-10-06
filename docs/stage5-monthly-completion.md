# Stage 5 monthly completion — 2026-10-04

## Latest owner-auth completion status — 2026-10-06

This update supersedes the external configuration and Android status below. Stage 5 is **not complete**.

- Cloudflare deployment `3a424417-20f8-434f-8688-585114a4804c` succeeded; app and billing health passed. Existing core secrets were preserved. RevenueCat V1 subscriber verification, app ID, and webhook authentication are stored privately in the existing Worker.
- The existing Play app has app-level Admin access for the dedicated service account, including financial data and subscription management. Cloud IAM remains Monitoring Viewer and Pub/Sub Editor. RevenueCat purchase validation still reported insufficient permissions after recheck; with the Play grants confirmed, this remains propagation pending.
- The monthly Play product is ACTIVE, P1M, US $2.99; no offers/store trial exist. The historical annual base plan is INACTIVE. The verifier now uses the dedicated service-account JWT and accepts Google's HTTP 204 empty offer list.
- RevenueCat monthly product `prod1c81f60819` is attached to `premium` (`entl367c51d2af`). The existing default offering's monthly package mapping was saved. Its API verification is pending the approved V2 configuration read-only key.
- The actual public Android SDK key is configured privately and packaged through the existing QuestOSNative plugin. Native initialization checks it against the published client key and fails closed for stale shells. VersionCode is now 2; versionName remains 1.0.0. The debug build passed. A signed replacement AAB is still required; the private signing attempt rejected the keystore password.
- Type checking and all 93 tests / 460 assertions passed. Production build, security scan, production sync, and changed-file lint passed in the preceding checks. Billing verification passed nine checks; catalog verification requires the V2 key. No live purchase or Play production release occurred.
- Browser automation currently fails during Windows sandbox initialization, before dashboard access. Webhook registration, Play-to-topic linkage, RevenueCat RTDN connection and delivery checks are not confirmed; topic existence and Google Play publisher IAM alone do not prove delivery.

The owner approved and subsequently reported creating a V2 key named “QuestOS billing configuration verification” with **Project configuration → Read only**, and all other permission groups disabled. Secure local input of the existing key is still pending; do not create another key. Run `scripts/store-revenuecat-verification-key.ps1` in a private local terminal to store it locally and in the existing Cloudflare Worker without sharing it in chat. No dashboard write or customer scopes are needed for the verifier, and the key is never bundled into the client.

The owner reported linking Play RTDN and sending its test notification. A subsequent Google API read returned no Pub/Sub subscriptions for the existing topic, so RevenueCat receipt of that notification is not established. Production app and billing health returned HTTP 200. The backend rejected an unauthenticated webhook with HTTP 401 and accepted the same synthetic authenticated TEST twice with HTTP 200. These harmless endpoint checks made no billing grants and are not evidence of actual provider delivery. All 93 tests / 460 assertions, type checking, production build, changed-file lint, asset security scan and Android production sync passed again.

The historical details below describe the earlier pass and must not be used as current readiness evidence.

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
