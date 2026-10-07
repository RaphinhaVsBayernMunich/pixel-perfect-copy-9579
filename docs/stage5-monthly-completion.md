# Stage 5 monthly completion — 2026-10-04

## Private integration update completed — 2026-10-07

The owner created “QuestOS temporary integration setup” with only V2 `project_configuration:integrations:read_write`. Fresh private input succeeded on attempt 1: validation 200, authorization update 200, integration readback 200. The ONE existing webhook `whintgr2a29343fbd` was updated with exactly `Bearer ` plus the unchanged existing production secret. App ID, URL, all-environment configuration (`environment: null`) and event selection were verified preserved. No duplicate or permanent-key change occurred. The temporary key was memory-only and was not persisted locally, in Git, or in Cloudflare.

Temporary-key revocation is **pending**, not completed. The published API has no secret-key revocation operation, no RevenueCat connector was found, and the currently available tools contain no browser-control execution tool. Owner-only revocation of that exact temporary key was requested; both permanent keys must remain intact. No second temporary key or replacement secret was requested.

All requested checks passed again: frozen install, typecheck, 93 tests/463 assertions, production build, 432-file security scan with zero findings, production sync, relevant ESLint, and billing readiness 10/10 CONFIG READY. Production app/billing health returned 200; unauthenticated webhook 401, malformed authenticated JSON 400, complete authenticated TEST 200, duplicate TEST 200. These direct requests are not provider-originated evidence.

Fresh Play API verification confirms Internal Testing versionCode 2 is completed, with no Production release. The unchanged AAB matches the owner certificate on all 466 entries and passes bundletool validation. No deployment, rebuild, tester change or purchase occurred. Monthly catalog and historical annual receipt support remain intact.

Actual RevenueCat webhook test delivery, Play saved RTDN configuration, Connect to Google and RevenueCat Last received remain unverified. No supported public API for those dashboard test/receipt actions is available. Empty topic subscriptions are only an observation; no random receiver was invented. Technical success does not prove an external provider path. Neither a full-completion nor dashboard-confirmation-only verdict is warranted while temporary access revocation and RTDN connection evidence remain outstanding.

## API-first RTDN and Internal Testing completion — 2026-10-07

The exact existing signed AAB was uploaded through Android Publisher `edits.bundles.upload`. Google returned versionCode 2 and SHA-256 `9d6228d51d39818f9be06569b639af219de801b7aa3c19cdf73ce51fc7314033`. Only the internal track was updated, validated and committed. A fresh edit read confirms `internal` versionCodes `[2]`, status `completed`; Production has no release and was untouched. Tester configuration was not modified. **INTERNAL TESTING V2 UPLOAD COMPLETE**; no further AAB upload is currently required.

Google's live v3 discovery document exposes no RTDN topic-setting or Play test-notification method. RevenueCat's documented app API exposes package name and `play_service_account_credentials_configured: true`, but no RTDN topic/connection/receipt field or action. The Android package is correct. Credentials are present; API metadata does not prove their subscription-validation status or identify their private service-account contents.

Existing topic `projects/questos-510417/topics/questos-revenuecat` and all topic IAM were read: Google Play notification service account has Pub/Sub Publisher, and no unrelated bindings were changed. Both project-wide subscription listing and the direct topic subscription listing returned empty. This does not by itself characterize an external managed integration. RevenueCat documents dashboard `Connect to Google` and a Play test followed by its `Last received` timestamp; no invented subscriber was created. Google's authenticated Pub/Sub API accepted one harmless RTDN-shaped synthetic TEST with message ID `20308769331133990` at `2026-10-07T09:57:23.9899151Z`. This is not a Play-originated test and is not evidence of RevenueCat receipt. Play's saved RTDN topic and RevenueCat receipt remain unverified.

One correct webhook remains registered. Its authorization update is blocked by the intentionally read-only V2 key (HTTP 403). Minimum documented update scope is `project_configuration:integrations:read_write`; no additional key was created or scopes expanded. RevenueCat's documented webhook API supports list/get/create/update/delete but exposes no test-delivery operation. Browser automation previously failed during sandbox initialization, so true provider delivery still cannot be verified through the available tools. Existing secret and working V1 verification are preserved.

Frozen install, typecheck, 93 tests/463 assertions, build, security scan (432 files, zero findings), production sync, relevant script ESLint and billing verification 10/10 CONFIG READY passed. Production health and live billing authority checks passed. The unchanged signed bundle again verifies all 466 payload entries and passes bundletool validation. Monthly mapping, historical annual receipts and post-purchase tool are preserved. No backend deployment or Android rebuild was required. No Production release or purchase was performed. Stage 5 remains blocked only on provider webhook/RTDN configuration and genuine delivery evidence; Internal Testing upload is no longer a blocker.

References: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload ; https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks/update ; https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications ; https://www.revenuecat.com/docs/api-v2/integration

## Automated webhook completion attempt — 2026-10-07

One existing RevenueCat webhook is registered at the correct production URL. The backend explicitly expects `Bearer ` followed by the unchanged existing secret; a raw-secret Authorization header returned 401. An automated update of that same registration using the V2 catalog key returned 403, consistent with its intentionally read-only permissions. No duplicate registration, secret rotation or permission expansion occurred. Browser control still fails before opening the dashboard with Windows sandbox `apply deny-read ACLs`. Real provider test delivery therefore remains blocked by dashboard access / API write authorization; direct endpoint tests are not provider delivery evidence.

