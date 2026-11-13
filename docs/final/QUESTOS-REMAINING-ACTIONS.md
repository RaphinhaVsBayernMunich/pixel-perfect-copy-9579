# Remaining release actions

Updated 2026-11-13. Verdict: **D. QUESTOS BLOCKED — SPECIFIC ACTION REQUIRED**.

| Blocker | Evidence | Responsible / minimum action |
| --- | --- | --- |
| Test accounts not confirmed in backend | Live query: 2 enrolled, 0 confirmed, both sandbox | Owner: report confirmation result privately; if links expired, request fresh confirmation. Agent: verify resulting confirmed state. Never bypass confirmation. |
| Emulator cannot be captured | Two capture attempts: outside captured monitor | Owner: move Pixel_8 fully onto main monitor. Agent: install/verify Alpha from Play and continue approved tests. |
| Supabase dashboard session unavailable | Dashboard redirects to sign-in; leaked-password advisor disabled | Owner: sign in privately. Agent: inspect plan support, enable if available within authorized scope, or report exact plan constraint. |
| No actual store lifecycle evidence | No enrolled subscription records or observed test checkout | Agent after prerequisites: execute test-card-only purchase, restore, renewal, cancel, expiry, decline, transfer isolation and supported refund tests; correlate RTDN/webhook/backend evidence. |
| Android recovery not demonstrated | Current Play app absent; no offline/retry observation | Agent after device access: execute offline cold start/reconnect and recovery checks; preserve account data. |
| Production release gates unfinished | Track inactive; create button available only | Agent: complete declarations/eligibility review and final validated submission preparation; owner approves final commercial release when all gates pass. |

Previously automatic approval review rejected using the GitHub session to authenticate Supabase because that separate account/session use was not explicitly authorized. Do not route around that rejection; owner private Supabase sign-in remains the requested path.

Do not repeat already successful live AI tests unnecessarily, invent receipts, use real payment methods, alter production products/prices, rotate keys, replace the existing AAB, or claim sandbox lifecycle success from 10/10 configuration readiness.
