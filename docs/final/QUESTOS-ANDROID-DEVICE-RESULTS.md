# Android device results

## November 20 verified lifecycle update

The genuine no-charge Play purchase, server Premium activation, same-account restore, accelerated renewal, voluntary cancellation, access through the paid period, and expiration/access removal now PASS. All four provider lifecycle webhooks returned HTTP 200 on attempt 1. Sandbox B remained free. Offline cold start and Retry recovered Sandbox A with its session intact. See [dated evidence and remaining coverage limits](QUESTOS-SANDBOX-LIFECYCLE-2026-11-19.md). This supersedes older pending-lifecycle and inaccessible-device statements below. Cross-account store restoration, reinstall and final production eligibility are not yet passed. No real payment, AAB rebuild or production submission occurred.

## November 18 continuation

See [native billing repair and actual Play checkout evidence](QUESTOS-NATIVE-BILLING-REPAIR-2026-11-18.md). This supersedes the older missing-installation and inaccessible-emulator blockers below. Native pricing and sandbox receipt ingestion now work. RevenueCat and Supabase confirm refund/revocation; provider webhook delivery returned HTTP 200. Active Premium, renewal, voluntary cancellation and restore still need a fresh promptly completed no-charge cycle. No production submission or AAB rebuild was performed.


## November 17 Play-installed Alpha verification

ADB on emulator-5554 confirms package app.questos.android, versionCode 3, versionName 1.0.0, installer and initiating package com.android.vending. MainActivity resolves and `am start -W` returned Status: ok. Actual screenshot `nov17-alpha-launch.png` shows the QuestOS login screen.

Offline cold start PASS: disabled emulator Wi-Fi and mobile data, force-stopped only QuestOS, launched MainActivity (LaunchState COLD), and observed the bundled “Let's reconnect” screen with Retry QuestOS (`nov17-offline.png`). Both network transports were restored in a finally block. Clicked Retry through the embedded Android Studio emulator; observed the login screen again (`nov17-reconnected.png`). No data-clear command was used. Authenticated session preservation and post-purchase recovery remain separate, pending checks.

The embedded Android Studio emulator is now capturable and controllable, resolving the previous standalone-window capture blocker. Private Sandbox A login is handed to the owner because the Windows computer-use skill prohibits automating authentication dialogs.

## November 16 continuation

Pixel_8 is now emulator-5554; ADB package inspection found QuestOS absent. Capture failed despite owner repositioning and one recovery attempt. Authorized ADB screenshot `nov16-device.png` shows Android System UI ANR, not a QuestOS crash. Rebooted without wiping data; sys.boot_completed returned 1. Screenshot `nov16-device-recovery.png` shows launcher loading, not proof of application recovery. Owner agreed to install Alpha manually from Play. Installer/version and application recovery checks remain pending.

Updated 2026-11-13. Existing closed-test AAB preserved; no signed rebuild or reupload.

- Artifact: `C:\Users\DELL\Downloads\QuestOS-Closed-Testing.aab`
- SHA-256 rechecked: `9EBA48787FAD2C033ACB0762DAA4A54F7D0398C9BD6DEA526234BEA94D659CE9`
- Existing verified release metadata: package `app.questos.android`, versionCode 3, versionName 1.0.0, minSdk 26, target/compileSdk 36. Signature evidence is from the prior release verification; this continuation checked hash equality.
- Production sync passed against the existing HTTPS Worker. No AAB required for the server-only sandbox changes.
- `gradlew.bat -p android testDebugUnitTest assembleDebug`: PASS, 458 tasks, BUILD SUCCESSFUL. Gradle reports deprecation warnings and Kotlin recommends at least Gradle 8.14.4; current wrapper is 8.14.3. No tooling upgrade introduced during this release verification.

Pixel_8 was reopened without wiping data. ADB sees it as `emulator-5556`; the other connected device is not used for tests. Package inspection found no installed `app.questos.android` on Pixel_8. A Play-installed Alpha build must be verified before billing tests; a debug sideload is not equivalent.

Desktop capture failed twice with `window crop is outside captured monitor`. Owner was asked to move the entire emulator onto the main monitor. No stale coordinates or blind clicks were used.

Current device-only checks remain unverified: Play installer/version, actual test checkout, cold offline startup, Retry/reconnect, background/process recovery, authenticated account switching. Prior owner-confirmed Google OAuth success and four instrumentation checks are historical evidence, not newly executed tests. No new signed AAB was generated.
