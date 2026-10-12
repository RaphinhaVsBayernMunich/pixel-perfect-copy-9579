# QuestOS web branding and Auth email audit — 12 October 2026

Production: https://questos.questos-1fd92776.workers.dev
Supabase: `kqsoccbtookvwelctyhm`. QuestOS is operated by Oryxion.

## Branding fixed

The root head linked `/favicon.ico`, which still contained the original Lovable heart.
There is no root `index.html`: TanStack's root route generates the web document. No prior web
manifest or apple-touch/social image override was present. The native shell is separate and unchanged.

- Browser favicon and apple-touch icon use a byte-identical copy of the official 512px store icon.
- The legacy ICO now contains the existing QuestOS geometric diamond at multiple sizes.
- Versioned icon links avoid reuse of the old browser-cached favicon.
- `site.webmanifest` uses QuestOS for both names, with the existing brand colors/icon.
- Open Graph/Twitter use a byte-identical copy of the finished QuestOS feature graphic.
- The remaining visible Lovable reference in an unavailable-web-payments error was replaced with
  support wording only; no billing logic or product IDs changed. A stale seed-data comment was corrected.
- Source/public/generated client text and production home metadata have no Lovable reference.
  Development attribution/history in repository documentation is not removed or rewritten.

## Actual production Auth configuration — authenticated Management API HTTP 200

| Setting                         | Observed                                                     |
| ------------------------------- | ------------------------------------------------------------ |
| Signup disabled                 | false — signup enabled                                       |
| Email provider                  | enabled                                                      |
| Email auto-confirm              | false — confirmation required                                |
| Site URL                        | https://questos.questos-1fd92776.workers.dev                 |
| Allowed redirects               | Production origin above; app.questos.android://auth/callback |
| Custom SMTP host/port/sender    | absent                                                       |
| Custom SMTP credentials present | false                                                        |
| Send-email Auth hook            | disabled                                                     |
| Email-send limit                | 2 per hour                                                   |
| Minimum SMTP interval           | 60 seconds                                                   |
| Confirmation subject            | Confirm your email address                                   |
| Custom confirmation template    | absent; Supabase default applies                             |

The existing CLI credential was read privately in memory. Only allowlisted nonsecret settings and
aggregate log signals were emitted. No management token, SMTP secret, raw log, address or confirmation
token was written to this document or committed. Auth configuration and Google OAuth were not changed.

Supabase's built-in mail service is restricted to project-organization member addresses, has tight
rate limits and no production delivery guarantee. The **confirmed configuration blocker** is missing
custom SMTP. Its two-per-hour configured limit was observed; remaining quota/bucket consumption is
not exposed by the configuration API.

The supported Auth logs query returned HTTP 200: six records in the bounded previous-day window,
with no recognized unauthorized-address, email-rate-limit or SMTP failure signal. This does **not**
identify the reported signup attempt: no timestamp/address was supplied, logs may be outside the
window, and absence of a signal is not proof of delivery. Initial unbounded/default query returned
400; a documented bounded Auth-source query succeeded. No raw logs were persisted.

## Why the UI could imply email delivery

The original UI did check Supabase's returned `error`; it did not always ignore backend failures.
However, every sessionless successful signup response displayed “Check your email to confirm your
account.” A successful API response is not an inbox delivery receipt. Supabase can also obfuscate
signup attempts for an existing confirmed address instead of sending a new confirmation. Neither
duplicate-account suppression nor a particular user's mailbox failure is asserted as proven here.

The UI now says **Signup request received** and conditionally explains email confirmation, explicitly
stating delivery is not confirmed. It does not reveal account existence. A real returned session is
handled separately. Errors map known provider codes/statuses to useful rate-limit, unavailable-email,
validation and retry/support messages; unknown/raw provider messages are never displayed. No auth
security check is bypassed and confirmation remains required.

## OWNER ACTION — production SMTP required

