# QuestOS: DeepSeek backend rollout (findings + safe sequence)

## Findings (verified read-only)

1. **Database is Lovable Cloud-managed.** The project's only backend is the Lovable Cloud instance, and it serves both the preview and the published app. Its migration history table is readable and matches the repo's earlier migrations.
2. **Migration status: both are pending.**
   - `20260921090000_profile_authority`: not in migration history. `register_signup_trial` doesn't exist, and `profiles` still has the old "Users manage own profile" policy.
   - `20260922090000_ai_reservations`: not in migration history. The `ai_requests` table and the `reserve_ai_request` / `finish_ai_request` functions don't exist.
   - The live data is tiny: 1 auth user and 1 profile. Neither migration drops a table or deletes rows. Migration 1 only inserts missing profiles (`ON CONFLICT DO NOTHING`).
3. **Supported deploy path.** Lovable does not apply SQL files that arrive through a GitHub sync. The supported path is for the agent (in build mode) to submit each file's SQL through Lovable's migration tool. You approve it in chat, and it runs against the Cloud database and is recorded in history. Neither file is idempotent (plain `CREATE POLICY` / `CREATE FUNCTION` / `CREATE TABLE`), so each must run **exactly once, in order**. Never re-run one.
4. **Where server functions run.** TanStack server functions run on Lovable's hosting edge runtime, in the preview and in the published site. `process.env.DEEPSEEK_API_KEY` there comes from the project's Cloud secrets. Right now that secret does **not** exist (only LOVABLE_API_KEY, Stripe, and Supabase secrets are set). It gets added through Lovable's secure secret form. You paste it there, not in chat, and it never reaches the browser.
5. **Publishing.** Clicking Publish → Update deploys both the frontend and the server functions together. Database migrations and secrets are *not* tied to Publish: they take effect as soon as they're applied or saved, for preview and production alike.
6. **Coordination risk.** The repo's code already calls the new reservation functions. Current state:
   - The preview is already running the new code, so AI in the preview fails until migration 2 exists. This fails closed: no provider call is made.
   - The published site isn't live yet, so no production users are affected.
   - Migration 2 revokes `increment_ai_usage`, which would break an older published build. That doesn't apply because nothing is published.
   - Migration 1 removes clients' UPDATE rights on billing columns (`subscription_status`, `entitlement`, `trial_*`, `premium_expiration`, `stripe_customer_id`, etc.). Any browser code still writing those columns would start failing.

## Safe sequence (after you approve)

1. **Pre-flight check (read-only):** search the client code for direct writes to billing columns on `profiles`, and confirm the signup and trial path calls the new `register_signup_trial` server-side. Report anything that would break before applying anything.
2. **Apply migration 1** (profile_authority) through the migration tool, with its SQL copied verbatim from the repo file. You approve the card. Then verify the policies, grants, and `register_signup_trial` with a read-only query.
3. **Apply migration 2** (ai_reservations) the same way. Verify `ai_requests`, the two RPCs, and that `increment_ai_usage` is no longer executable.
4. **Add the secret:** I open the secure secret form for `DEEPSEEK_API_KEY` and you paste the key there. Your DeepSeek account needs balance and access to `deepseek-flash`.
5. **Test in the preview while signed in** (details below).
6. **Publish → Update** so production gets the same frontend and server code. Migrations and the secret already apply to it.
7. **Afterwards:** set budget alerts in the DeepSeek dashboard, and watch for failed or stuck `ai_requests` rows.

## Testing the four AI features

- **Morning brief:** on Home, open the AI coach and generate a brief.
- **Goal to quests:** in the AI coach, enter a goal and confirm 4–7 quests appear and can be added.
- **Reflection prompt:** on Legacy, open the journal and request a prompt.
- **Starter quests:** run onboarding as a fresh test account and check the main quest, the starter quests and the welcome message.

After each run, check with a read-only query that `ai_usage.request_count` went up by 1 and that the `ai_requests` row shows `succeeded` with token counts. For the negative checks:
- The free-tier limit applies: set a test profile's trial to expired via migration or a server tool, since clients can't write that column anymore.
- Signed-out calls return the "sign in" error.

## Technical notes

- The earlier migration versions in history differ by a few seconds from the repo filenames. That's normal Lovable recording and doesn't mean they're missing.
- The steps in docs/AI_BACKEND.md that mention `supabase db push` or an SQL editor don't apply to Lovable Cloud. Use the migration tool instead.
- Hosting body and duration limits from the doc can't be configured in Lovable. The app-level 128 KB and input checks still apply.
