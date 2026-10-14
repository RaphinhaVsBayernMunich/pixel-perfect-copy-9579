# QuestOS SMTP — owner domain correction, 14 October 2026

QuestOS is operated by Oryxion. The owned domain is **oryxion.net**.
SMTP sender: **QuestOS <noreply@oryxion.net>**.
Monitored support/privacy/deletion contact, explicitly approved by the owner: **founder@oryxion.net**.
Production remains https://questos.questos-1fd92776.workers.dev.
Supabase project remains **kqsoccbtookvwelctyhm**.

## Withdrawn incorrect setup

The owner does **not** own questos.net. Its earlier Resend entry
`05364d92-d190-4807-946e-b58d55052730` remains unverified and is ignored.
No key, SMTP configuration or DNS change was made for it. Do not verify it, use its records,
repair its delegation or configure a sender/contact on it. Its old DNS instructions are withdrawn.
The incorrect old-domain DNS failure is irrelevant to the owned domain.

The audit found incorrect SMTP/domain ownership instructions in this document and
`production-auth-email-branding.md`, plus the old support address in 17 source, script,
listing/compliance, test and template files. Those addresses are replaced consistently.
Any mention of the unowned domain now serves only this correction/audit record.

## Correct Resend domain and exact DNS records

Created **oryxion.net**, ID **a3154dcc-2d80-4e43-a5d7-a5f7f4889c3e**, in the authenticated
oryxion Resend account. Resend now confirms Verified and ready to send, after DNS provisioning completed.
Resend selected Tokyo; receiving remains disabled.

| Type  | Host/name under oryxion.net | Exact value                                                                                                                                                                                                                | TTL                       |
| ----- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| TXT   | resend.\_domainkey          | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC5ug6DziwD+jV/WIJTOXpOSrMycnBAEGiZ6s7G6ovCHmxDItpwe1vWAhvlWD0KU4viZe6IIev4T9Q98lJDm8nho7OTijKy/O5qsoHwzWQxb4/cCfvBaMUVK1BLBwrEHrH4wXutngWPhFghYdTk/ievUGnRYGu3Llqif8L/gdRQ2wIDAQAB | 1 Hour (saved by GoDaddy) |
| CNAME | rsend                       | rsend-apne1.forge.rmta.net                                                                                                                                                                                                 | 1 Hour (saved by GoDaddy) |
| CNAME | send                        | send.forge.rmta.net                                                                                                                                                                                                        | 1 Hour (saved by GoDaddy) |

DKIM is a public verification value, not a private API key. These values were read directly
from this new Resend domain, not copied from the incorrect old domain.
Public NS lookup succeeds and returns **ns49.domaincontrol.com** / **ns50.domaincontrol.com**.
All three approved records are saved in GoDaddy, after the owner completed the private identity check. Public Google DNS resolves each exact value with status 0.

DNS provider is **GoDaddy**, not Cloudflare. Go to https://dcc.godaddy.com → Domain Portfolio →
**oryxion.net → DNS → DNS Records → Add New Record**. Preserve existing website/MX/mail records.
No nameserver change is required. The owner signed into GoDaddy. All 12 existing records were inspected: Google mail, existing SPF, Google DKIM and quarantine DMARC are preserved. Three additive records are saved; GoDaddy readback reports 1 Hour TTL for each. The record count rose from 12 to 15 and the success message was observed.

After records resolve, continue at
https://resend.com/domains/add/a3154dcc-2d80-4e43-a5d7-a5f7f4889c3e
and verify the existing domain. Do not create duplicate domains.

## Key and Supabase SMTP

After verification, create **QuestOS Supabase SMTP**, **Sending access**, restricted to
**oryxion.net**, at https://resend.com/api-keys. No broad management key is required.
The owner approved this exact restricted key creation. After the domain became Verified, the key was created with Sending access restricted to oryxion.net. The private Copy control was used without reading/displaying the key. The owner entered it through the separate hidden-input terminal. Supabase SMTP configuration completed with exit code 0 and non-secret readback matched. No secret is logged or committed.

