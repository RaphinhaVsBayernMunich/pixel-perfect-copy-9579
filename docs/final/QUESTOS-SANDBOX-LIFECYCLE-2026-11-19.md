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

## November 21 continuation checkpoint

The owner authorized matching production to Alpha's countries. Live Alpha targeting was India only. Production India targeting was saved; Play confirmed the change was saved in Publishing overview for review and displayed Targeted (1), India Targeted. Alpha was not modified and no review submission occurred.

The owner signed into Sandbox B privately after its existing password was copied to the Windows clipboard with explicit authorization. The Android screen identified QuestOS Sandbox B and showed its own incomplete onboarding, rather than inheriting Sandbox A's completed onboarding. Optional basics were skipped, leaving onboarding at profession (step 3/12) when interrupted. This verifies identity switching but does not yet establish full cross-account data/receipt isolation.

### November 21 resumed device and submission checks

- Completed Sandbox B onboarding through the real Android UI, skipping optional personalization and AI generation. Home identified Sandbox B with zero quests. Its session survived the emulator restart. No account was recreated or credentials displayed.
- The Free upgrade UI loaded the Play price of INR 290.00/month. Restore purchases completed with “No verified paid subscription found yet. Confirm the store account or retry shortly.” A read-only server snapshot afterward returned A=free and B=free. Expired receipts did not grant paid access. This is an actual second-account restore check with expired receipts, not proof of active-receipt transfer or reinstall behavior.
- Evidence: `nov21-b-home.png`, `nov21-b-premium.png`, `nov21-b-restore-result.png` in the existing ignored evidence directory.
- Play Publishing overview shows the saved India country change, with submission disabled by **Incomplete app-level trader status declaration**. The account already declares trader status; the app inherits Yes. The existing public Terms URL was prepared but not saved, pending specific owner approval of the declaration. No production release or review submission occurred.
- Fresh `/api/health`, `/api/billing/health`, and `/legal/terms` requests returned HTTP 200. Security scan: 529 files, zero findings. No source or Android changes; earlier full-suite results remain historical results rather than newly rerun tests.

### November 21 active-receipt continuation

Play Publishing overview independently confirmed **Changes in review**, listing both the app-level trader declaration and production India availability. The owner submitted these configuration changes; this is not a production binary submission or Google approval. An older tab retained unsaved form edits, which were preserved while the saved state was inspected in a separate tab.

The owner explicitly approved Sandbox B's no-charge subscription at the visible Play checkout (`Test card, always approves`, `You will not be charged`). Purchase completed; QuestOS displayed Premium Active. RevenueCat's existing subscriber API reported B's monthly Premium active and A's earlier monthly entitlement expired. Supabase matched: B active/sandbox, A expired/free. At the checkpoint B's paid_until was `2026-11-21T17:03:35Z`. Normal logout returned to login; private Sandbox A sign-in was requested for the active-receipt transfer test. Transfer and reinstall are not yet passed.

Evidence: `nov21-b-checkout.png`, `nov21-b-purchase-result.png`, `nov21-b-active.png`, `nov21-switch.png`. The existing AAB hash remains `9EBA48787FAD2C033ACB0762DAA4A54F7D0398C9BD6DEA526234BEA94D659CE9`; no rebuild or real payment occurred.
