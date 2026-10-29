# Security review

## Fixed and retested

Initial dependency audit: 52 findings (one critical, 35 high, 14 moderate, two low). Recorded repaired dependency graph: zero critical/high and one moderate.

- Capacitor Android 8.4.3 fixes the internal HTTP proxy issue GHSA-rvm3-566m-v7fv.
- Zod 4.6.6 fixes GHSA-mrhx-c7xc-m3w5. Explicit record key schemas preserve parsing behavior; unit tests and TypeScript pass.
- Vite and compatible transitives updated; patched sharp/undici overrides also passed Worker preview startup and production build.
- Continuation scan on 2026-10-29 found two additional Seroval advisories (GHSA-f86p-h4j2-7qgj, GHSA-9wx9-5pv9-3349). Compatible update 1.6.8 -> 1.6.11 fixed both. The remaining advisory is the legacy esbuild item below.
- Native callback validation rejects unexpected host/path/scheme, credentials, port, duplicate/empty/oversized code, stale state and invalid timestamps. Browser PKCE remains external; no WebView OAuth introduced.
- Source/generated asset secret scanner: zero findings. This is a pattern scan, not a guarantee that every possible secret format can be detected.

## Supabase sync finding resolved by review

`write_account_save` intentionally remains executable by authenticated clients. The deployed SECURITY DEFINER function derives the account from `auth.uid()`, locks that profile, checks revision, allowlists editable fields, rejects cross-owner record collisions, constrains deletes/upserts to ownership and applies changes atomically. Billing fields are excluded. Revoking authenticated EXECUTE would break legitimate persistence.

Live schema check on continuation confirms neither `anon` nor `authenticated` has CREATE on `public`, preventing those roles from introducing objects into that search path. Regression coverage exercises authorization, conflicts and rollback. No new migration was needed.

All 18 reviewed public tables have RLS. Nine server-only tables intentionally have no client policies. Profile column grants allow normal names, avatar, XP, character, timezone and settings updates; billing/customer/trial fields are server-authoritative. Live tests confirmed normal edits succeed and subscription status, Stripe/RevenueCat identifiers cannot be client-written. Cross-account profile/quest reads and writes were denied or returned no rows.

## Remaining findings

1. **Moderate, development-only:** esbuild 0.18.20 through legacy Drizzle tooling, GHSA-67mh-4wv8-2f99. Do not expose or run that legacy development server. No blanket incompatible esbuild override was applied. Upgrade/remove the legacy tool in a separately validated maintenance change. `bun audit` is not clean.
2. **Supabase Auth warning:** leaked-password protection disabled in the live advisor result. Enable if supported by the project's plan, or explicitly accept this residual risk. Email confirmation remains enabled; no auth protection was disabled for testing.
3. Logs and scanners cannot prove absence of all sensitive information. Private temporary test files remain ignored and must never be attached to public reports.

Paid access remains backend-authoritative. Production rejects sandbox receipts; historical annual receipts remain compatible. No billing product, price, key or production entitlement policy was changed.
