# Android verification

Package `app.questos.android`; versionName `1.0.0`; versionCode `2`. compileSdk/targetSdk 36, minSdk 26. Gradle 8.14.3, Android Studio bundled JBR. Production runtime remains `https://questos.questos-1fd92776.workers.dev`.

## Fixed and retested

Capacitor Android patched to 8.4.3. Bundled `native-shell/offline.html` is wired through `server.errorPath`. HTTPS, cleartext disabled, mixed content disabled, backup disabled and release WebView debugging disabled are asserted. OAuth callback resolves `app.questos.android://auth/callback`; wrong host does not resolve.

`assembleDebug`, `:app:testDebugUnitTest` and production sync pass. Four instrumentation tests pass on Pixel_8 Android 16, repeated on 2026-10-29 (`audit-instrumentation-resumed.log`). Existing trivial JVM unit coverage is not equivalent to complete native feature testing.

Debug output: `C:\pixel-perfect-copy-9579\android\app\build\outputs\apk\debug\app-debug.apk`.

## Authentication evidence

Email/password login reached onboarding in the emulator earlier in this audit. On 2026-10-29 the owner signed into a Google Play license-test account and explicitly reported that QuestOS Google sign-in returned to QuestOS signed in. Mark this **owner-verified OAuth round trip**, not an agent-observed automated recording.

ADB confirmed the emulator is connected and the QuestOS installer is `null` (sideloaded debug). Signing into Google Play does not by itself prove license-tester configuration or store purchase behavior.

## Blocked / not tested

Desktop UI automation became unavailable. The owner could not perform the requested offline cold-start/Retry check. Actual offline recovery, session recovery after process death, complete logout/account switching, hardware health/calendar permissions and Play-installed release behavior remain unverified in this continuation. Instrumentation validates wiring, not these end-to-end outcomes.

## AAB

No signed AAB generated. Existing AAB predates these native fixes and must not be represented as the repaired candidate. A future authorized release build needs a versionCode above the highest uploaded Play version; do not reuse 2 if already uploaded. Complete the remaining device checks before final release sign-off.
