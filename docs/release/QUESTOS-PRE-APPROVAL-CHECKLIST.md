# QuestOS pre-approval completion record

Updated 2026-11-07. Branch: `codex/preapproval-2026-10-31`. Continues audit `03ccbad` and release preparation `bd0c8bd`; it does not replace their historical evidence.

**Overall: BLOCKED BY EXTERNAL VERIFICATION.** Play review is no longer the blocker: Alpha is active and available to selected testers (Console observed November 7; release dated October 31). No purchase was attempted, no release changed, and no production customer change committed.

| Item | Result | Actual evidence / repair / next action |
| --- | --- | --- |
| Submitted AAB preserved | PASS | Downloads/QuestOS-Closed-Testing.aab SHA-256 remains `9EBA48787FAD2C033ACB0762DAA4A54F7D0398C9BD6DEA526234BEA94D659CE9`; version 3 unchanged. No release build run. |
| License and Alpha eligibility | PASS | Existing Internal Testers list contains designated account; list selected for license testing and Alpha. No duplicates or edits. See license report. |
| Provider configuration | PASS | `bun run billing:verify --approve-destination-check`: 10/10. Explicit flag follows owner approval for rollback-only SQL. |
| Application checks | PASS | Frozen Bun install, TypeScript, 113 tests / 606 assertions / 19 files, production build, changed-file ESLint. Full lint: zero errors, eight existing Fast Refresh warnings. |
| Secret scan | PASS | Source/generated asset scan: no findings. Private evidence remains ignored. |
| Production native sync | PASS | `bun run android:sync:prod`; initial restricted-network DNS failure resolved using authorized network access. |
| App Android verification | PASS | `:app:assembleDebug :app:connectedDebugAndroidTest`; four tests, zero failures/errors on Pixel_8 API 36. These are configuration tests, not visual recovery tests. |
| Aggregate third-party instrumentation | FAIL | Unqualified `connectedDebugAndroidTest` also builds Capacitor library test APKs; duplicate Kotlin 1.8.22/1.6.21 classes. No production app dependency change made to fix upstream test-only modules. Use app-scoped task. |
| Offline/device experience | BLOCKED | Emulator capture failed twice: window crop outside captured monitor. See recovery report. |
| Purchase lifecycle | BLOCKED | No isolated hosted sandbox backend; production correctly rejects sandbox receipts. No purchase/delivery success claimed. |
| Production health | PASS | `/api/health`: HTTP 200 ready; `/api/billing/health`: HTTP 200 configured; unauthenticated webhook POST: 401. |
| Dependency advisories | FAIL | Removed unused drizzle-kit and its old esbuild advisory. Two moderate development-tool advisory families remain: glob and minimatch. Compatible audit fix cannot resolve parent ranges. |
| Leaked-password protection | FAIL | Live Supabase advisor still reports disabled. Owner must enable if plan supports it; no paid-plan change authorized. |

## Changes and verification

Removed unused Drizzle CLI from package.json and Bun lockfile; archived its config as non-executable `drizzle/legacy-config.ts.txt`. Historical migrations retained. Added stale-active-after-expiry regression and cancellation access assertion in `tests/premium-billing.test.ts`. Added explicit `--approve-destination-check` forwarding in billing verification; no automatic hosted SQL consent by default.

Local, ignored evidence: `supabase/.temp/preapproval-{tests-final,lint-final,build-final,sync-final,billing-approved,db-approved,app-android,audit-final}.log`; app instrumentation XML in `android/app/build/outputs/androidTest-results/connected/debug/`. Private dashboard captures are not committed.

## Deployment compatibility decision and rollback

Current Worker deployment inventory ends at version `e1858c37-b8f3-4f6c-982c-0811c716f71c` (October 17). The previous audit identifies source baseline `d7cfce0`; deployment metadata does not independently establish an exact Git hash. No migration was introduced in the audit-to-current comparison.

| Change group since baseline | Classification | Compatibility assessment |
| --- | --- | --- |
| Tests, formatter, documentation, Drizzle removal | Development-only | No app behavior change; committed on dedicated branch. |
| Capacitor 8.4.3 and native offline errorPath | Native security/recovery | Already included in submitted version 3; do not rebuild or replace it. |
| Zod 4, Vite/serialization dependency updates | Security + potentially breaking runtime | Build/tests pass; major validator/runtime upgrade requires authenticated candidate smoke test before deployment. |
| Settings/analytics JSON validators and sanitized errors | Security + functional validation | Legitimate JSON shape retained; non-JSON inputs rejected, backend errors no longer returned verbatim. |
| OAuth callback stricter parsing | Security + functional validation | Valid callback tests pass; malformed credentials/ports/duplicate codes rejected. Native interactive verification pending. |
| Onboarding text and remaining source formatting | Functional copy / development-only | No billing ID, price, or migration changes. |

**Decision: prepare, do not deploy this aggregate runtime change yet.** A passing build alone does not establish authenticated settings/sync/OAuth compatibility for the active Play client. No production deployment was performed in this pass. Current-turn source changes are tooling/tests only and need no deployment.

Before deployment: serve candidate in an isolated authorized environment, verify existing-account login, settings save, sync conflict/retry, callback, premium loading and logout; compare production release native bridge contract. Then rerun checks, deploy using `bun run deploy`, and verify both health endpoints plus authenticated smoke tests without real purchases. Record the new Worker version. On regression, run `bunx wrangler rollback e1858c37-b8f3-4f6c-982c-0811c716f71c --config wrangler.json` after confirming it is still the intended previous version. No DB rollback required because no migration is proposed. Recheck health and sessions after rollback. Never roll back by rewriting Git history.

## Security closure

Live approved rollback test passes: 18 public tables RLS-protected, normal profile edits allowed, billing/customer/trial fields denied, sensitive RPCs server-only and cross-account reads blocked. PGlite tests separately exercise transactional sync and billing authority. `write_account_save` intentionally remains SECURITY DEFINER with authenticated EXECUTE: auth.uid ownership, field allowlist, revision lock, atomic writes and owner-scoped deletion; revoking it breaks persistence. Prior audit confirms client roles cannot CREATE in public. Nine no-policy tables are deliberately server-only, not missing public access.

Remaining development advisories: [glob GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) through Capacitor CLI/rimraf, and [minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) through lint/build tools. Do not expose build tools to untrusted input; update parents when compatible fixes are available. No blanket incompatible major override applied. This npm scan does not prove the absence of all native SDK vulnerabilities.

Owner setting: Supabase project kqsoccbtookvwelctyhm → Authentication → email/password security → enable leaked-password protection if available. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). If a paid plan is required, owner decides; no charge or security bypass performed.
