# QuestOS Stage 3B — 2026-10-03

## Root cause and fix

The Cloudflare workerd runtime does not implement `RequestInit.redirect = "error"`. It throws during request construction before sending the DeepSeek HTTP request. The previous safe error boundary reported that as `network`; the temporary allowlisted diagnostic isolated the redirect option. Switching the production model probe to `manual` made direct authentication/model discovery succeed immediately.

Both the read-only probe and completion adapter now use `manual`. Non-2xx responses, including redirects, remain rejected. Credentials are never forwarded to a redirect target; redirects are not retried. The transport remains direct official DeepSeek (`https://api.deepseek.com/chat/completions`, `deepseek-flash`). No AI Gateway or other infrastructure was introduced. Existing quotas, atomic reservation, concurrency limits, circuit breaker, feature caps, schemas and transient-only retries remain intact.

Primary runtime implementation: https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B

## Production evidence and remaining blocker

- Cloudflare secret metadata confirmed the three production secret names; no values were retrieved.
- Direct authenticated `/models` succeeded and listed the configured model. Production health briefly returned 200 when checking models only.
- One private production completion smoke test used the existing quota reservation/accounting for the migrated account, with a fixed reflection prompt and a 32 output-token cap. No personal input or generated content was logged. DeepSeek rejected it with HTTP 402 (`AI_BALANCE`); no successful generated response was available to parse. The failure was recorded through the existing accounting function.
- The temporary private POST hook and temporary `QUESTOS_DIAGNOSTIC_TOKEN` were removed. No public paid diagnostic route remains.
- Readiness now also checks the free official `/user/balance` endpoint and uses only `is_available`; balance amounts are never exposed. Successful readiness is cached for five minutes; failed checks for 30 seconds. Ordinary health checks never generate content or consume user quota.
- The owner must fund the DeepSeek account corresponding to the Cloudflare key. No key value needs to be shared. Retry the tiny smoke test and production sync after credit is available. Android signing, RevenueCat and Play work remain out of scope.

## Checks

`bun install --frozen-lockfile`, `bun run typecheck`, `bun test` (80 passed, zero failed, 418 assertions across 10 files), `bun run build`, changed-file ESLint, and `bun run security:scan` (395 files, zero findings) pass. Regression tests verify manual mode, redirect rejection without forwarding or retry, sanitization, balance readiness and malformed balance failure. Full-repository legacy lint remains a Stage 3 recorded backlog.

Final production health: HTTP 503, `provider-unavailable`, reason `balance`. Production home/privacy/terms return 200, destination Supabase connectivity succeeds, and OAuth initiation returns 302 to Google with the correct destination callback. Production readiness and guarded Android sync remain blocked on DeepSeek credit availability. Native origin remains `https://questos.questos-1fd92776.workers.dev`, with cleartext disabled.