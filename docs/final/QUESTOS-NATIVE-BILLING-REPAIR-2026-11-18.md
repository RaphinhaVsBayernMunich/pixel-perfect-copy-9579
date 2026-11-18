# Native billing verification — November 18, 2026

## Confirmed defect and repair

The native provider's async SDK loader returned the Capacitor Purchases proxy directly. Capacitor synthesizes a method for unknown properties, including `then`; Promise resolution assimilated that proxy instead of returning it. Initialization never completed. The loader now returns the module namespace and callers access `module.Purchases` synchronously. The regression test loads the actual installed RevenueCat module, rather than only a plain-object mock.

Pricing waits now have a bounded read-only deadline. The native identity mutation queue remains serialized and is never cancelled or bypassed by a timeout. A failed initialization can be retried, late pricing responses cannot replace a newer result, and only fixed safe error messages reach the UI. A free SDK entitlement update refreshes server authority without presenting a pending-purchase error. Paid SDK signals still require backend reconciliation.

No billing identifiers, prices, private keys, receipt compatibility, Android native source, version code, or signed AAB were changed.

## Evidence

- Installed Play Alpha remains `app.questos.android`, version code 3 / 1.0.0. November 17 package, Play-installer and offline/reconnect evidence is preserved.
- November 18 cold starts restore Sandbox A and Home; the owner already completed onboarding.
- Both approved accounts remain actively enrolled in the sandbox environment. Before checkout, both server snapshots were free.
- After the loader repair deployed as Worker version `1b7336c8-f5a0-4be7-aa04-20485ea7b7ff`, Alpha displayed the verified localized price **₹290.00/month**.
- Actual Google Play checkout showed **Test card, always approves**, explicitly stated **You will not be charged**, and used five-minute test renewal periods.
- The owner approved the exact no-charge subscription at action time. Play subsequently displayed **Payment successful**.
- Play then required a purchase-verification security preference. The owner was asked to choose privately; automation did not weaken or select payment verification settings.
- At this checkpoint RevenueCat still returned no subscriptions/entitlements for A and Supabase still reported A/B free. Do not equate Play's success message with an end-to-end entitlement pass.

Ignored local evidence: `supabase/.temp/final-evidence/nov18-play-checkout.png`, `nov18-tests.log`, `nov18-build.log`, `nov18-billing.log`, `nov18-sdk-loader-deploy.log`. Private diagnostics and the copied installed APK stay outside Git.

## Gates

| Check | Result |
| --- | --- |
| Actual SDK loader regression and unit suite | PASS: 123 tests, 652 assertions, 22 files after final edits |
| TypeScript, changed-file ESLint, production build | PASS |
| Full lint | PASS: zero errors, eight existing Fast Refresh warnings |
| Secret scan | PASS: 528 files, zero findings |
| Billing configuration and approved rollback-only RLS verification | PASS: 10/10 |
| Android production sync | PASS; no AAB rebuild required for these web changes |
| Verified native localized pricing | PASS on Play-installed Alpha |
| No-charge Play checkout | Play reports success; receipt/entitlement processing still pending |
| Renewal, cancellation, expiration, restore, real lifecycle webhook/RTDN | NOT YET VERIFIED |
| Production submission | NOT PERFORMED; mandatory lifecycle gates remain incomplete |

Continue after the owner completes Play's security preference: confirm RevenueCat sandbox receipt and Supabase Premium for A while B stays free; exercise restore, accelerated renewal, cancellation and expiry; correlate provider events and idempotent backend delivery. Do not make real payments or change commercial settings.

Final web deployment: `36aca20d-5364-4b4a-84a7-4d24c48721b1`. App health and billing health both HTTP 200; final Android production sync passed. The emulator checkout was not restarted during deployment.