https://supabase.com/dashboard/project/kqsoccbtookvwelctyhm/auth/smtp

| Field              | Exact value                                                  |
| ------------------ | ------------------------------------------------------------ |
| Enable custom SMTP | On; domain/key verified                                      |
| Sender email       | noreply@oryxion.net                                          |
| Sender name        | QuestOS                                                      |
| Host               | smtp.resend.com                                              |
| Port               | 465                                                          |
| Username           | resend                                                       |
| Password           | Private Resend sending key; enter only through private input |
| Minimum interval   | Keep 60 seconds                                              |

Email rate currently 2/hour; keep unchanged until SMTP/provider allowance is verified.
Confirmation must remain enabled. Keep Site URL and web redirect at the production Worker origin,
retain `app.questos.android://auth/callback`, and preserve Google OAuth.

Prepared confirmation template: `supabase/templates/confirmation.html`, subject
**Confirm your QuestOS account**, support address founder@oryxion.net, one
`{{ .ConfirmationURL }}` link, no foreign mail domain or hardcoded token.
Earlier template customization returned HTTP 400 while default SMTP was active; the helper now
blocks template application until custom SMTP exists. The QuestOS confirmation template is now applied and read back successfully.
The actual Management API field is `mailer_templates_confirmation_content`; the shorter key used
in the first audit was incorrect. Live QuestOS content has a valid confirmation URL and no Lovable
branding. Supported helper: `scripts/supabase-email-config.py`.

## Delivery and checks

The owner authorized one confirmation test to founder@oryxion.net. A read-only check confirmed no existing account for that address. One normal Supabase signup returned HTTP 200, created an unconfirmed account, recorded confirmation_sent_at and granted no session. Its temporary random password was neither printed nor persisted; the owner can choose their own password later through the existing recovery flow.

Resend records **Delivered** for "Confirm your QuestOS account" to the authorized mailbox (event 01a13b0a-9f44-727c-bbe9-0143316b5aa8). Provider delivery is proven. Owner inbox receipt and clicking the confirmation link back to QuestOS remain pending; no end-to-end confirmation claim is made yet. Do not share links/tokens or secrets in chat.

Verification on 14 October 2026:

- Typecheck and changed-file ESLint passed.
- Bun tests: 100 passed, 0 failed, 513 assertions.
- Python SMTP helper tests: 6 passed.
- Production build and deployment passed; Worker version 60891447-0226-4255-bea9-cadf80658f91.
- Public home/privacy/account-deletion/partial-deletion pages HTTP 200; legal pages show the new contact, no old domain.
- App /api/health HTTP 200, ready.
- Secret scan: 476 files, no findings. Only two explicit historical domain-correction paragraphs still mention the unowned domain.
- Existing AAB SHA256 unchanged: 9D6228D51D39818F9BE06569B639AF219DE801B7AA3C19CDF73CE51FC7314033.
- Resend is Verified, the domain-restricted key is configured privately in Supabase, and the test email is Delivered. Owner inbox/link confirmation remains pending.
  No billing, RevenueCat, Play configuration, Google OAuth, Android source or AAB changes are authorized.
  Prepared Play contact files are corrected locally only; no Play form was submitted.

Sources: [GoDaddy DNS](https://www.godaddy.com/en-uk/help/manage-dns-records-680),
[Resend SMTP](https://resend.com/docs/send-with-smtp),
[Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

SMTP readback: smtp.resend.com:465, username resend, sender QuestOS <noreply@oryxion.net>, credentials present. Confirm email remains required; web Site URL and Android callback are unchanged; Google OAuth remains enabled. Existing 2 emails/hour project limit and 60-second minimum interval remain unchanged and should be reviewed against expected signup volume before a larger rollout.
