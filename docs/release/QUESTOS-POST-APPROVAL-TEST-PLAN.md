# QuestOS Play sandbox acceptance procedure

Updated 2026-11-07. Alpha is now available; approval prerequisite has passed. **Execution remains BLOCKED on isolated backend routing and observable licensed Play installation.** No purchase was executed in this audit.

## Preconditions and stop conditions

Resolve the isolation decision in QUESTOS-REVENUECAT-READINESS.md first. Verify sandbox receipts cannot reach production entitlements and live receipts cannot enter sandbox storage. Preserve the production monthly catalog and annual compatibility. Use dedicated test accounts A and B and private evidence storage. Do not send credentials, tokens, customer payloads or personal information to Git.

Opt in at https://play.google.com/apps/testing/app.questos.android using the designated license tester. Install from https://play.google.com/store/apps/details?id=app.questos.android with that same Play account. Record installer=com.android.vending, package and actual versionCode (expected 3 for current Alpha). A debug sideload is not equivalent. Check the installed build targets the approved isolated-test routing before checkout.

At every purchase screen require a Google test payment instrument (for example the displayed test card that always approves/declines). If only a real card or a real charge is offered, stop. Do not add a real payment method. Use the durations shown by Play/RevenueCat for the current sandbox configuration, not guessed fixed renewal intervals. Capture timestamps and event IDs privately.

| Step | Expected evidence / pass criterion | Current status |
| --- | --- | --- |
| 1. Free baseline | Test account A snapshot free, no paid receipt; daily AI limit 10. | BLOCKED |
| 2. App trial | Activate only through existing server-controlled trial flow; snapshot trial, valid deadline, limit 40. No manual DB grant. Trial can purchase immediately. No Google stacked free-trial offer. | BLOCKED |
| 3. Initial monthly test purchase | Verify canonical product/base plan, displayed Play price and test payment marker; approve test card. Record test order and sandbox flag. | BLOCKED |
| 4. Premium activation | RevenueCat premium active for exact authenticated UUID; sandbox backend subscription/snapshot active; app paid state; quota limit 500. | BLOCKED |
| 5. Delivery chain | Match store lifecycle timestamp to RTDN topic delivery, RevenueCat customer event, authenticated webhook HTTP 200, one backend event and correct receipt owner. Topic configuration alone is not delivery proof. | BLOCKED |
| 6. Renewal | Observe actual accelerated test renewal and increased paidUntil; no duplicate grants/quota reset from replay. | BLOCKED |
| 7. Cancellation | Cancel only the sandbox subscription in Play; cancelAtPeriodEnd true while paidUntil remains future; premium retained. | BLOCKED |
| 8. Expiration | Wait for actual test expiry; backend reconciles expired, premium gates close, quota returns to free 10. | BLOCKED |
| 9. Failed test payment | Select only test-decline instrument; safe error, no new paid grant. Existing legitimate access remains intact. | BLOCKED |
| 10. Restore | Active test receipt restores to rightful account; expired/refunded receipt cannot regain premium. Verify server evidence, not just SDK response. | BLOCKED |
| 11. Reinstall | On disposable test install only, uninstall/reinstall from Play, sign in as A; restore with same Play account; no data loss or incorrect receipt reassignment. | BLOCKED |
| 12. Account switch | Logout A, login B; no A data or premium appears. In-flight purchase/restore results cannot attach to B. Return to A and verify rightful access. | BLOCKED |
| 13. Refund/revocation | Use only store-supported sandbox order controls, confirm revoked server state and no resurrection from stale restore/event. Never refund a real order. | BLOCKED |
| 14. Quota transition | Read server quota before/after each verified tier; request at most a minimal authorized AI action if necessary, avoid repeating prior live AI audit. Count once; never client-edit premium/quota. | BLOCKED |
| 15. Recovery | Repeat offline/reconnect/session/navigation checks in Android recovery report. | BLOCKED |

For each executed case record PASS/FAIL, device/build/installer, test account pseudonym, UTC times, receipt/event references (private), RevenueCat sandbox state, webhook result, isolated Supabase snapshot and quota. Compare duplicate/out-of-order logic with the PGlite regressions; do not forge provider events into production to fill missing evidence.

Completion requires actual lifecycle observations, not merely 10/10 configuration verification. Stop on identity mismatch, production destination, missing test-payment marker, duplicate entitlement application or real-charge warning. Preserve failures and escalate without changing prices, product IDs or production security filters.
