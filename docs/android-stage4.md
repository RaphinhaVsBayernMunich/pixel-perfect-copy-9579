# QuestOS Stage 4 Android release — 2026-10-04

Production origin: https://questos.questos-1fd92776.workers.dev
Destination Supabase: https://kqsoccbtookvwelctyhm.supabase.co

## Signing architecture

Existing `android/app/build.gradle` signing configuration was preserved. It uses `QUESTOS_KEYSTORE_PATH`, `QUESTOS_KEYSTORE_PASSWORD`, `QUESTOS_KEY_ALIAS`, and `QUESTOS_KEY_PASSWORD` from the process environment. No password was hardcoded or written to properties. The owner keystore remains outside the repository at `C:\QuestOS-Secrets\questos-release.jks`, alias `questos`; it was not replaced or copied.

`scripts/build-android-release.ps1` prompts with `Read-Host -AsSecureString` in a private local PowerShell 7 window. Passwords are converted only to temporary process environment values. Keytool receives a password environment-variable name, never a literal password argument. A public certificate is exported to ignored local state for signature comparison. The separate hidden `scripts/run-android-release-build.ps1` process inherits signing variables for `bundleRelease --no-daemon`, then clears them on completion. The input process restores/clears its environment and disposes secure strings. Passwords are never logged or stored in the workspace.

The first password attempt was rejected; the owner retried privately and keystore/alias verification passed. A visible build process ended before completion, so input and build were separated to avoid coupling build lifetime to the password window.

## Configuration

- Package: `app.questos.android`
- Version name: `1.0.0`
- Version code: `1` (unchanged, positive and suitable for an initial upload)
- Compile/target SDK: `36`
- Minimum SDK: `26`
- JDK/JVM: JetBrains Runtime OpenJDK `21.0.11`; Java source/target compatibility `21`
- Android Gradle Plugin: `8.13.0`
- Gradle wrapper: `8.14.3`

Debug APK metadata and signature were inspected with the installed Android SDK tools. The packaged debug APK's Capacitor configuration uses the exact HTTPS production origin and `cleartext: false`.

## Checks already passed

- `bun install --frozen-lockfile`
- `bun run typecheck`
- `bun test`: 80 passed, 0 failed, 418 assertions across 10 files
- `bun run build`
- `bun run security:scan`
- `bun run android:sync:prod`: passed against live health HTTP 200
- `bunx cap sync android`: 11 existing plugins
- `android/gradlew.bat -p android clean --no-daemon`
- `android/gradlew.bat -p android assembleDebug --no-daemon`
- Debug APK signature verification via `apksigner verify --verbose`

Release bundle build passed (503 tasks). `jarsigner -verify -verbose -certs` returned exit 0 and `jar verified`. The Java verifier cryptographically checked all 466 non-META-INF payload entries and matched the owner certificate. Bundletool 1.18.1 `validate` passed. Its dumped release manifest confirms the package, version and SDK values above. Fourteen packed APK/AAB text assets were scanned directly with zero findings; both packaged runtime configurations use the exact origin with cleartext disabled. Final `bun run security:scan`: 411 files, zero findings. A copied tampered bundle was rejected; the original was unchanged.

## Verification tools

`scripts/VerifyAndroidBundle.java` reads every non-META-INF bundle payload entry through Java's JAR signature verifier and requires its certificate to match the public certificate exported from the owner keystore. It checks certificate validity and essential AAB entries; it never reads a password or private key. Google's official standalone bundletool 1.18.1 is held in ignored local state for structural validation and manifest inspection.

Security scan now covers Java/Kotlin source, hardcoded signing passwords and tracked keystore/signing files. Kotlin-generated `.kotlin` cache is ignored. Keystores, build outputs and private local state remain untracked. No Play Console, RevenueCat or release publishing action was performed.
## Outputs and verdict

- Debug APK: `C:\pixel-perfect-copy-9579\android\app\build\outputs\apk\debug\app-debug.apk` (11,101,185 bytes)
- Signed release AAB: `C:\pixel-perfect-copy-9579\android\app\build\outputs\bundle\release\app-release.aab` (4,858,176 bytes)
- APK SHA-256: `E76633ED539ECAB884B05F90CECEE9F63D1257B7718704405588FB8405E06FF0`
- AAB SHA-256: `D7F57EF03F7AD218A4EB5189F8A8DC4DA62E7050DD5D7D1F77A766AAFBF518DA`
- Owner certificate SHA-256: `6a1459ec36a259f8d171c15af11e091610d115e01f43fa6218af96d1fa88ee45`

STAGE 4 COMPLETE. No remaining owner action is needed for signing/build. Real device testing, Play Console and RevenueCat work belong to later stages and were not performed.