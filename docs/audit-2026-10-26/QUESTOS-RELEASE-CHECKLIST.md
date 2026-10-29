# Release checklist

- [x] Preserve interrupted worktree and existing architecture.
- [x] Patch Capacitor/Zod security findings; typecheck, unit tests and build.
- [x] Production runtime sync; debug build and four instrumentation tests.
- [x] Verify live billing catalog without changing products/prices.
- [x] Review live RLS, profile column authority and sync RPC.
- [x] Seven live AI features and stored token metadata verified without repeating generations.
- [x] Owner-confirmed emulator Google OAuth round trip.
- [ ] Observe offline cold startup, Retry and process-death session recovery.
- [ ] Verify Android logout/account switching and native permission flows end to end.
- [ ] Configure an isolated sandbox target; execute purchase/restore/renewal/cancel/refund/expiry and provider delivery checks.
- [ ] Resolve or accept disabled leaked-password protection and development-only moderate dependency advisory.
- [ ] Complete final visual acceptance on the repaired deployed candidate; current production web is not the audit branch.
- [ ] Merge/deploy verified audit changes through the normal release workflow.
- [ ] Only after separate authorization, select next unused versionCode, sign/validate a new AAB and test through Play internal testing.

No production Play publication or real purchase is authorized by this checklist. No final signed AAB was generated during the audit.
