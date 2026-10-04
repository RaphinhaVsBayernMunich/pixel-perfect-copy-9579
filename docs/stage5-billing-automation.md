> Historical annual setup report. Superseded by the monthly correction in docs/stage5-monthly-completion.md.

# Stage 5 billing automation — 2026-10-04

Status: **partial**. Repository fixes are tested and deployed. Google Play accepted the annual product; RevenueCat and Google CLI authentication remain unavailable. No purchase, production Play release, payment-profile replacement, private-key export, or AAB rebuild was performed.

## Existing implementation and changes

- Capacitor RevenueCat plugin 13.2.3 resolves native Purchases 10.13.0, hybrid-common 18.21.0 and Google Billing 8.3.0. React/TanStack, Supabase and the existing Worker remain intact.
- SDK initialization/login use the authenticated Supabase UUID. Logout clears billing, UI and cached account state. Added provider-level UUID, anonymous-access and SDK identity checks, including discarding results after an account switch.
- Purchase/restore SDK responses only trigger trusted backend reconciliation. They cannot directly grant server premium. Cancellation retains the paid period, grace is bounded to three days, refunds revoke, expiry is finite, transfers are atomic and duplicate/stale events are rejected by existing PostgreSQL functions.
- Native offerings now explicitly select `default` and `$rc_annual`, the annual Google product and annual base plan. Regional prices come from Google Play; the verifier checks the exact US price rather than incorrectly applying US pricing to tax-inclusive USD regions.
- RevenueCat backend requests now use Cloudflare-compatible `redirect: manual`; redirects, HTTP errors, oversized responses and malformed JSON fail closed with sanitized errors.
- The internal/Stripe `premium_annual` plan remains compatible with existing data. It is no longer accepted as a Google Play receipt product.
- Native billing management opens the specific QuestOS subscription in Google Play.
- Extended secret scanning to RevenueCat private keys, configuration keys and webhook references in client assets; ignored private service-account JSON filenames while retaining safe examples.
- Existing migrations were inspected. No new migration or data deletion was necessary. Live rollback-only Supabase checks passed again.

## Canonical mapping and actual dashboard state

| Item                | Value                           |
| ------------------- | ------------------------------- |
| Android application | `app.questos.android`           |
| Play subscription   | `questos_premium_annual`        |
| Base plan           | `annual`                        |
| RevenueCat product  | `questos_premium_annual:annual` |
| Entitlement         | `premium`                       |
| Offering            | `default`                       |
| Package             | `$rc_annual`                    |
| US annual price     | `$19.99`                        |

Google Play account `5438030713150798651`, app `4975142940532820904`: created the missing canonical subscription and activated the yearly auto-renewing base plan. US price is USD 19.99; Google converted regional prices. Grace is three days. No store trial offer was created. Activation was verified in the authenticated Play Console, not via the unauthenticated local API. The owner-reported BillDesk connectivity issue remains unresolved; it did not prevent this activation.

Application trial remains server-managed for seven days, without automatic billing. Shared server AI quotas remain 10 free / 40 trial / 500 paid requests per UTC day. Live billing deliberately rejects sandbox receipts; no bypass was introduced.

## Google and RevenueCat access

The existing Google Cloud project is `questos-510417` (number `631409171909`). No replacement project was created. Installed official Google CLI 587.0.0 in ignored `supabase/.temp/google-cli`, verified against Google's published SHA256. Local CLI authentication has no account; the private owner sign-in window is open.

`scripts/setup-google-billing.ps1` is prepared for authenticated execution. It checks the existing project and owner identity, idempotently enables Android Publisher, Play Developer Reporting and Pub/Sub, creates/reuses `questos-revenuecat`, applies RevenueCat's documented Pub/Sub Editor and Monitoring Viewer roles, creates/reuses `projects/questos-510417/topics/questos-revenuecat`, and grants Google Play's system publisher access to that topic. It does not create a JSON private key. **It has not run against Google: authentication is missing.**