Direct automated checks using the privately retrieved existing secret returned: missing auth 401, authenticated invalid JSON 400, complete authenticated RevenueCat TEST schema 200, and duplicate TEST 200. The initial synthetic probe omitted app ID and event timestamp, returned 500, and was corrected to the actual schema before retry; no billing state was granted or modified.

The existing RTDN topic and Google Play publisher IAM were reverified. Google lists zero subscriptions; this observation does not alone establish whether RevenueCat's managed integration is configured. Play configuration, RevenueCat connection and actual receipt still need provider-side evidence. No invented subscriber or duplicate topic was created.

Frozen install, typecheck, all 93 tests/463 assertions, build, secret scan (432 files, zero findings), production sync, relevant ESLint and billing verification 10/10 passed. Production health and live Supabase billing authority checks passed. The unchanged signed v2 AAB again verifies all 466 entries against the owner's certificate and passes bundletool validation. No backend/client change requiring deployment or rebuilding was made. Stage 5 is blocked on actual provider webhook and RTDN verification; no manual webhook test was requested, production release performed or purchase made.

## Owner-confirmed separate catalog key — 2026-10-07

The owner confirmed “QuestOS backend subscriber verification” is V1 and created “QuestOS catalog verification” as a separate V2 read-only project/catalog key. Fresh private V2 input passed on attempt 1 (apps HTTP 200), then was stored through Cloudflare secret storage as `REVENUECAT_CONFIGURATION_API_KEY` and in the ignored local verification environment. The V1 key remains unchanged. No key was created or rotated by automation.

Authenticated catalog verification now passes **10/10 — CONFIG READY**. The V2 projects response identifies QuestOS as `projf6813f52` (dashboard project `f6813f52`), and its Google Play app is `app2a0b484e6e` / `app.questos.android`. Verified: `questos_premium_monthly:monthly` → `premium`; `default` → `$rc_monthly` (`pkge8a21b0468f`) → the same monthly product. Annual/lifetime packages have no attached products, and historical annual receipt support remains preserved. The production public Google SDK key is verified against the app catalog.

The verifier previously required package eligibility `all`; the actual base-plan mapping correctly uses `google_sdk_ge_6`. The locked native dependency is purchases-hybrid-common 18.21.0 → Android purchases 10.13.0 (verified Maven POM). The corrected verifier checks eligibility for that installed SDK and fails closed if the verified native dependency changes. Regression assertions accept SDK 10 and reject incompatible eligibility/SDK 5. Documentation: https://www.revenuecat.com/docs/api-v2/package

Provider webhook registration API returned HTTP 200 with zero registrations. Google Pub/Sub lists zero subscriptions. Dashboard automation still fails during Windows sandbox initialization; provider webhook registration/test delivery and RevenueCat RTDN connection/receipt remain pending owner interaction. Read-only key permissions were not expanded. No duplicate webhook/topic was created, and no fabricated test delivery is claimed.

Frozen install, typecheck, all 93 tests/463 assertions, production build, relevant ESLint, security scan and Android production sync passed. App/billing health returned 200, unauthenticated webhook 401 and authenticated invalid JSON 400. The owner-signed v2 AAB remains unchanged, verifies all 466 payload entries and passes bundletool validation. No Android rebuild is necessary. Cloudflare secret storage applied the server-only catalog secret; no backend source change requiring another deployment was made. Stage 5 remains incomplete until provider webhook and RTDN delivery are verified; no Play production release or purchase occurred.

## Final technical recheck — 2026-10-07

The existing subscriber key again returned HTTP 200 on the required subscriber endpoint and HTTP 403 on the documented V2 catalog endpoint. The sanitized response did not identify version incompatibility or missing permissions. Browser initialization failed before dashboard access (`apply deny-read ACLs`); owner metadata confirmation is pending. No new key, permission change, credential replacement or deployment was performed without that evidence.

Frozen Bun install passed without changes. Typecheck, all 93 tests/460 assertions, production build, security scan (431 files, zero findings), Android production sync and relevant script ESLint passed. Billing verification remains 9/10: catalog authorization is the sole failing check; live database billing authority, Google monthly configuration, RTDN topic/publisher permissions and production health pass.

Production app and billing health returned HTTP 200. Unauthenticated webhook input returned 401; authenticated invalid JSON returned 400. Provider registration and a genuine RevenueCat test delivery remain unverified. Google Pub/Sub currently lists zero subscriptions. RevenueCat's documented flow is Google Play App Settings → select the existing topic → Connect to Google, followed by a Play test notification and confirmation of RevenueCat's Last received timestamp. Do not fabricate a subscriber or treat topic IAM/synthetic webhook tests as delivery evidence. Reference: https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications

The unchanged signed AAB passes owner-certificate verification (466 payload entries) and bundletool validation. Package `app.questos.android`, versionCode `2`, versionName `1.0.0`, HTTPS production runtime and disabled cleartext were rechecked. Its public Google SDK key matches the synced native configuration; authenticated catalog association remains unverified. AAB SHA-256 remains `9D6228D51D39818F9BE06569B639AF219DE801B7AA3C19CDF73CE51FC7314033`. **SIGNED AAB READY — REUPLOAD REQUIRED** for Internal Testing. No rebuild, Play production release or purchase occurred.

Stage 5 cannot receive either success verdict until catalog authorization and actual provider webhook/RTDN delivery are verified. The existing post-purchase verification tool remains ready; a successful paid/restore/device-isolation test has not been fabricated. BillDesk remains an unresolved owner-side issue; no dashboard recheck was possible.

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
