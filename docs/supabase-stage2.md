# QuestOS Stage 2 migration — 2026-10-02

Destination: `kqsoccbtookvwelctyhm`, `https://kqsoccbtookvwelctyhm.supabase.co`.
The accidental project was never queried or configured. Source access was read-only; no source migrations, writes, resets or deletions were performed. Cloudflare was not deployed.

## Schema and security

The destination initially had zero public tables, zero Auth users and no migration history. Supabase CLI 2.119.0 was already authenticated. All 12 historical Supabase migrations applied once, followed by additive `20261002160000_destination_grants.sql`. Supabase is now the authoritative destination migration history; do not apply the mirrored Drizzle migrations there.

All 18 application tables have RLS enabled. Source/destination match: 32 indexes, 56 constraints, 11 policies and 9 custom triggers. All 17 functions match after normalizing CRLF and comments. The additive migration removes broad Supabase default anonymous table grants and authenticated writes to server-owned usage/installation/subscription records. Future postgres-created tables/functions require explicit app-role grants.

Rollback-only `scripts/verify-destination.sql` passed against the real destination: legitimate profile updates work; nine billing fields deny writes; premium/quota RPC calls deny authenticated access; sync rejects billing fields; another account cannot read the existing profile/achievements. Service-role RPC grants remain present. All user-row changes in those tests rolled back.

## Data verification

All rows were restored in one transaction using the documented Supabase restore approach. Session replication mode was restored before validation/commit; RLS was never disabled. Each table's exact count and sorted JSON checksum was checked before commit and again after security tests. Foreign keys were explicitly checked, and original UUIDs/relationships were preserved. No failed import was reported as success.

| Table | Source | Destination | Matching checksum |
|---|---:|---:|---|
| account_sync_revisions | 1 | 1 | 113745f3662c83c1b305cf415fb967a2 |
| ai_requests | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| ai_usage | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| analytics_events | 1 | 1 | 0909e5a75f3516d0ba2e969d696e1aaa |
| assistant_proposals | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| billing_accounts | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| billing_checkout_keys | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| billing_configuration | 1 | 1 | 448b50ed7858949fff75aa8969562b5b |
| billing_events | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| billing_request_limits | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| billing_subscriptions | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| installations | 2 | 2 | 0d9aa3c729eec7ba11a3f04a3560c095 |
| legacy_events | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| premium_documents | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| profiles | 1 | 1 | 0d14503564c834a8e19122c2e96b9869 |
| quests | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| subscription_events | 0 | 0 | d41d8cd98f00b204e9800998ecf8427e |
| user_achievements | 11 | 11 | 67a640271ca8d5c067a6cf1e88d2a56d |

Source storage: zero buckets and zero objects. No files were invented or omitted.

## Auth

One Auth user and one Google identity were transferred with original UUIDs, provider ID, verified email state and metadata. Source had zero password hashes. No passwords, sessions, refresh tokens, recovery tokens or confirmation tokens were extracted. Existing sessions intentionally do not transfer; sign in again through the destination provider.

Verified source/destination checksums: user selected stable fields `d002ea2c9760102ad536d03527308093`; full provider identity excluding generated email column `f5b1a6988ea2e76eb00587001c3ad5d7`. Counts both 1. No profile relink, new user ID, email-based ownership claim or weakened authentication was necessary.

Destination public Auth settings return 200 and report Google disabled, email enabled. The only remaining auth prerequisite is owner Google OAuth configuration. Do not convert this Google-only account into a password account or fabricate credentials.

## Configuration

- Public fallback coordinates/key now target the owner project only. Public key was retrieved via authenticated CLI, filtered in memory and validated against destination Auth settings; no private key response was persisted.
- Client, admin and auth middleware reject a stale/foreign Supabase URL. Public examples and ignored local public environment coordinates are updated. Private fields remain untouched.
- `supabase/config.toml` points to the destination. Always use explicit `--linked --project-ref kqsoccbtookvwelctyhm` for migration/security commands.
- Server `SUPABASE_URL`: exact destination URL. Server `SUPABASE_PUBLISHABLE_KEY`: matching public key. Server `SUPABASE_SERVICE_ROLE_KEY`: destination privileged key, entered as a private server secret during Stage 3, never VITE-prefixed.
- Browser `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: safe destination coordinates in `.env.example` / public fallback.
- Android callback remains `app.questos.android://auth/callback`. Web OAuth/email redirects use the running app origin. Once Stage 3 provides a real HTTPS origin, set Supabase Site URL and exact web redirect to that origin, retain the native callback and set matching server `APP_ORIGIN`. No Lovable auth callbacks are used.
- Google UI flags remain off until provider/redirect setup is verified; enable `VITE_GOOGLE_AUTH_ENABLED` and `VITE_NATIVE_GOOGLE_AUTH_ENABLED` in the Stage 3 public build after the corresponding acceptance check.

## Checks

- `bun install --frozen-lockfile`: pass, 648 installs / 766 packages, no lock changes.
- `bun test`: 75 pass, 0 fail, 362 assertions, 9 files. Includes simulated broad platform default grants and destination URL guard tests.
- `bun run typecheck`: pass.
- `bun run build`: pass against destination coordinates. First attempt hit a file lock from the previous local preview; that preview was stopped and the build passed.
- Focused ESLint on all six changed TS files: pass, zero errors/warnings.
- `bun run security:scan`: 380 files, zero findings.
- `supabase db query --linked --project-ref kqsoccbtookvwelctyhm --file scripts/verify-destination.sql`: pass. Initial test incorrectly expected a userId field absent from the existing snapshot contract; fixed and rerun successfully, no data change.
- `supabase migration list --linked --project-ref kqsoccbtookvwelctyhm`: all 13 local/remote versions match.
- Source schema/content checks and destination content checks: pass.
- No live Google login claim while provider credentials are absent.

## Owner-only auth action

Supabase Dashboard → project QuestOS (`kqsoccbtookvwelctyhm`) → Authentication → Sign In / Providers → Google. Enable and enter the owner's OAuth Client ID and Client Secret privately. Google Cloud → APIs & Services → Credentials → that OAuth client: authorize `https://kqsoccbtookvwelctyhm.supabase.co/auth/v1/callback`. Success: public Auth settings report Google enabled. Do not paste credentials in chat. Codex can recheck automatically after the owner saves.

Automatic review rejected persisting a complete API-key response. The safer alternative selected only the public key in memory and succeeded; private key storage is not required.

References: [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations).

Stage 2 schema/data/auth-record transfer is complete. Stage 2 auth readiness remains blocked only by private Google provider configuration. No Cloudflare deployment or Android production URL change was performed.

