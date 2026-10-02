# QuestOS release operations — 2026-10-01

## What is ready and what is not

The React/TanStack/Supabase/Capacitor architecture is preserved. Backend billing and quotas are authoritative. Annual purchase UI is displayed only after provider catalog validation. The code includes a native Google Play provider, a Stripe web provider, premium workspace, calendar/Health Connect bridge, account-scoped storage, and conflict-aware atomic sync.

This is **not a certified production release**. Real DeepSeek smoke tests require the owner's signed-in preview; billing dashboards/credentials and device purchases are unverified. There is no Android SDK/signing material on the current machine. No APK/AAB has been produced. Do not publish until the acceptance checklist passes.

## Already applied database changes — DO NOT RERUN

Hosted project: `c92d3ab1-8331-48a0-8bd9-a0c662b22dbe`.

The existing Drizzle history had only 0000 and 0001. On 2026-10-01, the following were applied once, transactionally, and recorded in `drizzle.__drizzle_migrations`:

| Migration | created_at | SHA-256 |
|---|---:|---|
| `0002_premium_billing.sql` | 1790643600000 | e8b415e0a31b48786f923f75f181b32b2afdfa47ccc6733697957ad6d87137b9 |
| `0003_atomic_account_sync.sql` | 1790845200000 | 1a4478d864cd896f82f79b4e608f57c62b14a782a2040d439af87f7015110f8d |

Supabase-directory copies are for a separate fresh Supabase deployment, not a second migration run against Lovable. Historical migrations were not rewritten. The profile checksum before/after was identical (`0d14503564c834a8e19122c2e96b9869`); profile count 1, quests 0, legacy events 0. No current paid accounts or ambiguous paid/null-expiry accounts existed. Hosted rollback-only role tests confirmed normal profile edits, denial of billing ID/entitlement/trial edits, and privileged RPC restrictions.

## Server and public configuration

Open the QuestOS Lovable editor → **Cloud → Secrets → Add secret**. Use the variable names in `.env.example`. Enter private values only in that form, not chat, Git, screenshots, or VITE variables. These tools cannot inspect/manage that secret form.

- Preserve the already-entered `DEEPSEEK_API_KEY`; configured model is `deepseek-flash` at `https://api.deepseek.com/chat/completions`.
- Preserve hosting-supplied `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_PUBLISHABLE_KEY`.
- `INSTALL_FINGERPRINT_PEPPER`: a stable randomly generated secret of at least 32 characters. Never rotate casually: it anchors installation trial claims. Missing pepper fails trial creation closed. Trial is seven days, app-managed, with no automatic charge. Reinstalling the same account cannot restart it. Client-supplied installation identity is an abuse signal, not proof against creating unrelated accounts.
- `BILLING_ENVIRONMENT=live` must equal `public.billing_configuration.environment`. Use a **separate staging database/project** with both set to `sandbox` for test purchases; do not toggle the production database to let test receipts grant live access.
- `APP_ORIGIN`: exact final HTTPS origin, e.g. `https://your-project.lovable.app`, no path. Checkout returns must use this origin. Set once the publication URL is known.
- Stripe connector fields: `LOVABLE_API_KEY`, `STRIPE_LIVE_API_KEY`/`STRIPE_SANDBOX_API_KEY`. The latter are **Lovable connector connection keys**, not Stripe private `sk_` keys. Connect the workspace's Stripe integration before using them.
- `PAYMENTS_LIVE_WEBHOOK_SECRET`/`PAYMENTS_SANDBOX_WEBHOOK_SECRET`: corresponding Stripe endpoint signing secrets.
- `REVENUECAT_SECRET_API_KEY`: RevenueCat server API credential with subscriber read permission, never the public SDK key.
- `REVENUECAT_APP_ID`: exact RevenueCat app identifier from the Android app configuration.
- `REVENUECAT_WEBHOOK_AUTH`: a random secret; webhook dashboard Authorization value must be `Bearer <that-secret>`.

Public build variables: `VITE_PAYMENTS_CLIENT_TOKEN` is the matching Stripe `pk_live_...`/`pk_test_...`; `VITE_REVENUECAT_ANDROID_KEY` is the Android `goog_...` SDK key. Set through the hosting build environment and rebuild. The existing public Supabase URL/publishable key are preserved in `src/integrations/supabase/public-config.ts` so removing tracked `.env` files does not break login. VITE overrides remain supported. Public keys are not service-role credentials. `.env` and `.env.development` remain locally but are untracked.

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

1. Lovable workspace → **Connectors / Integrations → Stripe**: sign in and connect the intended Stripe account. Current accessible connector inventory was empty; private connection credentials cannot be fabricated.
2. Stripe Dashboard → **Product catalog → Add product / existing QuestOS Premium**. Add an active recurring annual price, USD **19.99**, interval **Year**, lookup key **premium_annual**. The backend rejects wrong currency, amount, interval, duplicates, inactive products, or environment mismatch.
3. Stripe → **Settings → Billing → Customer portal**: enable subscription cancellation/payment-method management and save the configuration.
4. Stripe → **Developers / Workbench → Webhooks → Add destination**: `https://<APP_ORIGIN-host>/api/public/payments/webhook?env=live` (sandbox uses `env=sandbox`). Select `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`, `charge.refunded`. Store the endpoint signing secret securely as above.
5. Test successful annual checkout, user cancellation, retry/double-click, payment failure, portal cancellation, full refund, restore, duplicate delivery and out-of-order delivery in staging. Backend verification uses current provider state and paid invoices, not browser success flags.

