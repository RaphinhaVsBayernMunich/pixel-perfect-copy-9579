# QuestOS

QuestOS is operated by Oryxion. This repository and its reviewed migrations are the source of truth for the application.

## Architecture

- React 19, TypeScript, TanStack Start/Router and Zustand.
- TanStack server functions and HTTP routes deployed to the existing Cloudflare Worker.
- Supabase Auth and Postgres with RLS; server-only DeepSeek and billing verification.
- Capacitor Android with external-browser PKCE and RevenueCat / Google Play Billing.
- Canonical new subscription: `questos_premium_monthly:monthly`, entitlement `premium`, offering `default`, package `$rc_monthly`. Historical annual receipts remain supported.

Production runtime: https://questos.questos-1fd92776.workers.dev

## Development and validation

Use Bun 1.4.2 and the committed `bun.lock`. Do not create a competing npm lockfile.

```sh
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun run lint
bun test
bun run build
bun run security:scan
bun run android:sync:prod
bun run billing:verify
```

Copy `.env.example` into a private local environment file and populate only the values needed for the task. Never commit credentials. Production secrets belong in the existing Cloudflare secret store. The billing verification command requires authorized private provider access and does not make purchases.

For a debug Android build on Windows, use the installed Android Studio JDK and SDK:

```powershell
.\android\gradlew.bat -p android assembleDebug :app:testDebugUnitTest
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

Connected tests require an emulator/device. They are not evidence of a successful Play purchase. Release signing is a separate owner-authorized step; keep the keystore and passwords outside the repository.

## Deployment and history

See `docs/production-release.md` and the dated audit reports for verified results and unresolved gates. No deployment should be inferred from a passing local build.

This project originated in Lovable and remains Git-connected. Preserve published history: do not force-push, rebase, amend or squash pushed commits.
