# QuestOS release operations — 2026-10-02

Stage 2 complete (2026-10-03): the owner-controlled Supabase schema, application rows and Google Auth identity have been transferred to `kqsoccbtookvwelctyhm`; Google provider readiness is verified. See [the Stage 2 migration record](supabase-stage2.md) for authoritative counts/security checks. The transfer instructions below describe the earlier stage and must not be rerun against either project.

## What is ready and what is not

The React/TanStack/Supabase/Capacitor architecture is preserved. Backend billing and quotas are authoritative. Annual purchase UI is displayed only after provider catalog validation. The code includes a native Google Play provider, a Stripe web provider, premium workspace, calendar/Health Connect bridge, account-scoped storage, and conflict-aware atomic sync.

Release verdict: **BLOCKED**. Stage 2 Supabase migration is complete. Stage 3 has deployed the independent Worker at https://questos.questos-1fd92776.workers.dev and updated production auth/native configuration. DeepSeek readiness still fails from the Worker, so guarded production sync and AI acceptance remain blocked. See [Stage 3 deployment record](cloudflare-stage3.md). The Android debug APK builds with API 36/JDK 21; release signing and real device/provider acceptance belong to later stages.

## Already applied database changes — DO NOT RERUN

Hosted project: `c92d3ab1-8331-48a0-8bd9-a0c662b22dbe`.

The existing Drizzle history had only 0000 and 0001. On 2026-10-01, the following were applied once, transactionally, and recorded in `drizzle.__drizzle_migrations`:

| Migration | created_at | SHA-256 |
|---|---:|---|
| `0002_premium_billing.sql` | 1790643600000 | e8b415e0a31b48786f923f75f181b32b2afdfa47ccc6733697957ad6d87137b9 |
| `0003_atomic_account_sync.sql` | 1790845200000 | 1a4478d864cd896f82f79b4e608f57c62b14a782a2040d439af87f7015110f8d |

Supabase-directory copies are for a separate fresh Supabase deployment, not a second migration run against Lovable. Historical migrations were not rewritten. The profile checksum before/after was identical (`0d14503564c834a8e19122c2e96b9869`); profile count 1, quests 0, legacy events 0. No current paid accounts or ambiguous paid/null-expiry accounts existed. Hosted rollback-only role tests confirmed normal profile edits, denial of billing ID/entitlement/trial edits, and privileged RPC restrictions.

## Server and public configuration

Use your verified owner-controlled Cloudflare Worker secret manager and `.env.example`. Private values must never be put in chat, Git, screenshots or VITE variables. Existing Lovable secrets cannot be read or transferred by these tools; re-enter them securely and preserve the trial pepper.

- Preserve the already-entered `DEEPSEEK_API_KEY`; configured model is `deepseek-flash` at `https://api.deepseek.com/chat/completions`.
- Configure the owner-controlled Supabase destination using `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_PUBLISHABLE_KEY`.
- `INSTALL_FINGERPRINT_PEPPER`: a stable randomly generated secret of at least 32 characters. Never rotate casually: it anchors installation trial claims. Missing pepper fails trial creation closed. Trial is seven days, app-managed, with no automatic charge. Reinstalling the same account cannot restart it. Client-supplied installation identity is an abuse signal, not proof against creating unrelated accounts.
- `BILLING_ENVIRONMENT=live` must equal `public.billing_configuration.environment`. Use a **separate staging database/project** with both set to `sandbox` for test purchases; do not toggle the production database to let test receipts grant live access.
- `APP_ORIGIN`: exact independent HTTPS origin, e.g. your owned domain or `https://questos.<your-subdomain>.workers.dev`, no path. Checkout returns must use this origin.
- Direct Stripe keys: `STRIPE_LIVE_SECRET_KEY` (`sk_live_...`) / `STRIPE_SANDBOX_SECRET_KEY` (`sk_test_...`). No Lovable gateway or connector is used.
- `PAYMENTS_LIVE_WEBHOOK_SECRET`/`PAYMENTS_SANDBOX_WEBHOOK_SECRET`: corresponding Stripe endpoint signing secrets.
- `REVENUECAT_SECRET_API_KEY`: RevenueCat server API credential with subscriber read permission, never the public SDK key.
- `REVENUECAT_APP_ID`: exact RevenueCat app identifier from the Android app configuration.
- `REVENUECAT_WEBHOOK_AUTH`: a random secret; webhook dashboard Authorization value must be `Bearer <that-secret>`.