Use a transactional SMTP provider with a verified sending domain. One concrete supported option is
Resend; another provider is acceptable if its actual SMTP settings are used. No provider account,
credentials, DNS records or paid plan was invented or configured in this pass.

1. In the provider, verify `questos.net` using its supplied DNS records, authorize the sending address,
   and create the required sending credential privately. Confirm its daily/hourly sending allowance.
2. Open **Supabase → kqsoccbtookvwelctyhm → Authentication → Email → SMTP settings**, or
   https://supabase.com/dashboard/project/kqsoccbtookvwelctyhm/auth/smtp. Enable custom SMTP.
3. Enter these fields. Resend example values apply only after its account/domain are configured:

| Dashboard field           | Value                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Sender email address      | `founder@questos.net`, only after authorized by the provider; or another owner-verified address under questos.net                   |
| Sender name               | QuestOS                                                                                                                             |
| Host                      | Provider's SMTP host; for Resend, `smtp.resend.com`                                                                                 |
| Port                      | Provider's supported TLS port; for Resend, `465` (implicit TLS)                                                                     |
| Username                  | Provider's SMTP username; for Resend, `resend`                                                                                      |
| Password                  | Actual SMTP sending credential; for Resend, its API key. Enter only in Supabase's private field, never chat/Git/client environment. |
| Minimum interval per user | Keep 60 seconds initially; do not disable anti-abuse controls.                                                                      |

4. **Authentication → Rate Limits:** review the email-send rate after custom SMTP is enabled;
   set a production allowance within the provider plan/quota. Do not silently remove rate limits.
5. **Authentication → URL Configuration:** keep the production Site URL and exact existing redirects.
   **Sign In / Providers → Email:** keep email enabled and Confirm email enabled.
   **Email → Templates → Confirm signup:** keep the default confirmation link or, if customizing,
   preserve `{{ .ConfirmationURL }}`; do not hardcode a token or a foreign redirect.
6. Authorize a real test mailbox you control, perform one fresh signup, and verify actual receipt
   and the confirmation link returning to QuestOS. Use provider email-event status and Auth logs
   if it fails. Do not share passwords, SMTP credentials, confirmation links or OTPs in chat.

**Email delivery is NOT fixed or proven yet.** No email was sent or account created for this audit;
the existing reviewer address is not a deliverable email-test mailbox. Owner SMTP setup and an
authorized delivered confirmation remain the concrete blockers.

## Completed verification

- Worker version: `90a27652-4be0-4aae-8d5f-a5f6c8aa6bc0`.
- Production home HTTP 200, QuestOS title/icon references, no Lovable metadata.
- Icon, ICO, manifest and social image: HTTP 200, exact hashes match deployed source assets.
- Browser DOM: title QuestOS, correct favicon/apple-touch links/manifest, no visible Lovable text.
- Supabase Auth health HTTP 200. An invalid-token confirmation probe returns HTTP 303 to the
  correct QuestOS production origin. This verifies the redirect policy, not an actual confirmation.
- Typecheck and changed-file ESLint passed.
- `bun test`: 100 passed, 0 failed; 513 assertions across 17 files. Added tests verify provider-detail
  sanitization, rate-limit/configuration messages and no delivery guarantee on sessionless success.
- Production build/deployment passed with existing nonblocking deprecation/bundler warnings.
- Final source/generated/native secret scan passed: 474 text files, zero findings.
- No Supabase config/migration, Google OAuth change, billing behavior change or Android source change.
- **NO ANDROID AAB REBUILD/REUPLOAD REQUIRED.** Existing native runtime serves these web changes.

Sources: [Supabase SMTP restrictions/setup](https://supabase.com/docs/guides/auth/auth-smtp),
[Management Auth config](https://supabase.com/docs/reference/api/v1-get-auth-service-config),
[Auth logs query](https://supabase.com/docs/guides/observability/advanced-log-filtering),
[Resend SMTP settings](https://resend.com/docs/send-with-smtp).
