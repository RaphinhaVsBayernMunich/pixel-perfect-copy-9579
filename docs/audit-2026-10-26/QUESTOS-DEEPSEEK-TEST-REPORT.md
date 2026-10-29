# DeepSeek verification

## Verified working

Seven live production feature requests succeeded using the disposable audit account:

1. Morning brief.
2. Goal-to-quests.
3. Reflection prompt.
4. Starter quests.
5. Future Me.
6. Goal Simulator.
7. Executive Assistant proposal.

Continuation queried existing `ai_requests` records: **seven successful requests with positive input and output token counts**. No new AI generations were run for this recheck. Executive Assistant proposal generation did not mutate the quest calendar.

Evidence: ignored `supabase/.temp/audit-2026-10-26/api-results.json` and `tokens-results.json`.

## Automated coverage and architecture

Provider calls remain server-side through the existing DeepSeek implementation. Input/output validation, invalid input, safe failure envelopes, premium feature contracts and quotas are covered by the 112-test suite. Added cases cover Future Me, Goal Simulator and Executive Assistant malformed inputs/outputs.

Limits reviewed: 10/40/500 daily tier quotas, two concurrent requests per user, 16 global and 10,000 global daily; atomic reservation, failed attempts remain charged. Provider timeout is 30 seconds per attempt with at most one retry, not a guaranteed 30-second total request deadline. Reservation lease is 90 seconds.

## Not tested

No production load test, deliberate live quota exhaustion or extended provider outage was induced. Test fixtures were admin-confirmed and are not evidence of SMTP delivery. Owner-confirmed SMTP delivery from an earlier task was not repeated here.