Public build variables: `VITE_PAYMENTS_CLIENT_TOKEN` is the matching Stripe `pk_live_...`/`pk_test_...`; `VITE_REVENUECAT_ANDROID_KEY` is the Android `goog_...` SDK key. Set through the hosting build environment and rebuild. Public Supabase coordinates/key in `src/integrations/supabase/public-config.ts` now target the owner-controlled destination; stale project URL overrides are rejected. Public keys are not service-role credentials. `.env` and `.env.development` remain locally but are untracked.

## RevenueCat and Play setup (owner dashboard access required)

No dashboard product has been verified through the available tools. The following is the **repository's canonical required mapping**, not a claim that these products already exist. Reuse matching existing entries; do not create duplicates.

| Layer | Value |
|---|---|
| Android application ID | `app.questos.android` |
| Internal annual plan / Stripe lookup key | `premium_annual` |
| Play subscription product | `questos_premium_annual` |
| Play auto-renewing base plan | `annual` (one year) |
| RevenueCat imported product | `questos_premium_annual:annual` (older SDK may report the plain product ID) |
| RevenueCat entitlement | `premium` |
| RevenueCat offering | `default`, mark current |
| Offering package | Annual (`$rc_annual`), attach the annual base plan |
| Approved US price | USD 19.99/year; other Play regions use displayed localized pricing |

1. Play Console → your app → **Monetize with Play → Products → Subscriptions**. Open or create `questos_premium_annual`; add/open base plan `annual`, **Auto-renewing**, billing period **Yearly**, US price **19.99 USD**. Select intended countries, save and activate. Do not add a store free-trial offer: QuestOS already has an app trial.
2. RevenueCat → project → **Apps & providers → Add app / existing Google Play app**. Package name `app.questos.android`. Complete Play service-account credential setup using RevenueCat's Google Play instructions; owner must grant Play access/accept terms. Test credentials in that screen.
3. RevenueCat → **Product catalog → Products**: import the actual Play annual base plan. **Entitlements → premium**: attach it. **Offerings → default**: add the Annual package with that product; mark the offering current.
4. RevenueCat → app configuration → **Public SDK key**: copy the Android `goog_...` value to `VITE_REVENUECAT_ANDROID_KEY`. API keys → create/read server key in secure form, `REVENUECAT_SECRET_API_KEY`. Preserve `REVENUECAT_APP_ID` exactly.
5. RevenueCat → **Integrations → Webhooks → Add**. URL `https://<APP_ORIGIN-host>/api/public/revenuecat-webhook`; Authorization `Bearer <REVENUECAT_WEBHOOK_AUTH>`. Select the matching app/environment. Enable purchase, renewal, cancellation, billing issue, expiration, transfer and refund-related events. A 500 means processing failed and delivery must retry.
6. Review RevenueCat's restore/transfer policy deliberately. Code accepts a verified transfer atomically (old owner revoked before new owner receives the receipt); a receipt cannot unlock two QuestOS owners concurrently. Use two test QuestOS accounts on one Play tester to verify your chosen dashboard policy.

Cancellation retains the paid period. Full refund revokes that period; old restore data cannot resurrect it. Grace is at most three days from the first verified billing failure, not sliding. Trial does not get paid grace. Verified paid periods from providers are combined; an expired provider cannot override another active one. Sandbox receipts never unlock the live environment.

## Stripe web setup

