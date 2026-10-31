# Closed-testing Alpha bundle verification

Verified 2026-10-31. Result: **AAB READY FOR GOOGLE PLAY UPLOAD** (closed testing only).

## Artifact

- Delivered file: `C:\Users\DELL\Downloads\QuestOS-Closed-Testing.aab`
- Original: `C:\pixel-perfect-copy-9579\android\app\build\outputs\bundle\release\app-release.aab`
- Size: 4,859,789 bytes.
- SHA-256: `9EBA48787FAD2C033ACB0762DAA4A54F7D0398C9BD6DEA526234BEA94D659CE9`
- Package: `app.questos.android`
- Version: `1.0.0` (versionCode `3`).
- Compile/target SDK: 36; min SDK: 26.
- Upload certificate SHA-256: `6A:14:59:EC:36:A2:59:F8:D1:71:C1:5A:F1:1E:09:16:10:D1:15:E0:1F:43:FA:62:18:AF:96:D1:FA:88:EE:45`.

The existing upload key and alias `questos` were reused. Passwords were entered privately and verified without logging. The first attempt stopped on an empty key-password entry; the subsequent fresh entries passed.

## Evidence

- Play API showed uploaded version 2 on internal testing and no production release. A temporary uncommitted inspection edit was discarded; nothing uploaded/published.
- Local previous version 2 exactly matched Play's SHA-256 `9d6228d51d39818f9be06569b639af219de801b7aa3c19cdf73ce51fc7314033`. The new signer matches that accepted artifact's certificate. Previous local bundle preserved before rebuilding.
- `bundleRelease --no-daemon`: BUILD SUCCESSFUL; 503 tasks. Fresh bundle built after audit commit `03ccbad`, using Capacitor Android 8.4.3.
- Java JarFile verification read all entries and verified 467 payload entries against the expected certificate; no unsigned payload accepted.
- `bundletool validate`: exit 0. Manifest dump confirms version 3, package, non-debuggable default, backup/cleartext disabled, Billing permission, BillingClient 8.3.0 and `app.questos.android://auth/callback`.
- Bundle config: `PAGE_ALIGNMENT_16K`. All four packaged native libraries have 16384-byte ELF LOAD alignment, including arm64 and x86_64.
- Packaged Capacitor URL is `https://questos.questos-1fd92776.workers.dev`; errorPath points to the included offline page. No WebView debug flag or cleartext transport enabled.
- Production frontend build, frozen Bun install, production Android sync and four instrumentation tests passed. Android lint initially failed on ignored local SDK property escaping; corrected and fresh analysis passed (19 warnings).
- Android lint emitted Kotlin metadata compatibility diagnostics despite successful completion; this limits analysis of affected third-party Kotlin libraries. Release compilation and signing succeeded. Gradle deprecation warnings remain.
- Source/generated scan: 508 files, zero findings. Bundled asset credential patterns: zero findings. No private keys/passwords tracked.
- Copied Downloads artifact hash matches the verified original.

## Boundaries

This is upload readiness for closed testing, not a production-launch acceptance verdict. No purchase/lifecycle testing was performed. Interactive offline recovery remains unverified; packaged wiring and device instrumentation passed. Audit web/server source was built locally but not deployed in this task: Android loads the existing production Worker, so local web-only audit changes must not be described as deployed. No Supabase migration, live billing setting or product was changed.

Current platform references: [target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [16 KB page sizes](https://developer.android.com/guide/practices/page-sizes). Play performs its own upload/policy validation.

Release notes: `closed-testing-alpha-en-US.txt`, also copied to Downloads. Private logs and bundletool dumps are retained under ignored `supabase/.temp/closed-*` and `stage4-release.log`.