## Native authentication

Email/password and email verification remain supported. Email verification opens the secure web origin; return to the app and sign in after confirming.

Google on web retains the existing Lovable flow. Native Google uses external browser + Supabase PKCE and is hidden until configured:

1. Supabase project's **Authentication → Sign In / Providers → Google**: enable the provider with the owner's Google OAuth credentials. In Google Cloud Console, authorize the exact Supabase callback URL displayed in that provider screen.
2. **Authentication → URL Configuration → Redirect URLs → Add URL**: `app.questos.android://auth/callback`. Keep the approved HTTPS web origin too.
3. Set public build flag `VITE_NATIVE_GOOGLE_AUTH_ENABLED=true`, rebuild, and test on a device. The manifest accepts only that scheme/host/path; client accepts a code only during a ten-minute locally initiated sign-in and exchanges its PKCE verifier. URL tokens are rejected.
4. Test cancel, failed sign-in, warm/cold callback, session refresh, logout, account B login, and Android Back/resume. Do not enable the flag on production until this passes.

## Android SDK, build and signing

Source: min SDK 26, compile/target SDK 36, Capacitor 8, Android Gradle Plugin 8.13, Gradle 8.14.3. JDK 23 exists locally, but use a JDK supported by Capacitor/AGP (JDK 21 recommended). The machine has no SDK. No source workaround was made for that absence.

Android Studio → **More Actions → SDK Manager** (or Settings → Languages & Frameworks → Android SDK): install **Android SDK Platform 36**, **Android SDK Build-Tools 36.0.0**, **Android SDK Platform-Tools**, **Android SDK Command-line Tools (latest)**. Install an API 36 emulator image/Android Emulator if not using a device. Accept SDK licenses yourself.

PowerShell, after installation (adjust JDK path to your actual JDK 21):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
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
bunx cap sync android
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

Expected success artifacts (not produced on this machine): `android/app/build/outputs/apk/debug/app-debug.apk` and `android/app/build/outputs/bundle/release/app-release.aab`. Release uses R8/resource shrinking and plugin annotation keep rules; validate the optimized build on device. Do not replace an existing signing key. Keep passwords out of terminal history, Git and Gradle properties.

## Play internal testing and disclosures

Play Console → **Test and release → Testing → Internal testing → Create new release**: upload the successful signed AAB, complete Play App Signing, add release notes/testers, review and roll out **to internal testing only**. Settings → License testing: add the tester's Google account. Install through the internal-test opt-in link, not only a sideload, for billing tests.

Main store listing: title **QuestOS**, upload `docs/store/questos-icon-512.png`; create truthful device screenshots after real testing. App content: complete privacy policy URL (`<published-origin>/legal/privacy`), app access instructions/test account, ads declaration (code has no ad SDK), content rating, target audience and Health apps declaration based on actual intended audience/use. Owner must make the legal declarations; do not guess them.

Data Safety evidence: authentication email/display name and Supabase user ID; quests/goals/journal/stats/settings; account-linked usage analytics; billing customer/subscription identifiers and purchase status; AI prompts/context sent to DeepSeek through the backend, with request/token metadata retained separately (no prompt/response text in AI request logs); hashed installation identity for trial checks; optional calendar event titles/times; optional confirmed daily steps/sleep/exercise totals. Health samples are read locally, totals uploaded only after confirmation, never included in Coach requests. Health is not used for ads/diagnosis. There is no remote push token registration. Calendar access is user-initiated; only app-created linked events are written. Confirm the support mailbox `support@questos.app` is controlled/monitored before publication. Store requires a working privacy and account-deletion path; Settings → Delete account is implemented, and the public privacy page explains it.

## Four required live AI smoke tests

Open the Lovable project preview, sign into Lovable if prompted, then QuestOS. Automated access was blocked by sign-in; the current tool set also has no browser-control runtime. Never treat HTTP/build/mock tests as these results.

1. Home → AI Coach → **Morning brief**. Generate once.
2. AI Coach → **Goal to quests**. Enter a small goal, generate once, review and add a quest; confirm persistence after reload.
3. Legacy → Journal → **Reflection prompt**. Generate once; write a short test entry and save.
4. Sign up a **new test account**, confirm email if requested → onboarding wizard → enter goals/interests → generate starter quests → finish; confirm valid UUID-backed quests persist.

Before/after each single click, query Cloud → Database → SQL editor. Replace the UUID with the test account's own ID; do not share private prompts:

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

Only after web gates pass: Lovable editor → **Publish → Publish/Update** for the verified revision. Do not publish merely because a build passes. Do not roll Android out to production before internal testing passes.

## Primary platform references

- [Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Capacitor 8 migration and tooling](https://capacitorjs.com/docs/updating/8-0)
- [Supabase native redirects](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [RevenueCat subscriber model](https://www.revenuecat.com/docs/api-v1/customer-info-model)
- [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)
- [RevenueCat grace behavior](https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work)