1. Stripe Dashboard → Developers / API keys: verify the intended account and store its private key in the corresponding server secret.
2. Stripe Dashboard → **Product catalog → Add product / existing QuestOS Premium**. Add an active recurring annual price, USD **19.99**, interval **Year**, lookup key **premium_annual**. The backend rejects wrong currency, amount, interval, duplicates, inactive products, or environment mismatch.
3. Stripe → **Settings → Billing → Customer portal**: enable subscription cancellation/payment-method management and save the configuration.
4. Stripe → **Developers / Workbench → Webhooks → Add destination**: `https://<APP_ORIGIN-host>/api/public/payments/webhook?env=live` (sandbox uses `env=sandbox`). Select `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`, `charge.refunded`. Store the endpoint signing secret securely as above.
5. Test successful annual checkout, user cancellation, retry/double-click, payment failure, portal cancellation, full refund, restore, duplicate delivery and out-of-order delivery in staging. Backend verification uses current provider state and paid invoices, not browser success flags.

## Native authentication

Email/password and email verification remain supported. Email verification opens the secure web origin; return to the app and sign in after confirming.

Google on web uses direct Supabase OAuth, hidden until `VITE_GOOGLE_AUTH_ENABLED=true`. Native Google uses external browser + Supabase PKCE and is hidden until configured:

1. Supabase project's **Authentication → Sign In / Providers → Google**: enable the provider with the owner's Google OAuth credentials. In Google Cloud Console, authorize the exact Supabase callback URL displayed in that provider screen.
2. **Authentication → URL Configuration → Redirect URLs → Add URL**: `app.questos.android://auth/callback`. Keep the approved HTTPS web origin too.
3. Set public build flag `VITE_NATIVE_GOOGLE_AUTH_ENABLED=true`, rebuild, and test on a device. The manifest accepts only that scheme/host/path; client accepts a code only during a ten-minute locally initiated sign-in and exchanges its PKCE verifier. URL tokens are rejected.
4. Test cancel, failed sign-in, warm/cold callback, session refresh, logout, account B login, and Android Back/resume. Do not enable the flag on production until this passes.

## Android SDK, build and signing

Source: min SDK 26, compile/target SDK 36, Capacitor 8, Android Gradle Plugin 8.13, Gradle 8.14.3. API 36, Build Tools 36 and JDK 21 are installed. The debug build passes; ignored local Android Studio settings point at JDK 21.

Android Studio → **More Actions → SDK Manager** (or Settings → Languages & Frameworks → Android SDK): install **Android SDK Platform 36**, **Android SDK Build-Tools 36.0.0**, **Android SDK Platform-Tools**, **Android SDK Command-line Tools (latest)**. Install an API 36 emulator image/Android Emulator if not using a device. Accept SDK licenses yourself.

PowerShell, after installation (adjust JDK path to your actual JDK 21):

```powershell
$env:JAVA_HOME = 'C:\Users\DELL\.jdks\jbr-21.0.11'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
Set-Location C:\pixel-perfect-copy-9579
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
$env:CAPACITOR_SERVER_URL = 'https://<your-approved-published-origin>'
bun run android:sync:prod
Set-Location android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

TanStack server functions require a deployed HTTPS runtime: Capacitor loads that origin and uses real native billing/calendar/health/widgets/lifecycle plugins. The bundled shell explains unavailable configuration/offline startup. **This is not a cold-start offline SPA.** Already loaded core account state can retain offline edits; premium/AI fail closed offline. Release rejects missing HTTPS origin/signing values. No localhost is allowed in the release config.

If no existing upload keystore exists, create one outside the repository (interactive password prompts; back it up securely):

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\QuestOS-signing"
keytool -genkeypair -v -keystore "$env:USERPROFILE\QuestOS-signing\questos-upload.jks" -alias questos-upload -keyalg RSA -keysize 2048 -validity 10000
$env:QUESTOS_KEYSTORE_PATH = "$env:USERPROFILE\QuestOS-signing\questos-upload.jks"
$env:QUESTOS_KEY_ALIAS = 'questos-upload'
$env:QUESTOS_KEYSTORE_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Keystore password' -AsSecureString)).Password
$env:QUESTOS_KEY_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Key password' -AsSecureString)).Password
$env:QUESTOS_VERSION_CODE = '1' # Must exceed the highest Play version if the app already exists.
$env:QUESTOS_VERSION_NAME = '1.0.0'
.\gradlew.bat bundleRelease
```

