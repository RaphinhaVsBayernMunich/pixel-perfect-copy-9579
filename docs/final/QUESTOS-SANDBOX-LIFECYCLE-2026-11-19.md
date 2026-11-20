# Sandbox lifecycle verification — November 19, 2026

This report supersedes earlier unexecuted-purchase and inaccessible-emulator checkpoints. No commercial settings, production customer data, signing keys or AAB were changed.

## Verified evidence

- Pixel_8 `emulator-5556`: `app.questos.android`, version code 3, version name 1.0.0, installer `com.android.vending`.
- Screenshot-guided ADB control was explicitly authorized. Sandbox A's existing session survived startup; no accounts were recreated.
- Google Play checkout explicitly displayed **Test card, always approves**, **You will not be charged**, and the accelerated five-minute subscription period. No real payment method was approved.
- The authorized purchase completed around 11:04 UTC. Android displayed **Premium Active**. Supabase independently returned A=`premium`, B=`free`, with an active sandbox subscription paid through 11:09:17 UTC.
- RevenueCat showed the canonical `questos_premium_monthly:monthly` subscription active from the default offering. Initial event `4E6076A3-0B9D-4DF8-A7FE-E5BF5859371D` matched the sandbox ledger; dashboard delivery was **Delivered**, attempt 1, **Response 200**.
- Same-account Restore Purchases returned **Your paid subscription is restored** while Premium remained active. This does not claim reinstall or cross-account restore coverage.
- Offline cold start displayed **Let's reconnect** and stated saved data was not cleared. Wi-Fi/mobile data were restored, Retry returned to Sandbox A's Home, and the app reported Premium. Connectivity was left enabled.
- Production `/api/health` and `/api/billing/health` both returned HTTP 200.
- Play Console still reports production **Inactive**, with 0/5 release tasks complete. Create a new release is available; preview, review submission and publish remain locked until creation. No production submission occurred. This is not a complete eligibility attestation.

## Evidence files

Local ignored folder: `supabase/.temp/final-evidence/`.

- `nov19-start.png`, `nov19-premium.png`
- `nov19-checkout.png`, `nov19-purchase-result.png`, `nov19-active.png`
- `nov19-restore.png`, `nov19-offline.png`, `nov19-recovered.png`

## Remaining checks at this checkpoint

Test decline, reinstall, cross-account store restoration/transfer and final production eligibility are not claimed as passed. Existing November 18 full-suite results remain applicable because only audit documents changed.

## Completed renewal, cancellation and expiry (verified November 20)

| Scenario | Actual evidence | Result |
| --- | --- | --- |
| Renewal | Play advanced the next payment to 16:44 IST; backend extended paid_until from 11:09:17 to 11:14:17 UTC on November 19 | PASS |
| Voluntary cancellation | ADB-controlled Test: QuestOS cancellation completed; Play showed Canceled; RevenueCat cancel_reason was UNSUBSCRIBE | PASS |
| Access through paid period | After cancellation, backend A=premium, B=free; active sandbox row retained paid_until and cancel_at_period_end=true | PASS |
| Expiration | Backend row expired, paid_until 11:14:17 UTC; A and B both free on November 20 | PASS |
| Provider delivery | Initial purchase, renewal, cancellation and expiration each showed Response 200 on attempt 1 in RevenueCat; event IDs matched the sandbox ledger | PASS |

Provider event IDs:

- Renewal: `DA9B3F93-0C92-4B9A-A495-978E8B27D2FB`, received 11:09:56 UTC.
- Voluntary cancellation: `8654CDDB-AFD8-44D2-88E0-99C11C5E1BDE`, received 11:12:36 UTC.
- Expiration: `15A367CA-6A70-433F-B8BE-E82026A68279`, received 11:14:53 UTC.

At 11:09:23 UTC, before the renewal event arrived, the server correctly returned free because the prior paid_until had elapsed. It returned premium after the verified extension. This documents the observed approximately 39-second provider delivery delay rather than claiming uninterrupted entitlement at that boundary.

The ledger has two entries per event because reconciliation updates the current monthly subscription and revokes the earlier refunded receipt. These are separate suffixes, not proof of duplicate webhook delivery. Duplicate/out-of-order handling retains automated-test coverage; live replay has not been claimed.

Additional screenshots: `nov19-play-manage.png`, `nov19-cancelled.png`, `nov19-renewal-state.png`. No new AAB, production submission or real payment occurred.

## November 20 continuation

The existing Pixel_8 AVD was reopened without wiping. Cold start again restored Sandbox A and the free Home state after expiry (`nov20-start.png`). Settings Sign out returned to the login screen (`nov20-logout.png`), with no account deletion. Private Sandbox B sign-in is requested for the remaining device account-switch test.

Live Play Console retains the serving Alpha release, production Inactive, and no unpublished changes. The organization account exposes Create new release without a displayed tester-count/14-day application gate. Production Countries / regions has no selected countries; the owner was asked to choose initial availability. Final declaration/account/payment validation and release validation are still required before claiming eligibility or submission.

Documentation-only verification: security scan passed, 529 files with no findings; git diff --check passed. The prior source verification (123 tests / 652 assertions, typecheck, build, lint, production sync and 10/10 billing configuration) is preserved, not represented as newly executed. No source changes were needed for this lifecycle run.
