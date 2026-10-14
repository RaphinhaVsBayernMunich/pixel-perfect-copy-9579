# Android Google sign-in — 14 October 2026

## Change

The shared AuthPage already implemented a Google button and handler for both sign-in and sign-up, but native visibility required VITE_NATIVE_GOOGLE_AUTH_ENABLED=true. The example configuration explicitly set it false. Native visibility is now unconditional; the web flag retains its previous meaning. Google remains optional alongside email/password.

## Existing flow preserved

- Native Supabase client uses PKCE, persistent local storage, automatic token refresh and detectSessionInUrl=false.
- Google OAuth uses skipBrowserRedirect=true and Capacitor Browser.open, which opens the external browser/custom tab instead of an embedded WebView OAuth flow.
- Supabase Google provider remains enabled. No client IDs, credentials or provider configuration changed.
- Redirect is app.questos.android://auth/callback, already present in Supabase allowed redirects and Android manifest.
- NativeLifecycle handles appUrlOpen and getLaunchUrl for warm/cold launches. Callback validation requires the exact scheme/host/path, a code, no fragment, and a sign-in initiated within ten minutes. exchangeCodeForSession uses the stored PKCE verifier.
- AuthGate listens for the resulting session, changes account scope, clears previous sync/query/UI state and initializes the current account. Existing sign-out and RevenueCat reset/logOut remain unchanged.
- No Lovable authentication path is introduced; the configured provider is Google through the owner's Supabase project.

## Release impact

Only the remotely served React UI changes. The existing Android shell already includes Browser/App plugins, the callback intent filter, and the production server URL. No new AAB or versionCode change is required. No Android source, billing, subscription or Play configuration is changed.

## Validation

- bun run typecheck: passed.
- bun test: 100 passed, 0 failed, 513 assertions; includes strict native callback validation, account isolation and RevenueCat identity cleanup tests.
- bun run build: passed as part of bun run deploy; existing TanStack deprecation and bundler warnings remain nonblocking.
- bun x eslint src/components/auth-page.tsx: passed.
- bun run android:sync:prod: passed; no tracked Android changes.
- bun run security:scan: 477 files, no findings.
- Deployment: 77d018bd-ab92-47d9-877f-f280a7d46d46.
- Production /api/health and Supabase /auth/v1/health: HTTP 200 using the app's Bun HTTP runtime. A separate Python probe was rejected with HTTP 403; production sync and Bun health probes passed.
- Native OAuth authorization probe: HTTP 302 to accounts.google.com with the correct Supabase callback. No account was authenticated by this probe and no OAuth code/state was displayed.
- Existing AAB SHA256 remains 9D6228D51D39818F9BE06569B639AF219DE801B7AA3C19CDF73CE51FC7314033.

No Android device/emulator is attached to ADB, so an actual internal-test Google login, logout, account switch and warm/cold callback cannot be claimed tested from this workstation. The web visibility flag remains unchanged; web-only browser testing does not prove the native Google UI. Email/password implementation is unchanged; live device regression remains required.

Owner device acceptance: reopen the internal-test app; verify Continue with Google on sign-in and sign-up; sign in using the external Google page and return to the app; relaunch and confirm the session persists; sign out; sign in as a different account and verify no previous account data appears; test email/password and cancel/retry Google; repeat after backgrounding the app. Do not share passwords, OAuth codes or tokens.