Debug APK produced: `android/app/build/outputs/apk/debug/app-debug.apk`. Release AAB was not produced: signing and an independent runtime origin are missing. Its expected path is `android/app/build/outputs/bundle/release/app-release.aab`. Release uses R8/resource shrinking and plugin annotation keep rules; validate the optimized build on device. Do not replace an existing signing key. Keep passwords out of terminal history, Git and Gradle properties.

## Play internal testing and disclosures

Play Console → **Test and release → Testing → Internal testing → Create new release**: upload the successful signed AAB, complete Play App Signing, add release notes/testers, review and roll out **to internal testing only**. Settings → License testing: add the tester's Google account. Install through the internal-test opt-in link, not only a sideload, for billing tests.

Main store listing: title **QuestOS**, upload `docs/store/questos-icon-512.png`; create truthful device screenshots after real testing. App content: complete privacy policy URL (`<published-origin>/legal/privacy`), app access instructions/test account, ads declaration (code has no ad SDK), content rating, target audience and Health apps declaration based on actual intended audience/use. Owner must make the legal declarations; do not guess them.

Data Safety evidence: authentication email/display name and Supabase user ID; quests/goals/journal/stats/settings; account-linked usage analytics; billing customer/subscription identifiers and purchase status; AI prompts/context sent to DeepSeek through the backend, with request/token metadata retained separately (no prompt/response text in AI request logs); hashed installation identity for trial checks; optional calendar event titles/times; optional confirmed daily steps/sleep/exercise totals. Health samples are read locally, totals uploaded only after confirmation, never included in Coach requests. Health is not used for ads/diagnosis. There is no remote push token registration. Calendar access is user-initiated; only app-created linked events are written. Confirm the support mailbox `support@questos.app` is controlled/monitored before publication. Store requires a working privacy and account-deletion path; Settings → Delete account is implemented, and the public privacy page explains it.

## Four required live AI smoke tests

Open the independent deployed QuestOS origin and sign in. The current tool set has no browser-control runtime. Never treat HTTP/build/mock tests as live results.

1. Home → AI Coach → **Morning brief**. Generate once.
2. AI Coach → **Goal to quests**. Enter a small goal, generate once, review and add a quest; confirm persistence after reload.
3. Legacy → Journal → **Reflection prompt**. Generate once; write a short test entry and save.
4. Sign up a **new test account**, confirm email if requested → onboarding wizard → enter goals/interests → generate starter quests → finish; confirm valid UUID-backed quests persist.

Before/after each single click, query your Supabase Dashboard → SQL editor. Replace the UUID with the test account's own ID; do not share private prompts:

```sql
SELECT usage_date,request_count,last_feature FROM public.ai_usage
WHERE user_id='<test-user-uuid>' ORDER BY usage_date DESC;
SELECT id,feature,status,input_tokens,output_tokens,error_code,started_at,completed_at,lease_expires_at
FROM public.ai_requests WHERE user_id='<test-user-uuid>'
ORDER BY started_at DESC LIMIT 12;
```

Expect exactly one new logical row and one accepted-usage increment per action, `status='succeeded'`, completed timestamp, token counts when provider supplies them. Failure after reservation remains charged; it must not reserve again for an internal provider retry. Invalid input/auth/quota-denied calls must not invoke DeepSeek. No prompt/response/key columns exist in these logs. Check status names from the schema if the UI labels differ; do not assume a displayed success is logged.

## Acceptance checklist before publishing

