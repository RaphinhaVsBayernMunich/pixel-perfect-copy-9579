# QuestOS production audit

Audit started 2026-10-26; continuation 2026-10-29. Branch: `codex/preproduction-audit-2026-10-26`, based on `d7cfce0`. Verdict: **BLOCKED BY EXTERNAL VERIFICATION**.

## Scope and evidence boundaries

The interrupted worktree was preserved: 23 tracked changes and the new native offline page were present, rather than the expected 12 files. No history was rewritten. Repairs remain on the audit branch; they have not been deployed to the production Worker or published to Play. Production API tests exercise the deployed application; local compilation and tests exercise the repaired source. No final signed AAB was generated.

React/TanStack Start, Cloudflare Worker server functions, Supabase Auth/Postgres/RLS, Capacitor Android and RevenueCat remain the architecture. Supabase migrations, not the legacy Drizzle schema, define the live database. Bun is the authoritative package manager.

## Status matrix

| System | Status | Evidence and limits |
|---|---|---|
| DeepSeek AI | PASS | Seven live feature calls succeeded; existing request records have positive input/output token counts. No repeat paid calls on continuation. |
| Supabase authorization/sync | PASS | Live profile edits, denied billing writes, cross-account isolation, 18 public tables with RLS, reviewed atomic sync RPC and regression tests. |
| Android build | PASS | Debug build, JVM tests, production sync and four device instrumentation tests. |
| Android authentication | PASS, bounded | Email/password observed earlier; owner confirmed Google OAuth returns signed in on 2026-10-29. This is owner-observed, not an automated OAuth recording. |
| Google Play Billing lifecycle | BLOCKED | Catalog/configuration passes; no sandbox purchase, renewal, restore, refund or expiry executed in this audit. |
| RevenueCat | BLOCKED for end-to-end lifecycle | Live catalog/configuration verified; contract tests pass. Provider lifecycle delivery remains unverified. |
| Security | PASS for repaired critical/high findings; residual findings | No critical/high dependency advisories at the recorded scan; one development-only moderate advisory and disabled leaked-password protection remain. |
| Application QA | BLOCKED for final acceptance | Core API/persistence tests pass. Offline restart/recovery and complete visual/device feature acceptance remain unverified. |

## Repairs

- Patched Capacitor Android to 8.4.3, Zod to 4.6.6 and Vite to 8.1.6; updated compatible transitive security fixes, sharp and undici overrides.
- Migrated Zod record schemas, retained RevenueCat receipt semantics, removed unsafe analytics/settings casts and deprecated validators.
- Wired a bundled offline recovery page into Capacitor; strengthened callback URL validation for credentials, ports, duplicate/blank/oversized codes and invalid timestamps.
- Repaired Android instrumentation package identity and added runtime, manifest and callback checks.
- Restored full lint usability: ignored generated/private scratch directories, consistent Windows line-ending handling and formatting corrections. Eight existing warnings remain.
- Removed stale npm lockfile; retained Bun lockfile and documented Bun workflow. Added premium AI output/input regression tests.
- Corrected onboarding promises of automatic weekly recaps/calendar changes. Existing tools are described as user-requested proposals; preference selection is explicitly separate from permissions and AI Memory consent. No feature was removed.

## Test inventory

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | PASS |
| `bun run typecheck` | PASS, rerun on continuation |
| `bun test` | PASS: 112 tests, 602 assertions, 19 files; zero failures |
| `bun run lint` | PASS: zero errors, eight warnings |
| `bun run build` | PASS |
| `bun run security:scan` | PASS: 506 files, zero findings after adding reports/evidence |
| `bun run android:sync:prod` | PASS |
| `bun run billing:verify` | PASS: 10/10 configuration checks; not a purchase test |
| `android\gradlew.bat -p android assembleDebug :app:testDebugUnitTest` | PASS |
| `android\gradlew.bat -p android :app:connectedDebugAndroidTest` | PASS: four tests on Pixel 8 Android 16; repeated on continuation |
| `bun audit` | Nonzero: one moderate development dependency advisory; see security report |

Local logs are under ignored `supabase/.temp/`: `audit-tests-final.log`, `audit-tests-resumed.log`, `audit-lint-final.log`, `audit-build-final.log`, `audit-android.log`, `audit-instrumentation-resumed.log`, and `audit-billing-final.log`. Sanitized fixture result JSON is under `supabase/.temp/audit-2026-10-26/`. Private fixture credentials are excluded from Git and reports.

Sanitized live test outcomes are also committed in `evidence/`. After explicit owner approval, both disposable audit accounts were deleted through the production application and deletion/cascades verified. All other accounts, including the owner's Google account and permanent reviewer, were preserved. Initial cleanup was correctly blocked pending that approval.

Continuation billing verification again passed 10/10. Production sync initially failed on sandbox DNS access (`ENOTFOUND`); rerunning with authorized network access passed. This was an execution-environment failure, not an app repair. Seroval was patched to 1.6.11 after a fresh advisory check discovered two new moderate vulnerabilities; final tests were rerun after the lockfile change.

See the six companion reports for release conditions. Passing builds alone do not establish production readiness.
