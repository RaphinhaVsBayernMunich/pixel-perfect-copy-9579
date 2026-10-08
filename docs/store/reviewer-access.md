# QuestOS Google Play reviewer access

Use **Policy and programs → App content → App access → All or some functionality is restricted**.
Add instructions named **QuestOS email/password and premium-feature review**.
The app requires a QuestOS account; Google sign-in is optional.

Owner recheck: `bun scripts/play-reviewer-verify.mjs`. It verifies the private password,
server user, active Premium trial, original review expiry and absence of credential leaks.
It ends only its own verification session, preserving other reviewer app/browser sessions.

## One private owner action

Open `C:\QuestOS-Secrets\questos-play-reviewer.private.json` locally and copy only its `email`
and `password` into the private Play Console username/password fields. Do not paste them into
chat, source, screenshots, store descriptions or public documents. The file is ACL-restricted
to the current Windows owner. The reserved `.invalid` email is a pre-confirmed dedicated test
login, not a mailbox; no email delivery, verification link, phone, OTP or Google login is needed.

Password sign-in was verified through Supabase. Backend `subscription_snapshot` was verified
as an active trial with premium entitlement. The existing server-controlled trial grants premium
features without a real purchase, fabricated store receipt or client entitlement override. Its
review access expires one year after creation; the exact expiration is in the private file.
Keep this account and server access available throughout every review, renewing before expiry.
Review trial uses the normal 40/day AI quota; paid accounts use their existing quota.

## Additional instructions — paste into the private App access form

Sign in using the email and password supplied in this form. No two-step authentication,
verification email, invitation or payment is needed. Use email/password sign-in, not Google.
If onboarding appears, skip optional fields, then choose “Skip AI and enter QuestOS” or generate
starter quests after reviewing the AI disclosure. Settings → Premium should show an active review
trial; this allows premium features without buying a subscription.

Home: create and complete a quest; open AI Coach to generate a morning brief, break a goal into
quests or obtain a reflection prompt. Calendar: schedule quests. Legacy: add a private journal
entry. Profile: inspect progress and XP. Premium: inspect AI Memory, Future Me, Goal Simulator,
Executive Assistant, advanced progress tools and appearance preferences. AI suggestions are
bounded and subject to quotas; AI Memory is optional. Executive Assistant requires an unscheduled
quest that fits the selected date/time window; generating its explanation does not apply changes.

On Android, optional calendar integration requires an existing writable device calendar; decline
permission to keep using normal planning. Health Connect requires Health Connect support and
existing steps/sleep/exercise records. Access is read-only; only explicitly confirmed summaries
are saved. No wearable or live purchase is needed to inspect the interface. Notifications are
optional local reminders. Settings supports data export, clearing health summaries and account
deletion. Use a separately created test account to test deletion so these review credentials
remain usable. Cancel any independently purchased subscription before account deletion.

This review trial exercises premium functionality, not a completed store purchase/renewal/refund.
Do not claim an actual purchase or end-to-end RTDN delivery test occurred.

## Private setup implementation

`scripts/play-reviewer.mjs` is an owner CLI, never part of the application. It creates a confirmed
dedicated account, saves credentials outside Git, applies a trial using owner service-role access,
checks the server snapshot and verifies password login. It refuses to overwrite existing
credential exports. Authenticated app clients still cannot write trial, billing or entitlement
fields. No new public review bypass or password reset endpoint was added.
