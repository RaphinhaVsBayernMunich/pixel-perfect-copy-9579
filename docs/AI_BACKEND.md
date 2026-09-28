# QuestOS AI backend

The existing four TanStack POST server functions now call the official DeepSeek
`https://api.deepseek.com/chat/completions` endpoint with model `deepseek-flash`
(DeepSeek V4.1 Flash). No Edge Functions or new application framework are required.
The browser calls QuestOS, with its existing Supabase bearer-token middleware.
The feature names and successful return objects are unchanged: morningBrief,
goalToQuests, reflectionPrompt, generateStarterQuests. Invalid generated quests now
produce an explicit error instead of an empty success or a fabricated onboarding result.

## Deployment order

1. Apply all outstanding Supabase migrations, including the checkpointed Phase 1
   `20260921090000_profile_authority.sql`, then
   `20260922090000_ai_reservations.sql`. Use your normal Supabase migration pipeline
   (`supabase db push` against the correct linked project), or run the new SQL in
   that project's SQL editor if your existing deployment manages migrations there.
   Confirm migration history before applying; do not blindly rerun historical SQL.
2. Configure **DEEPSEEK_API_KEY** in the **server runtime secret manager** for the
   hosting environment that serves TanStack functions. This is the only DeepSeek
   credential variable. Do not use a VITE_ variable, put a real key in the repository,
   or add it to Supabase records, browser configuration or Capacitor assets.
3. Keep the existing server SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
   SUPABASE_PUBLISHABLE_KEY configured. Keep existing browser Supabase public
   configuration. Retain LOVABLE_API_KEY if using the existing Stripe connector.
   No DeepSeek configuration belongs in the browser or Supabase Edge Function secrets.
4. Deploy the application build. Coordinate migration and deployment: the migration
   disables the old increment_ai_usage entry point, so an older AI deployment fails
   closed until the new backend is running. Rolling back requires a deliberate
   backend/database plan; do not restore the old bypass to recover availability.
5. Ensure the DeepSeek API account has balance and access to deepseek-flash. Signed
   in as a test user, try all four AI features. Confirm ai_usage increments once per
   accepted request and ai_requests records success and token counts. Verify an
   expired trial/premium account uses the free limit. Check error handling with a
   missing key in staging, and then restore the server secret.
6. Set the hosting ingress/body limit to 128 KB or lower for these RPCs, and a
   request duration allowance of at least 90 seconds. App validation bounds parsed
   input, but hosting limits are needed to reject giant bodies before deserialization.
   Set budget alerts in DeepSeek and monitor failed/reserved ai_requests. Establish
   a metadata retention policy appropriate for your deployment; no destructive
   retention job is installed by this change.

No real credential was created or used for local verification. A live provider
smoke test and remote migration application remain deployment steps.

## Authority, quotas and concurrency

Supabase Auth getUser validates the bearer token on the server. The client cannot
supply a user ID, entitlement, limit, provider, model or token budget. The RPC is
executable only by service_role; anonymous/authenticated clients cannot write quota
or request metadata. Existing profile column permissions protect billing authority.

The reservation transaction reads and locks the profile, locks the user's UTC-day
ai_usage row, checks limits and increments usage before any provider call. A shared
PostgreSQL advisory transaction lock protects global reservations across app workers.
Existing ai_usage counts are preserved. Quotas from APP_CONFIG.aiQuota are:

| Tier | Daily accepted requests (UTC) |
| --- | ---: |
| Free / expired trial / expired premium | 10 |
| Active trial | 40 |
| Active premium | 500 fair-use ceiling |

Premium requires premium entitlement and premium status plus a future expiration,
or null expiration for existing lifetime/no-expiry records. Trial status is checked
separately and requires a future trial_end. Missing profiles, DB errors, invalid
quota configuration or malformed reservation replies never permit provider calls.

The database caps active requests at 2 per user and 16 globally, plus a global
10,000 accepted requests per UTC day circuit breaker. These operational caps are
in the additive migration; change them via a new reviewed migration. Reservations
expire after 90 seconds if a worker dies, releasing concurrency, never refunding
quota. Rejected reservations do not increment. Accepted requests stay charged on
provider/validation failures; retries cannot be farmed for unmetered generation.
Each reservation permits at most two bounded provider attempts. A reservation
whose result is lost on the network may still be charged; SQL is not retried.

## Provider and data bounds

All four outputs use JSON mode plus explicit JSON/schema instructions and Zod
validation. Unknown/invalid quest fields, empty or malformed responses and non-stop
finish reasons (including truncation) fail explicitly. No tools or conversation
history are sent. Thinking is disabled to bound reasoning costs.

