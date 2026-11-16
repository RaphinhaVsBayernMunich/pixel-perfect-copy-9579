# Remaining release actions

Updated 2026-11-16. Verdict: **D. QUESTOS BLOCKED — SPECIFIC ACTION REQUIRED**.

| Blocker | Evidence | Responsible / minimum action |
| --- | --- | --- |
| Test account authentication | RESOLVED: both confirmed and both password logins/server identity checks pass | No further confirmation required. |
| Emulator cannot be controlled reliably | Capture still fails after repositioning; ADB shows System UI ANR; rebooted without wipe | Owner agreed to install Alpha manually from Play. Agent then verifies installer/version and continues test-card-only checks. |
| Leaked-password protection plan constraint | Dashboard access restored; current plan FREE; Email panel requires Pro or above | Owner decides whether to fund an upgrade. No paid upgrade performed. |
| No actual store lifecycle evidence | No enrolled subscription records or observed test checkout | Agent after prerequisites: execute test-card-only purchase, restore, renewal, cancel, expiry, decline, transfer isolation and supported refund tests; correlate RTDN/webhook/backend evidence. |
| Android recovery not demonstrated | Current Play app absent; no offline/retry observation | Agent after device access: execute offline cold start/reconnect and recovery checks; preserve account data. |
| Production release gates unfinished | Track inactive; create button available only | Agent: complete declarations/eligibility review and final validated submission preparation; owner approves final commercial release when all gates pass. |

Previously automatic approval review rejected using the GitHub session to authenticate Supabase because that separate account/session use was not explicitly authorized. Owner completed private sign-in on November 16; dashboard access is now resolved without that rejected flow.

Do not repeat already successful live AI tests unnecessarily, invent receipts, use real payment methods, alter production products/prices, rotate keys, replace the existing AAB, or claim sandbox lifecycle success from 10/10 configuration readiness.
