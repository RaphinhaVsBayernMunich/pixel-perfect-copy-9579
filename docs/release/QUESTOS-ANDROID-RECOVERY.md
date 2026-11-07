# Android recovery verification

Updated 2026-11-07. Submitted signed version 3 unchanged; only debug assembly/instrumentation performed.

| Check | Status | Evidence / next action |
| --- | --- | --- |
| Emulator boots | PASS | adb reports emulator-5554 device; Pixel_8 API 36. |
| Audited debug APK and installation | PASS | App-scoped Gradle assembly and connected tests successful; instrumentation installs the app under test. No data-clear/uninstall performed. |
| Production origin, HTTPS, errorPath | PASS | Four instrumentation tests verify correct origin, cleartext/mixed content/debugging disabled, offline.html and Retry link packaged. |
| Callback routing | PASS (configuration) | Valid callback resolves to QuestOS; unrelated host does not. Parser tests reject invalid callbacks. Owner previously confirmed Google sign-in return on October 29; not repeated. |
| Backup/cleartext manifest | PASS | Instrumentation flag assertions. |
| Fresh visual launch | BLOCKED | Windows screenshot capture twice failed: window crop outside captured monitor. Process/test launch is not a visual pass. |
| Offline cold start and fallback display | BLOCKED | Cannot observe emulator app surface; no visual result claimed. |
| Retry with restored connection | BLOCKED | Requires observed offline page and recovery. Network was not disabled in this pass. |
| Login persistence/restart | BLOCKED | No fresh interactive authenticated evidence. |
| Background/foreground and navigation recovery | BLOCKED | Requires observable UI session. |
| Data sync after reconnect | BLOCKED | Needs isolated test account and real queued edit/reconnect evidence; unit tests are not device evidence. |

Successful command: `android/gradlew.bat -p android :app:assembleDebug :app:connectedDebugAndroidTest` with Android Studio JBR. Result: 4 tests, 0 failures/errors on API 36. XML: android/app/build/outputs/androidTest-results/connected/debug/TEST-Pixel_8(AVD) - 16-_app-.xml.

The initial broader `assembleDebug connectedDebugAndroidTest` failed in upstream library test dependency resolution (Kotlin stdlib 1.8.22 versus jdk8 1.6.21 duplicate classes). This is disclosed, not a QuestOS release build failure. No upstream node_modules edits or production Kotlin overrides were made merely to run library examples.

Owner action: move the emulator fully onto an active monitor or provide an observable test device, then resume visual checks. Use only a designated test account. Verify initial screen, login, background/foreground, restart persistence; disable emulator network, cold-start, observe local fallback; restore network and tap Retry; verify navigation/session and a test-only queued edit syncing once. Restore connectivity even if a check fails. Do not wipe a real user's app data.

No new AAB is needed for the current tooling/tests/docs changes. If an actual native recovery defect is discovered, document it and use a later version code only after a separate release decision; do not replace version 3.
