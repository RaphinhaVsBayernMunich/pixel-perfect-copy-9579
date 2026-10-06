# Stage 5 monthly completion — 2026-10-04

## Corrected existing-key status — 2026-10-06

This correction supersedes the earlier extra-key assumptions. The owner never created an additional RevenueCat V2 configuration key. The only existing secret key is “QuestOS backend subscriber verification”; its version is unknown and must not be inferred from its name or endpoint behavior.

- Cloudflare has the existing backend subscriber key, app ID and webhook authentication. No `REVENUECAT_CONFIGURATION_API_KEY` exists there; no remote secret was removed or replaced. The obsolete extra-key storage helper and example variable were removed. Billing verification now probes catalog suitability using the existing backend key.
- Fresh private entry of that same existing key succeeded on attempt 1: the actual subscriber endpoint returned HTTP 200. The catalog apps endpoint returned HTTP 403. The response does not distinguish permission restriction from API-version incompatibility. No key was created, revoked, rotated, printed or stored by this verification-only prompt.
- Production deployment `3a424417-20f8-434f-8688-585114a4804c` and the working subscriber verification remain unchanged. This correction does not require a Worker deployment or Android rebuild.
- The canonical monthly mapping remains `questos_premium_monthly:monthly` → `premium` → `default` → `$rc_monthly`. The Play monthly plan is ACTIVE/P1M, US $2.99, without store trial/offers; the historical annual plan is INACTIVE. Authenticated RevenueCat catalog verification remains blocked by the existing key’s HTTP 403; no mapping success is fabricated.
- Existing Play service-account grants, RTDN topic and authenticated webhook remain preserved. The owner reports Play RTDN linkage and a sent test. The latest Google API read found zero Pub/Sub subscriptions; RevenueCat receipt is unverified. Unauthenticated backend webhook requests returned 401; repeated synthetic authenticated TEST requests returned 200. These checks do not prove actual provider delivery.
- The existing signed versionCode 2/versionName 1.0.0 AAB is preserved. No purchase or Play production release occurred. Stage 5 remains incomplete while catalog verification and actual provider delivery are unverified.

Validation after the correction: type checking passed; Bun tests passed (93 tests, 460 assertions); production build passed with existing dependency/deprecation warnings; changed-file ESLint passed after fixing formatting; private helper PowerShell parsing passed; security scan passed (431 files, zero findings). Android production sync initially encountered sandbox DNS restriction, then passed with network access. Billing verification passed 9/10; only existing-key catalog HTTP 403 failed. Live schema/RLS checks and production app/billing health passed. The signed AAB SHA-256 is unchanged. No Worker deployment or release rebuild was necessary.

The prepared post-purchase command is:

```powershell
bun run billing:postpurchase --account-a "SUPABASE_UUID_A" --account-b "SUPABASE_UUID_B" --after "PURCHASE_START_ISO_UTC" --phase purchase --webhook-event-id "ACTUAL_REVENUECAT_DELIVERY_EVENT_ID"
```

Replace the quoted placeholders with the two actual account UUIDs, the UTC time before the owner purchase and the real provider delivery ID from RevenueCat's webhook delivery record. After owner Restore Purchases, run it again with `--phase restore` and `--after` set to the UTC time before restore. No private keys belong in command arguments; the existing private backend subscriber key is read from the ignored environment.

The script confirms existing identities before provider lookup, compares active monthly premium receipt ownership and backend state, checks the actual 500/day quota in a rolled-back transaction, verifies the specified provider event was ingested, and checks database RLS/receipt isolation for the second account. Restore mode requires paid state and a backend verification timestamp after the supplied restore start. It never treats a different legitimately paid account as forcibly Free. Device unlock/persistence/Restore UI/local account switching still require the owner device test. The RTDN-to-RevenueCat hop needs its own subscriber/delivery verification and is not inferred merely from a webhook audit row. Actual paid verification has not been run without an owner purchase; no test receipts or grants were fabricated.

Both fresh signing passwords were verified separately by loading the existing keystore, retrieving its private key and signing/verifying a harmless probe in memory. No password was persisted. The versionCode 2 / versionName 1.0.0 release AAB was built successfully at `android/app/build/outputs/bundle/release/app-release.aab` and verified against the existing owner certificate: all 466 payload entries signed, certificate SHA-256 `6a1459ec36a259f8d171c15af11e091610d115e01f43fa6218af96d1fa88ee45`. Bundletool validation passed. AAB SHA-256: `9D6228D51D39818F9BE06569B639AF219DE801B7AA3C19CDF73CE51FC7314033`. Packaged runtime, disabled cleartext, and public billing key match the verified production configuration. **REUPLOAD REQUIRED** for Internal Testing; no upload or Play production release was performed.

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