- [ ] Four real AI results and exact-once telemetry above. Current hosted count: zero requests in the latest inspection.
- [ ] Free 10, trial 40, paid 500 shared UTC-day accepted requests; expired trials/paid become Free. Automated SQL tests pass; validate one normal call per appropriate staging account, not 500 live calls.
- [ ] Free cannot use premium server functions/documents/assistant confirmation even with a forged UI flag. Trial/paid can. Core quests, XP, journal, calendar, achievements and sync remain Free; 25 active quests/3 active main projects apply only to additions/reactivation.
- [ ] Account A create/edit/delete/offline edit → logout → B sees none of A's core/premium/settings/notifications → A relogin recovers its state. Two devices edit the same save: explicit conflict, failed deletion retained, no silent overwrite.
- [ ] Each premium panel: memory opt-in/save/clear; Future Me; Goal Simulator; assistant proposal/confirm; analytics/CSV; theme across routes; focus audio/stop; timer/widget; selected Home panels; ICS round-trip/device calendar confirm; health read preview/save/clear; 14-day experiment. No medical or guaranteed future outcome claims.
- [ ] Stripe annual purchase/restore/portal and RevenueCat Play annual purchase/restore/manage, pending/cancel/offline/delayed verification, refund/expiry/grace/transfer. Mock ledger tests are not store certification.
- [ ] Device notification grant/deny, 8am local reminder, trial reminder, account switch cancellation, tap routing. There is no remote push and no automatic background AI bill.
- [ ] Android signed release build; cold/warm auth, resume, Back, network loss/reconnect, share JSON/CSV/ICS, calendar permission, Health Connect permission and read-only scope, widget expiry/logout clearing; test Android 13+ notification permission.
- [ ] Public privacy/terms, monitored support email, real product prices, sandbox/live separation, no secrets in assets, real published origin, Play declarations/internal testing complete.

Cut over to the independent origin only after data/auth preservation and acceptance checks pass. No public Play production release is authorized.

## Independent hosting and database cutover

Official TanStack/Nitro Cloudflare output replaces the Lovable wrapper. Supabase OAuth and Stripe APIs are direct. Lovable auth, gateway and runtime dependencies are removed. Supabase fallback coordinates now target the owner destination. The following transfer steps are historical; use the Stage 2 record above and continue only with Stage 3 hosting after Google provider setup.

