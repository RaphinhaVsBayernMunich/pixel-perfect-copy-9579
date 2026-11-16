# RevenueCat sandbox results

Updated 2026-11-16. Configuration readiness was rerun: **10/10 PASS**; actual purchase lifecycle is **NOT EXECUTED**.

Verified canonical mapping: `questos_premium_monthly:monthly` -> `premium`; `default` -> `$rc_monthly` -> monthly product. Project `f6813f52`, Android `app.questos.android`. Existing V1 subscriber verification and historical annual receipt support are preserved. No products, prices or keys were changed.

RevenueCat Project Settings visibly retains **Allowed App User IDs only**, with **2 items**, and no unsaved changes. Screenshot: local `supabase/.temp/final-evidence/nov13-revenuecat-sandbox.png`. Backend migration is confirmed in the destination migration ledger. Both enrolled identities resolve to sandbox and expire on 2026-11-23 at 16:04:25 UTC. Live query found zero subscriptions for those identities.

Both accounts are now confirmed through normal email links. On November 16 both passed password authentication, server getUser identity verification, cross-account profile read isolation, and explicit SQLSTATE 42501 denial of account_billing_environment using its exact _user_id argument. Check sessions were signed out locally; other sessions were preserved. No actual store checkout has yet occurred.

| Lifecycle case | Result |
| --- | --- |
| Enrollment and live-history rejection | PASS, automated regressions |
| Client cannot select environment or grant premium | PASS, automated regressions and live permission checks |
| Mixed-environment transfer rejection | PASS, automated policy tests |
| Initial test purchase / premium activation | BLOCKED, not executed |
| Renewal / cancellation / expiry | BLOCKED, not executed |
| Test decline / restore / reinstall / account switch | BLOCKED, not executed |
| Refund or revocation | BLOCKED, not executed |
| Real store RTDN -> RevenueCat -> backend delivery | BLOCKED, no transaction evidence |

RTDN topic and publisher permissions pass configuration verification for `projects/questos-510417/topics/questos-revenuecat`. This is not proof of delivery. Do not forge production webhook events to fill missing lifecycle evidence. Follow `docs/release/QUESTOS-POST-APPROVAL-TEST-PLAN.md` after authentication/device prerequisites are resolved; its earlier backend-isolation blocker is superseded by the deployed account-scoped implementation.
