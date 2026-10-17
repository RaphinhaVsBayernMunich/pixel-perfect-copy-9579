# Final engineering and acceptance pass — 17 October 2026

## Changes

- Settings now exposes Sign out on phone layouts. Desktop uses the same action. It prevents duplicate clicks, checks Supabase errors, and preserves the existing auth-event cleanup for account stores, queries, and RevenueCat identity.
- Billing SDK initialization and server trial/access verification run concurrently. Repeated initialization for the same session is suppressed; redundant RevenueCat login is skipped only after checking its current UUID.
- Display-only offerings metadata is cached in memory for five minutes with concurrent-request deduplication, bounded retry backoff, background refresh and identity-reset protection. Purchase still retrieves a live RevenueCat package and verifies the UUID before and after purchase. No cached entitlement or cached package authorizes payment.
- Web-only embedded checkout is loaded on demand. AI quota errors offer a dismissible Premium action for non-paid users, without automatic checkout or stacked quota notifications.
- No billing IDs, quotas, migrations, native code, signing configuration, or Play declarations changed.

## Verification

Final suite: 109 passed, 0 failed, 546 assertions across 19 files. Four new tests cover pricing deduplication, expiry, retries, empty catalogs and identity races.

Commands passing after final code changes: `bun run typecheck`, `bun test`, `bun run build`, `bun run security:scan`, `bun run android:sync:prod`, `bun run billing:verify`, and ESLint on all changed TS/TSX files. Security scan: 491 files, zero findings. Billing: 10/10.

31 final live acceptance checks passed: 22 original API checks, two corrected free-account checks, three persisted-data/log checks and four deletion/cascade checks. Together with 109 suite tests and 10 billing checks: **150 validated automated checks**. This count excludes browser observations and repeated runs. One initial free-account assertion used a fixture that still had its automatic signup trial; after a trusted backend correction limited to that disposable fixture, both expired/free checks passed. Earlier harness protocol errors were test-harness failures, not app defects; raw local logs are retained.

Live checks included seven successful DeepSeek features with positive input/output token metadata, memory persistence, explicit health-summary save/clear, UUID quest CRUD, normal profile edits, denial of billing-field edits, cross-account isolation, safe invalid AI input, export, unauthenticated webhook rejection, and deletion safeguards. Both disposable accounts were deleted through the real production endpoint; profiles, quests, legacy events and premium documents were verified absent. That endpoint requests RevenueCat deletion before Supabase deletion. Unit tests cover provider rejection and retry, local deletion cleanup, quota limits, annual receipts, restore and account-change races.

Browser observations: optional onboarding skipped; explicit AI disclosure; skip-AI completion; separate starter-generation path added eight quests; completion persisted; long quest creation and reload; completion awarded 120 XP and level 2; journal save/reload; second account had zero journal entries and no inherited XP; save-conflict recovery retained the chosen copy; Settings light theme; calendar usable without native permission; free pricing error and retry; AI Coach entry point; logout returned to auth on local preview and deployed production.

SMTP confirmation and Android Google login were previously owner-confirmed; they were not repeated as fresh end-to-end tests in this pass. OAuth cancel/retry and actual native SDK/UI interactions remain unverified on a device. Purchase presentation tests exercise free/trial/paid/loading/unavailable/processing/error/manage states; provider/reconciliation tests cover isolation and restore. No real purchase was made and no paid customer was simulated in production.

## Performance and mobile evidence

Browser automation click-to-visible Premium header: before 111 ms; first after 543 ms; subsequent samples 856/822/772 ms. These are sparse web measurements including automation overhead and do **not** establish a latency improvement or measure Google Play pricing. Native before/after pricing latency still requires the Play-installed app. The verified structural improvement is removal of the startup waterfall and repeated catalog requests; do not substitute this for a measured native speedup.

Initial JavaScript bundle reduced from 581.32 kB / 184.01 kB gzip to 567.79 kB / 179.73 kB gzip; web checkout moved into a separate 14.06 kB chunk. Worker startup reported 2 ms for the earlier deployment.

Actual 360×800 and 412×915 browser layouts were exercised. Dashboard and calendar had no document horizontal overflow; long-title wrapping, AI modal, journal, settings and logout screenshots are under `supabase/.temp/acceptance/screenshots/`. Computed typography reported Sora headings and Inter body. Browser testing cannot prove Android keyboard, native permission or Play-sheet behavior.

Local evidence (ignored, not committed): `supabase/.temp/acceptance/ship-tests.log`, `ship-build.log`, `ship-deploy.log`, `api-results.json`, `free-results.json`, `metadata-results.json`, `cleanup-results.json`, performance JSON and screenshots. No credentials are in this report.

## Deployment and release

Final Cloudflare version: `e1858c37-b8f3-4f6c-982c-0811c716f71c`. Home, app health, billing health, privacy, terms, account deletion and partial data deletion returned HTTP 200 after deployment.

No AAB rebuild is required: the changes are delivered by the existing remote runtime. Existing versionCode 2 / versionName 1.0.0 AAB: `android/app/build/outputs/bundle/release/app-release.aab`; SHA-256 `9D6228D51D39818F9BE06569B639AF219DE801B7AA3C19CDF73CE51FC7314033`. Bundletool validation exited 0. Jarsigner reports `jar verified`, with self-signed certificate/no timestamp and JarInputStream manifest-order warnings; no signing material was changed.

Play Console shows Internal testing, Production inactive, saved listing/declaration changes awaiting review, and no Production release or country selection. Publishing overview's Send app for review is disabled until required release setup is complete. Saved changes include QuestOS listing, Productivity category, 13+ target audience, privacy URL, Data Safety, Health and content rating; government, financial and app-access declarations are recorded. Nothing was resubmitted.

Payments profile still says **You need permission** for the current signed-in account. BillDesk/payment completion and global sales readiness are therefore not verified. Owner must use the payments owner at Play Console → Manage account → Play apps settings → Monetization settings → Payments profile. Do not bypass this or create another profile. Production submission is blocked pending this evidence and the final device release gate; no Play Production submission or rollout occurred.

Device checks still needed: Play purchase sheet and license-tester purchase; actual Play cancellation; restore of a real test purchase; native Health Connect and calendar permission/no-data scenarios; keyboard/sheet behavior; OAuth cancellation and deep-link return edge cases; actual pricing latency. ADB reported no devices attached.