RevenueCat is signed out in the available browser. No RevenueCat public SDK key, app ID, server verification key, configuration API key or webhook authorization secret is available in the current environment. The existing Worker lacks the RevenueCat billing secrets. Consequently app/catalog/receipt validation and RTDN delivery cannot yet be completed. No duplicate RevenueCat resources were created.

After owner authentication, continue automated configuration; do not ask the owner to perform automatable dashboard work. If needed, store any service-account JSON only in the owner-controlled private secrets directory, never the checkout. The Play service account needs app-scoped view-app, view-financial and manage-orders/subscriptions permissions; do not grant account administration or release permissions.

Official references: [Google CLI archives](https://docs.cloud.google.com/sdk/docs/downloads-versioned-archives), [RevenueCat Google credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials), [RevenueCat RTDN](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications), [RevenueCat Developer API](https://www.revenuecat.com/docs/api-v2).

## Verification and production deployment

`bun run billing:verify` is read-only: no purchase, receipt grant or configuration mutation. It verifies canonical mappings/native runtime, secret scans, live Supabase schema and security using rollback-only SQL, backend health, production billing bindings, Cloudflare secret names, Google APIs/service-account presence, RTDN topic/publisher access, active annual Play product/price/no stacked trial, RevenueCat app/product/entitlement/offering/package associations and the verified public SDK key embedded in the current client build. Private provider responses and token values are never printed.

Current result: **exit 1, six failed checks** — production billing configuration; missing Cloudflare RevenueCat secrets; Google APIs/account verification; RTDN verification; programmatic Play verification; RevenueCat catalog verification. These are explicit configuration/access failures. Four checks pass: canonical runtime, source/assets scan, live database security, production app health. A configured billing health response only confirms bindings are present; store receipt verification and device testing remain necessary even after catalog verification passes.

The existing Worker was updated successfully, version `48144f1f-d0b9-452a-b430-dbceeb201265`. General production health is HTTP 200. Billing configuration health is HTTP 503 and exposes no secret values. Unauthenticated RevenueCat delivery is rejected.

| Check                               | Result                                                    |
| ----------------------------------- | --------------------------------------------------------- |
| `bun install --frozen-lockfile`     | Pass; lockfile unchanged                                  |
| `bun run typecheck`                 | Pass after build regenerated the new route types          |
| `bun test`                          | 90 passed, 0 failed; 450 assertions across 13 files       |
| `bun run build`                     | Pass, including final deployment build                    |
| `bun run security:scan`             | Pass; 420 files scanned, 0 findings including this report |
| `bun run android:sync:prod`         | Pass; approved HTTPS origin, cleartext false, 11 plugins  |
| `bun run billing:verify`            | Expected failure above; no purchase attempted             |
| Changed-file ESLint                 | Pass                                                      |
| Google setup PowerShell parser      | Pass; no infrastructure mutation executed                 |
| Android release dependency insight  | Pass; Billing 8.3.0 confirmed                             |
| Original AAB signature verification | Pass; 466 payload entries signed by owner certificate     |
| APK/AAB packaged assets             | 14 checked, 0 private-key/stale-runtime findings          |

Gradle dependency resolution reports a recommendation to update 8.14.3 to 8.14.4 and Gradle 9 deprecation warnings; the command succeeds. No unnecessary toolchain/native release changes were made.

Original AAB remains `android/app/build/outputs/bundle/release/app-release.aab`, versionCode 1 / versionName 1.0.0, SHA256 `D7F57EF03F7AD218A4EB5189F8A8DC4DA62E7050DD5D7D1F77A766AAFBF518DA`. Native shell and package are unchanged, so the already-uploaded Internal Testing AAB remains applicable. The keystore and passwords remain private and untracked.

## Unavoidable owner actions

1. Finish the private Google CLI authentication and RevenueCat sign-in. Do not send credentials or authorization codes in chat. Further Google/RevenueCat setup can then continue automatically.
2. Resolve the existing BillDesk verification connectivity issue through the existing merchant profile; no replacement payment profile was created.
3. After billing configuration and permissions are verified, choose an internal tester and perform authorized device/store purchase/restore testing. No real purchase was automated. Sandbox purchase testing needs an isolated sandbox backend; sandbox receipts must not unlock live paid access.