1. Create/select a Supabase project in your own account. Use the supported Lovable Cloud export and Supabase restore process; there is no automatic ownership transfer. Preserve existing schema/data, user UUIDs, Auth identities/password records, billing/trial IDs, quota history and storage objects if present. Keep exports private. Do not reset/delete the source or print password records.
2. Restore into an isolated destination and compare counts/checksums, UUIDs, auth identities, RLS/grants and migration history. Test an existing account's login and profile edits. Verify denied billing writes, finite entitlements, quota and UUID quest persistence. The two migrations above already exist in the source export; do not rerun duplicate migration histories.
3. Configure destination Auth providers, email delivery and redirect URLs. Set matching public build `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` and server `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. Existing sessions may require sign-in again; retain account UUIDs and their local state.
4. Authenticate Cloudflare with `bunx wrangler login` and verify the intended owner account. Choose the exact workers.dev origin or owned custom domain. `bun run deploy:dry-run` checks the upload without publishing. The deployment helper requires preselected `APP_ORIGIN` and private environment values. First create the `questos` Worker in the verified account using the generated configuration, then use `bun run deploy` to upload secrets/build/deploy. No deployment was executed here. Configure custom domains before health verification.
5. Verify `/api/health`, legal pages, existing-account login and all four live AI paths. Health checks required configuration presence, not provider connectivity or database ownership. Set `CAPACITOR_SERVER_URL` to that origin and run `bun run android:sync:prod`. This checks health, rejects local/Lovable/preview origins and remembers the validated origin in an ignored local file.
6. Before cutover, pause source writes and perform a supported final export/restore or checked reconciliation so intervening changes are retained. Keep backups and rollback coordinates. Do not abandon source data before destination verification.

References: [Supabase on Lovable Cloud ownership](https://supabase.com/docs/guides/troubleshooting/cant-access-supabase-project-lovable-cloud), [Lovable external hosting/migration](https://docs.lovable.dev/tips-tricks/external-deployment-hosting), [Nitro Cloudflare deployment](https://nitro.build/deploy/providers/cloudflare).

Automatic approval review rejected an attempted deployment-helper update involving secret upload because the Cloudflare destination account was unverified. That update was not applied. Confirm the intended owner account before secret upload/deployment.

## Final verification record — 2026-10-02

| Command/check | Actual result |
|---|---|
| `bun install --frozen-lockfile` | Pass; 648 installs checked, 766 packages, no lock changes |
| `bun test` | 73 pass, 0 fail, 356 assertions, 8 files |
| `bun run typecheck` | Pass after compatibility fix for updated Router error type |
| ESLint on all changed existing TS/TSX/MJS files | Pass, 0 errors/warnings |
| `bun run lint` (equivalent `eslint . --format json`) | Fails: 8,462 pre-existing errors, 8 warnings; generated Android build output excluded |
| `bun run build` | Pass; independent Nitro Cloudflare output |
| `bunx wrangler deploy --config .output/server/wrangler.json --dry-run` | Pass; no deployment |
| `bun run security:scan` | 375 files, 0 findings, including web/native build assets |
| `bunx cap sync android` | Pass; 11 plugins; no production origin configured |
| `android/gradlew.bat -p android assembleDebug` with JDK 21/API 36 | Pass; 427 tasks, APK produced |
| `android/gradlew.bat -p android bundleRelease` | Fails intentionally: release signing not configured; no AAB |
| `bun run preview --ip 127.0.0.1 --port 8787` and HTTP checks | Home/privacy/terms 200; health 503 configuration-required as expected |

Provider test fixtures exercise Morning Brief, Goal to Quests, Reflection Prompt and Starter Quests through real orchestration/contracts with one completion each. They are not live DeepSeek tests. SQL tests use PGlite PostgreSQL and cannot certify real provider purchases or multi-connection production races. Hosted rollback-only authenticated-role checks also passed without modifying user rows.

The original Nitro preview shortcut tried to spawn unavailable `npx`; `preview` now directly invokes Wrangler. Full lint failures remain in untouched legacy files. Live UI, Pixel 8 permissions/auth, Play purchase/restore and provider dashboard configuration are not verified.

## Exact owner-only actions

- Cloudflare: run `bunx wrangler login`, verify your account, and confirm it is the intended destination before uploading secrets. Create/select Worker `questos`, configure its owned HTTPS origin as `APP_ORIGIN`. Enter private values from `.env.example` only in the owner deployment environment/Worker secret manager. Success: deploy health is ready and legal/login routes work.
- Supabase: Dashboard → your organization → New project (or select intended existing destination). Follow the supported export/restore checks above. Authentication → URL Configuration: Site URL is the exact independent origin; add `app.questos.android://auth/callback` and the independent web origin. Authentication → Providers → Google: enter your OAuth credentials and Google's displayed Supabase callback if enabling Google. Success: old account UUIDs/data and normal profile edits preserved; billing edits denied; existing test account signs in.
- RevenueCat/Play/Stripe: complete the exact product/key/webhook mapping sections above in the owner dashboards. Success: provider catalog validates annual USD 19.99 and verified staging purchase/restore/cancel/refund flows match the database. Never enable sandbox receipts on the live database.
- Android: after deployment, set `CAPACITOR_SERVER_URL=https://<your-independent-host>` and run `bun run android:sync:prod`. Open `C:\pixel-perfect-copy-9579\android` in Android Studio, select Pixel 8, press Run. Success: signed-in core/AI and native permissions/lifecycle work; account switching exposes no prior account state. The current APK only contains the unconfigured fallback shell.
- Signing/internal testing: provide the existing upload keystore and four `QUESTOS_*` signing variables; run `android/gradlew.bat -p android bundleRelease`. Play Console → Testing → Internal testing → Create release: upload AAB, configure authorized testers/Play App Signing. Success: internal-test install completes a real license-test purchase and restore. No public production release.

## Primary platform references

- [Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Capacitor 8 migration and tooling](https://capacitorjs.com/docs/updating/8-0)
- [Supabase native redirects](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [RevenueCat subscriber model](https://www.revenuecat.com/docs/api-v1/customer-info-model)
- [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [RevenueCat grace behavior](https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work)
