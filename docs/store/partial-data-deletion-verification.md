# QuestOS selected-data deletion audit — 12 October 2026

QuestOS is operated by Oryxion. Partial data deletion is genuinely supported; prepared Play
answer **YES**. This is not a claim that every data category has a self-service erasure control.

## Exact form values

- Delete account URL: https://questos.questos-1fd92776.workers.dev/legal/delete-account
- Delete some/all data without deleting the account: **YES**
- Delete data URL: https://questos.questos-1fd92776.workers.dev/legal/delete-data

## Existing implementation evidence

| Category             | Verified flow and persistence                                                                                                                                                                                                                                         | Limits                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Saved health summary | Settings → Clear saved health summary → confirm; `clearHealthSummary` in `src/lib/data.functions.ts` requires authenticated ownership and deletes only that user's `premium_documents` health row, checking errors.                                                   | No Premium requirement. Original Health Connect records stay on device; reimport can save another summary.                                |
| Journal entry        | Legacy → Memory Vault → Delete memory; `removeEvent` in `src/lib/quests-store.ts` queues UUID deletion; cloud sync acknowledges only after successful atomic `write_account_save`. Migration `20261001090000_atomic_account_sync.sql` deletes owned legacy event IDs. | Individual journal entries, not all milestones/achievements. Offline/error/conflict deletion remains pending.                             |
| Quest                | Quest's three-dot menu → Delete; `remove` queues UUID deletion; same atomic sync removes owned quests.                                                                                                                                                                | Completion history/XP remain. No promise of deleting device calendar copies.                                                              |
| AI Memory facts      | Premium workspace → AI Memory → Clear memory; `savePremiumData` authenticates, requires Premium, checks server write errors and replaces facts with `[]` and enabled with `false`.                                                                                    | Active Premium/trial for self-service. Empty settings row remains. Disabling alone retains facts. Prior provider inputs are not recalled. |

Profile/onboarding replacement is not a general erasure control. Saved calendar previews and
assistant proposals have no explicit general delete control in the audited UI. They are not advertised
as supported self-service categories. No new privileged/public deletion endpoint is introduced.

## Public support route and security

The dedicated page is accessible without authentication, installation or payment. A mailto link
to the existing founder@oryxion.net contact prepopulates only generic request instructions.
It specifies selected categories/records, keeping the account, ownership verification and scope
confirmation. Sending is manual; no instant automated deletion or turnaround deadline is promised.
Oryxion must monitor this inbox and handle verified requests, including expired-Premium Memory
requests, using existing trusted operations. Passwords, payment details and keys must never be sent.
No internal administrative interface, credentials or service-role access is exposed.

Retained records and limits are explicit: other account data/billing remains; provider backups/logs,
payment records, fraud hashes and duplicate-event identifiers may remain. Local recovery/export/offline
copies need separate handling; old device copies/conflict resolution can reintroduce information.
Support for provider-held information is a request, not an automatic DeepSeek erase capability.

The original account deletion page is unchanged. Privacy links to the distinct selected-data page.
The shared root route's public-page allowlist includes the new route; generated route metadata registers
it. All changes use the existing remotely hosted Capacitor architecture: **NO AAB REBUILD REQUIRED**.

Google's field requirements: [official deletion guidance](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## Verification

No live user records were deleted for verification. Existing integration tests exercise atomic failure rollback, ownership isolation,
unauthenticated rejection, stale revision protection and server-authoritative billing.

### Completed results

- `bun run typecheck`: passed.
- `bun test`: 98 passed, 0 failed; 492 assertions across 16 files.
- `bun run build`: passed. Existing TanStack deprecation and bundler warnings remain nonblocking.
- Changed-file ESLint: passed for `src/routes/__root.tsx`, `legal.privacy.tsx`, `legal.delete-data.tsx`.
- `bun run security:scan`: 470 files, zero findings.
- Worker deployment: `2199487c-f57d-494b-961f-f1e386e10072`.
- Unauthenticated GET account deletion and selected-data deletion: both HTTP 200, Oryxion notice present.
- Privacy and terms: HTTP 200; privacy links to selected-data deletion.
- New page contains audited steps and the existing support mailto; internal legal links resolve HTTP 200.
- Public page check found no private-key patterns; source/generated assets also passed the security scan.
- App health: HTTP 200. Account deletion source unchanged; no migrations, secret changes or AAB rebuild.

No email was sent, purchase performed or Play form submitted. The support mailbox's operational
handling remains Oryxion's responsibility; this pass verifies the public request path, not inbox delivery.
