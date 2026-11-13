# Android device results

Updated 2026-11-13. Existing closed-test AAB preserved; no signed rebuild or reupload.

- Artifact: `C:\Users\DELL\Downloads\QuestOS-Closed-Testing.aab`
- SHA-256 rechecked: `9EBA48787FAD2C033ACB0762DAA4A54F7D0398C9BD6DEA526234BEA94D659CE9`
- Existing verified release metadata: package `app.questos.android`, versionCode 3, versionName 1.0.0, minSdk 26, target/compileSdk 36. Signature evidence is from the prior release verification; this continuation checked hash equality.
- Production sync passed against the existing HTTPS Worker. No AAB required for the server-only sandbox changes.
- `gradlew.bat -p android testDebugUnitTest assembleDebug`: PASS, 458 tasks, BUILD SUCCESSFUL. Gradle reports deprecation warnings and Kotlin recommends at least Gradle 8.14.4; current wrapper is 8.14.3. No tooling upgrade introduced during this release verification.

Pixel_8 was reopened without wiping data. ADB sees it as `emulator-5556`; the other connected device is not used for tests. Package inspection found no installed `app.questos.android` on Pixel_8. A Play-installed Alpha build must be verified before billing tests; a debug sideload is not equivalent.

Desktop capture failed twice with `window crop is outside captured monitor`. Owner was asked to move the entire emulator onto the main monitor. No stale coordinates or blind clicks were used.

Current device-only checks remain unverified: Play installer/version, actual test checkout, cold offline startup, Retry/reconnect, background/process recovery, authenticated account switching. Prior owner-confirmed Google OAuth success and four instrumentation checks are historical evidence, not newly executed tests. No new signed AAB was generated.