| Feature | Maximum output tokens |
| --- | ---: |
| Morning brief | 512 |
| Reflection prompt | 256 |
| Goal to quests | 3072 |
| Starter quests | 4096 |

Input is limited to 32,000 UTF-8 bytes after validation, with 8,000 characters for
a goal, 4,000 per onboarding goal, 100 quests/completions and 30 interests/skills.
Provider response bodies are limited to 256,000 bytes. Quest arrays and individual
fields/durations also have explicit limits.

Each provider attempt has a 30-second timeout covering headers and body. Only
429, 500, 502, 503, 504 can retry, once, with 500–2000 ms backoff; longer Retry-After
instructions abort the retry. Network failures, timeouts, auth/balance/bad-request
errors and malformed output do not retry. Redirects are rejected to prevent
credential forwarding. Auth has a 10-second wait bound and each quota RPC has a
10-second timeout. Finalization failure returns a safe error; quota stays charged.

AI responses carry only success data or a stable error code. Client wrappers create
local user-facing errors; raw provider/SQL/auth exceptions and server stacks are
never intentionally serialized. Error codes cover invalid input, sign-in, quota,
provider auth/balance/request errors, busy/overload, unavailability, timeout,
network and invalid output. Provider error bodies are never read or logged.

ai_requests stores user, UTC date, timestamps, feature, provider/model, status,
safe error code and input/output token counts when available. It does not store
prompts, generated text, API keys or raw exceptions. Interrupted workers may leave
expired reserved rows without token counts. This is operational usage metadata,
not an authoritative provider invoice (failed/retried attempts may have costs).

## Verification

Run `bun test tests/ai-provider.test.ts tests/ai-quota.test.ts`, `bunx tsc --noEmit`,
`bun run build` and focused ESLint on changed TypeScript files. PostgreSQL tests
apply all repository migrations using PGlite with a minimal Supabase auth scaffold;
this verifies SQL and permissions locally, not remote deployment or distributed
production load. Provider tests use fake HTTP responses, never a paid API call.

Scan `.output/public` after building for DEEPSEEK_API_KEY, api.deepseek.com, and
credential patterns. Server bundles necessarily contain the environment variable
name and provider endpoint; client bundles must contain neither. Ordinary .env
files remain ignored; `.env.example` contains empty placeholders only.
Run the repeatable scan with `bun scripts/verify-ai-client.ts`. Local verification
also built with a synthetic server secret and confirmed it was absent from all 31
generated public files. No existing package versions changed when Bun added the
PGlite test dependency; Bun normalized the lockfile and removed stale entries.

Local verification completed: 28 tests passed, `bunx tsc --noEmit` passed,
`bun run build` passed, and focused ESLint passed on every changed TypeScript file.
The build still reports pre-existing non-AI inputValidator deprecations,
vite-tsconfig-paths guidance and a large-client-chunk warning. No broad cleanup
was attempted.

## Changed files

- `src/lib/ai-gateway.server.ts`: official provider adapter and bounded HTTP handling.
- `src/lib/ai.functions.ts`: existing frontend APIs with safe server result envelopes.
- `src/lib/ai-contracts.ts`: bounded input/output schemas and stable app errors.
- `src/lib/ai-service.server.ts`: authentication, feature prompts, quota and telemetry orchestration.
- `src/lib/subscription/ai-quota.functions.ts`: service-only reservation/finalization calls.
- `src/lib/config/admin-config.ts`: correct AI quota documentation; existing numeric limits retained.
- `src/integrations/supabase/types.ts`: types for the two new RPCs.
- `supabase/migrations/20260922090000_ai_reservations.sql`: atomic quota and metadata migration.
- `src/routes/legal.privacy.tsx`: factual AI processor/usage logging disclosure.
- `.env.example` and `docs/AI_BACKEND.md`: safe placeholders and deployment instructions.
- `tests/ai-provider.test.ts` and `tests/ai-quota.test.ts`: security and failure regression tests.
- `scripts/verify-ai-client.ts`: repeatable client bundle secret/endpoint check.
- `package.json` and `bun.lock`: PGlite test dependency and authoritative lockfile update.

The Lovable AI gateway and run-ID tracking were replaced. Existing AI SDK packages
remain installed to avoid unrelated dependency cleanup. Lovable Vite configuration,
auth integration and the Stripe connector were retained.

Official protocol references: [chat completions](https://api-docs.deepseek.com/api/create-chat-completion/),
[JSON mode](https://api-docs.deepseek.com/guides/json_mode/),
[error codes](https://api-docs.deepseek.com/quick_start/error_codes/).

