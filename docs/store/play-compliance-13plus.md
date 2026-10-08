# QuestOS — final teen-and-adult Play setup pack

Reviewed 7 October 2026. This supersedes the earlier all-ages audit.
Package `app.questos.android`; Internal Testing versionCode 2 / versionName 1.0.0.
Runtime https://questos.questos-1fd92776.workers.dev.
Support/privacy: founder@questos.net. Legal operator: see the canonical owner-supplied
[legal identity record and update process](legal-operator.md); no identity is inferred from branding.

## A. Final target audience

In App content → Target audience and content, select **13–15**, **16–17**, **18 and over**.
Do not select **5 and under**, **6–8** or **9–12**. Do not select the option to restrict all minors
from finding/downloading the app or making purchases: this would contradict the intended teen
audience. QuestOS is productivity/planning for teens and adults, not an app designed for children.
Target audience is separate from the IARC-assigned content rating.

## B. Families policy status

The owner expressly changed the audience to exclude children under 13. The prior child-directed
Families, mixed child/unknown-age SDK and child Android-ID safeguards are no longer setup blockers
on that basis. No child mode or parental-consent framework was added. General user-data, health,
minor-consent and local-law requirements still apply. Terms/privacy say 13+, with guardian review
where required; onboarding age is not claimed to be verified age assurance. Store graphics should
not suggest an under-13 target. Google's assessment of actual design/marketing controls applicability.

Reference: [target audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en).

## C. AI policy applicability — feature-by-feature

| Feature             | Actual scope                                                                                      | Existing feature improved            |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Morning Brief       | 2–3 sentences about supplied character/progress and selected quests                               | Daily task overview                  |
| Goal → Quests       | 4–7 schema-validated task drafts for a goal and selected horizon                                  | Quest creation                       |
| Reflection Prompt   | One short question based on recent completions/XP                                                 | Private journaling                   |
| Starter Quests      | One main quest, starter tasks and short welcome from selected onboarding fields                   | Initial task setup                   |
| Future Me           | Bounded summary/observations/next steps explaining computed practice/adherence evidence           | Goal planning                        |
| Goal Simulator      | Bounded explanation of computed effort, time and backlog scenarios                                | Goal planning                        |
| Executive Assistant | Explanation of deterministic time slots; explicit separate confirmation applies a server proposal | Scheduling                           |
| AI Memory           | Optional saved facts and up to 20 completion summaries supplied as context                        | Personalization of the above actions |

There is no free-form chat conversation/history interface, arbitrary assistant agent/tool browsing,
image/voice/video generation or public AI-content feed. Requests use named validated actions,
bounded output schemas, quotas and existing productivity records. “Future Me” is an evidence-based
planning narrative, not unrestricted roleplay. The daily planner, quests and journal work without AI.

**Assessment:** these fall within Google's current limited-scope productivity-app exception, which
expressly includes AI improving an existing productivity feature. The previous assertion that
reporting was necessarily required was too broad. No new reporting/moderation infrastructure was
added. This is an evidence-based applicability assessment, not a Google approval certificate.
Reassess if general chat or another covered generation product becomes a central feature.

General restricted-content obligations remain. The existing model request now instructs lawful,
age-appropriate planning and safe alternatives; instructions/schema validation are not a guarantee
that every generated sentence is safe. AI disclosure and inaccurate-output warnings remain.
Onboarding no longer generates/transmits automatically: explicit Generate or Skip AI choices are
present. Coach and premium AI tools disclose DeepSeek processing/model improvement. Scheduling
database IDs/edit versions stay out of the model explanation payload; server proposals retain them.

Reference: [official AI policy applicability](https://support.google.com/googleplay/android-developer/answer/14094294?hl=en).

## D. Final Data Safety answers

Scope: the current Android app including its controlled remote WebView, backend and actual SDKs.
This is the prepared declaration; the owner must attest and submit. It does not certify an
unobserved provider configuration change or the use of another advertising/attribution integration.

### Top-level form

- Does your app collect or share any required user data types? **Yes**.
- Is all collected user data encrypted in transit? **Yes**, implemented production paths use HTTPS.
- Account creation: **Username and password** (email/password) and **OAuth** (Google).
- Can users request account deletion? **Yes**.
- Account deletion URL: https://questos.questos-1fd92776.workers.dev/legal/delete-account.
- Can users request deletion of some data without deleting the account? **Yes**: saved Health
  Connect summaries can be cleared in Settings; account/provider requests go to the public contact.
- Independent security review/certification badge: **do not claim one**. Provider certifications
  are not an independent review of this app. Do not claim end-to-end encryption.

### Collected/shared classifications

“No” sharing below applies to processing solely on behalf of QuestOS by Supabase/Cloudflare/
RevenueCat, supported by their published terms/DPAs and the implemented service use. It is not a
claim that data never leaves the device. First-party product analytics in Supabase is collection.
RevenueCat's documented guidance requires purchase history, non-ephemeral, required collection,
with App functionality and Analytics purposes. Native configuration is account-bound even when
no paid purchase is made; do not mark all purchase-history collection optional merely because
buying is optional. The only listed webhook is the existing first-party QuestOS Production endpoint.
No attribution/customer-email SDK calls or ad integrations were found in app code.

**DeepSeek: disclose sharing**, because its published policy permits own service/model improvement
and does not establish processor-only use for this account. No zero-retention/no-training promise
is made. No user-action sharing exemption is relied on to conceal this transfer. Google OAuth is
the user's explicitly selected authentication operation; its disclosed user-initiated transfer
and service-auth processing are excluded from sharing under the applicable exceptions.
Google Play payment UI separately processes card/bank information; QuestOS receives purchase
records, not card/bank details. Stripe is the browser/web billing provider; native checkout uses
Google Play. Fonts are now self-hosted, removing Google Fonts requests.

| Exact data type                             | Collected | Shared | Ephemeral | Required/optional | Collection purposes                                                                         | Sharing purposes                                                             |
| ------------------------------------------- | --------- | ------ | --------- | ----------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Location → Approximate location             | Yes       | No     | No        | Required          | App functionality; Fraud prevention, security and compliance                                | —                                                                            |
| Personal info → Name                        | Yes       | Yes    | No        | Optional          | App functionality; Personalization; Account management                                      | App functionality; Personalization; Analytics (AI service/model improvement) |
| Personal info → Email address               | Yes       | No     | No        | Required          | Account management; Fraud prevention, security and compliance                               | —                                                                            |
| Personal info → User IDs                    | Yes       | No     | No        | Required          | App functionality; Account management; Analytics; Fraud prevention, security and compliance | —                                                                            |
| Personal info → Other info                  | Yes       | Yes    | No        | Optional          | App functionality; Personalization                                                          | App functionality; Personalization; Analytics (AI improvement)               |
| Financial info → Purchase history           | Yes       | No     | No        | Required          | App functionality; Analytics; Account management; Fraud prevention, security and compliance | —                                                                            |
| Health and fitness → Health info            | Yes       | No     | No        | Optional          | App functionality                                                                           | —                                                                            |
| Health and fitness → Fitness info           | Yes       | No     | No        | Optional          | App functionality                                                                           | —                                                                            |
| Calendar → Calendar events                  | Yes       | No     | No        | Optional          | App functionality                                                                           | —                                                                            |
| App activity → App interactions             | Yes       | Yes    | No        | Required          | App functionality; Analytics; Personalization                                               | App functionality; Personalization; Analytics (AI improvement)               |
| App activity → Other user-generated content | Yes       | Yes    | No        | Optional          | App functionality; Personalization                                                          | App functionality; Personalization; Analytics (AI improvement)               |
| App info and performance → Diagnostics      | Yes       | No     | No        | Required          | App functionality; Fraud prevention, security and compliance                                | —                                                                            |
| Device or other IDs                         | Yes       | No     | No        | Required          | App functionality; Analytics; Fraud prevention, security and compliance                     | —                                                                            |

App interactions include automatic analytics and progress/completion statistics optionally sent to
AI. Thus this data type remains Required even though its AI sharing occurs only when that feature
is chosen. Name and other profile fields can be skipped; only selected starter fields (name,
profession, goals, interests, skills, chronotype) go to DeepSeek. Age, country, timezone and the
full profile do **not** automatically go to the model. User IDs means authentication/customer
identifiers; these are not forwarded to the model. Free-form content may itself contain personal
information, which the disclosures advise users to avoid. Health/calendar records are not
automatically supplied to AI; manually entering such information in a goal/memory is user content.

Approximate location reflects IP-derived infrastructure geography, not Android GPS permission.
Cloudflare documents region/city information in incoming Worker requests; no app location tracking
or location sharing with other users exists. Diagnostics include Supabase auth/API service and
security logs, not a dedicated crash-reporting SDK. None of these retained data types is declared
ephemeral. Deletion requests are available for collected personal data, with disclosed fraud,
payment/security and provider-retention exceptions; no promise that all provider copies disappear
immediately is made.

Not collected as dedicated implemented Android data types: precise location, address/phone,
race/ethnicity, political/religious beliefs, sexual orientation, contacts, emails/SMS/user-to-user
messages, photos/video/audio, raw files/documents, browsing history, search history, installed-app
inventory, crash dumps, credit-card/bank information or other financial-account details. Import
features parse local task/calendar/health records into their relevant categories; they do not
upload original files. No advertising/marketing data purpose is implemented. Country entry is
profile info, separate from IP-derived location. Health includes confirmed sleep totals; fitness
includes confirmed steps and workout totals. Raw Health Connect samples stay on the device.

### Retention and provider evidence

| Provider/data                     | Processing and retention conclusion                                                                                                                                                                                                    | Deletion handling                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase account/database         | Published DPA makes Supabase processor; active account records remain until deletion. No app TTL. Auth/service logs and backups follow plan/provider retention; dashboard-visible log duration is not proof of full erasure.           | Auth admin deletion cascades all public account-owned tables. Auth security logs/backups are separately retained; provider assistance through support.     |
| Cloudflare Worker                 | Processes app content as service provider under DPA; automatic IP/network metadata and regional request information support delivery/security. Worker observability is disabled, not proof that platform infrastructure keeps no logs. | No application prompt/content database in Worker; provider security/access retention remains separate.                                                     |
| RevenueCat                        | DPA/service processing of account IDs and purchase history. Stored until customer deletion/service requirements; no fixed app-level TTL promised.                                                                                      | Backend requests customer deletion through existing V1; success 200/404, queued asynchronously.                                                            |
| Google Play                       | Purchase/payment processing and billing-history retention under Google's terms.                                                                                                                                                        | Cancel subscriptions separately; QuestOS does not delete Google account/payment records.                                                                   |
| Google OAuth                      | Optional user-selected sign-in; Supabase stores linked identity.                                                                                                                                                                       | QuestOS Auth identity removed; independent Google account retained.                                                                                        |
| DeepSeek                          | Treat as sharing, including permitted improvement/training. Policy describes China processing and purpose-based retention, not a fixed API TTL.                                                                                        | Owner/provider request via privacy@deepseek.com; deletion/training-opt-out rights described in policy, not an implemented automatic per-request erase API. |
| First-party analytics/AI metadata | Stored with account until cascade deletion; prompts/outputs absent from ai_requests logs, but accepted quests and assistant proposals may contain generated content.                                                                   | Account cascade.                                                                                                                                           |
| Trial hashes/billing dedup IDs    | Retained for anti-abuse/idempotency; no automatic TTL implemented. These may remain pseudonymous/linkable, not claimed anonymous.                                                                                                      | Disclosed retention exceptions; no fabricated expiry schedule.                                                                                             |
| Local saves                       | Account-scoped saves and recovery backups; ordinary logout preserves them.                                                                                                                                                             | Successful account deletion removes only that user's current-device keys; offline other-device copies require clearing app/site data.                      |

A numerical provider retention period is not a Data Safety form field, and a fixed period cannot
be invented where the published service uses purpose-based retention. The declaration therefore
does not depend on claiming an unverified TTL or a training opt-out that was never configured.

References: [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en),
[Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum),
[Supabase auth logs](https://supabase.com/docs/guides/auth/audit-logs),
[Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/),
[Worker request geography](https://developers.cloudflare.com/workers/runtime-apis/request/),
[RevenueCat guidance](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety),
[RevenueCat DPA](https://www.revenuecat.com/dpa),
[DeepSeek privacy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html?locale=en_US),
[DeepSeek API terms](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html).

## E. Privacy and legal operator placement

Public privacy URL is preserved. Updated 13+ positioning, AI-sharing/provider retention, IP-derived
region/diagnostics, guardian review and self-hosted fonts. Operator name remains deliberately
unfilled until supplied. Insert the actual legal name (not an invented company) in:

1. Privacy policy opening: “QuestOS is operated by [exact legal name]. Privacy contact: founder@questos.net.”
2. Terms service/operator paragraph, separate from QuestOS product branding.
3. Deletion page introductory operator/contact statement.
4. Play Console developer account/legal identity and organization details, matching verified identity
   and payment profile. Use a permitted separate public developer brand only where Console allows it.
5. Store listing support contact remains founder@questos.net; use legal identity where Console
   asks for operator information, not by replacing the QuestOS app title.

Source `APP_CONFIG.legal.companyName` identifies the QuestOS brand. The separate
`src/lib/config/legal-operator.json` is consumed by a shared notice on all three legal pages.
The single update process in `legal-operator.md` updates public identity, this canonical
compliance record and prepared Play metadata. No jurisdiction or verified developer identity is inferred.

## F. Account deletion

https://questos.questos-1fd92776.workers.dev/legal/delete-account is public without login/app install.
Email request from the account address to founder@questos.net with subject “QuestOS account deletion”;
owner verifies ownership, monitors requests and fulfills applicable processor requests. Never ask
for passwords/payment secrets. Settings → Delete account → type DELETE is the self-service path.

Backend requires authentication and explicit confirmation, requests RevenueCat deletion first,
then removes Supabase Auth; account-owned profiles, quests, legacy/journal, achievements,
subscription/account rows, analytics, AI logs, premium documents and proposals cascade. Provider
failure keeps the account available for retry; Auth failure after provider request is reported.
This is not an atomic transaction spanning vendors. Success detaches sync and removes only the
current account's device saves/backups. Local-storage failure instructs clearing app data.
Subscription cancellation is separate. Payment records, security logs, trial hashes, dedup IDs,
provider backups/AI retention and other-device copies are disclosed exceptions/limitations.
Do not claim a real account was deleted merely because tests passed.

Reference: [account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## G. Reviewer access

Dedicated confirmed reviewer account created; password login and server trial/premium-feature
entitlement verified. Credentials exist only in the ACL-restricted private file
`C:\QuestOS-Secrets\questos-play-reviewer.private.json`, never source or public documentation.
Review trial lasts one year, with existing trial quota, and must be renewed before expiry.
No purchase/receipt or permanent entitlement was fabricated. Reviewers can reach premium features
without a purchase. No reviewer-only client bypass or public admin endpoint exists.

The **one credential action** is to copy that file's email/password privately into Play App access.
Exact additional instructions are in `reviewer-access.md`. Choose “All or some functionality is
restricted”. Password login requires no mailbox, OTP, invitation or Google account. Keep the
dedicated account intact; use a separate test account for account-deletion testing.

## H. Ads

**Contains ads: NO.** App dependencies/source have no ad-network or ad-placement implementation.
Subscriptions/paywall are not ads. No Advertising ID permission or collection call found.
First-party analytics must still be disclosed.

## I. Content rating — exact recommended answers for implemented content

Select productivity/utility / “All other app types” when that branch is offered. Fixed
developer-authored violence, sexual content/nudity, profanity, horror/fear, gambling, drugs/alcohol:
**No**. Paid simulated gambling, betting, randomized purchases/loot boxes: **No**.
Digital goods/subscriptions/in-app purchases: **Yes**. Public UGC exchange, messaging/social
interaction with other users, public profile sharing and location sharing: **No**.
Advertising: **No**. AI-assisted content generation: **Yes**, if asked. Private user-entered
quests/journal are not public user-to-user UGC; answer each question according to that wording.

AI actions generate planning/journaling text and cannot be certified from code to never produce
an inappropriate sentence; the limited-scope exception is not a content-rating exemption.
Actual IARC questions branch by platform/product and determine the rating. Do not invent a final
rating/certificate, answer an unseen universal AI-content guarantee, or treat target 13+ as the
rating itself. Owner must review and attest the current questionnaire.

## J. Store listing

Ready-to-paste exact text: `play-listing.en-US.json`.
Name **QuestOS**; category **Productivity**; contact **founder@questos.net**.
Short description: **Turn goals into quests, track your progress and reflect on your day.**
Website: runtime URL above; privacy URL `/legal/privacy`; deletion URL `/legal/delete-account`.
No all-ages-safe, medical, unlimited-AI or false live-purchase claims. No requirement to add a
price to marketing copy; checkout displays localized Google Play price and renewal terms.

## K. Required assets

| Asset                      | Dimensions / format / quantity                                                                                     | Existing status / real capture                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Store icon                 | 512×512; 32-bit PNG; one, ≤1 MB                                                                                    | Existing `questos-icon-512.png` verified 512×512; not uploaded                                                            |
| Feature graphic            | 1024×500; opaque 24-bit PNG/JPEG; one                                                                              | Exact branding/export specification in `feature-graphic-spec.md`; finished opaque RGB PNG and vector source now available |
| Phone screenshots          | At least 2, up to 8; JPEG/24-bit PNG; sides 320…3840 px, longest ≤2× shortest                                      | Five genuine 1080×1920 captures; provenance and order in screenshots/README.md                                            |
| 7-inch tablet screenshots  | Up to 8 matching actual layout, JPEG/24-bit PNG; large-screen guidance: 4–8 captures at 1080…7680 px, 16:9 or 9:16 | None; capture genuine supported layout if tablets distributed                                                             |
| 10-inch tablet screenshots | Up to 8 matching actual layout, JPEG/24-bit PNG; large-screen guidance: 4–8 captures at 1080…7680 px, 16:9 or 9:16 | None; capture genuine supported layout if tablets distributed                                                             |

For expanded promotional eligibility use at least four genuine high-resolution screenshots;
this is distinct from the basic two-screenshot requirement. Show clean test data, not owner data
or secrets. No fake screenshots, ratings badges, child-marketing characters or nonexistent UI.
No TV/Wear/automotive-specific assets or declarations are asserted required for this phone app.
[Official asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-en).

## L. Play automation result

Authenticated audit confirms en-US title only; no descriptions/contacts or uploaded icon,
feature graphic, phone/tablet screenshots. Internal v2 completed; Production has no release.
Google previously rejected `changesNotSentForReview=true`; no review submission is authorized
by this task. Current instruction explicitly says prepare metadata for owner if safe staging is
unsupported, so no attempt removes the safeguard. The prepared listing/support fields remain local.
Publisher API does not establish dashboard badge/merchant/account-verification status.
No legal declaration or Production release submitted. Current Google App Store Review policy APIs
exist separately; their existence is not authorization to submit an owner legal attestation.

## M. Billing/Internal Testing and permissions preservation

Canonical monthly product `questos_premium_monthly:monthly`, US $2.99/month, entitlement premium,
offering default and package $rc_monthly unchanged; annual historical receipts remain supported.
Existing V1/V2 keys untouched. Existing first-party webhook and RTDN topic preserved; no duplicate
integration/topic, no real purchase or new assertion of end-to-end lifecycle delivery.

Native permissions unchanged: POST_NOTIFICATIONS, INTERNET, READ_CALENDAR, WRITE_CALENDAR,
VIBRATE, RECEIVE_BOOT_COMPLETED, WAKE_LOCK, health.READ_STEPS, health.READ_SLEEP,
health.READ_EXERCISE, ACCESS_NETWORK_STATE, com.google.android.c2dm.permission.RECEIVE,
com.android.vending.BILLING, app.questos.android.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION.
Calendar/Health disclosure and optional runtime access remain; complete Health apps/Health Connect
read-use declarations in Console. No GPS, AD_ID, contacts, microphone, camera or storage permission.
Push plugin is installed but no app remote registration implementation was found; local reminders
are the implemented notification feature. No native-shell/config change requires a new AAB;
remote web updates use the existing HTTPS runtime. VersionCode remains 2.

## N–P. Tests, security and Git

Final results and commit are in the completion response. Required checks: frozen install,
typecheck, Bun tests, production build, source/generated security scan, production Android sync,
billing verification and changed-file ESLint. Preserve RLS/profile authority, UUIDs, account
isolation, AI quotas, cancellation/refund/idempotency and historical billing tests. Scan reviewer
password/account credentials against tracked source and public/native assets without printing them.
No service-account JSON, key, signing password or reviewer credential is committed. No new migration.

## Q. Only owner facts/actions remaining

1. Supply the exact legal operator name so it can be inserted and deployed; do not invent an entity.
2. Privately copy dedicated reviewer credentials into App content → App access; paste instructions
   from `reviewer-access.md`. No real purchase needed for premium-feature review.
3. Upload the finished feature graphic, genuine Android captures (see `screenshots/README.md`) and
   the existing icon through Store presence → Default store listing. Paste prepared listing text
   and contact details because Google's no-review commit option is rejected.
4. Attest/submission only: App content → Privacy policy; Ads No; Target audience 13–15/16–17/18+;
   content rating per section I; Data Safety per D; Health apps/Health Connect for optional
   steps/sleep/exercise personal progress. No medical diagnosis/treatment claims.
5. Check actual Dashboard setup badges, Store settings Productivity, developer verification and
   payments/merchant prerequisites. Supply legal/address/bank/tax facts only if Console requires
   them. Do not create duplicate billing products or claim these unseen cards are incomplete.

Ongoing operational duties: monitor deletion/support email, fulfill valid provider requests and
maintain reviewer access. Those are not accomplished by a one-time form submission.

## R. Play setup readiness

13+ audience and limited-scope AI applicability are resolved at the preparation level; the earlier
under-13/reporting blockers are removed. Technical runtime/billing checks do not certify Google
approval. Legal identity, asset upload confirmations, privately supplied review login, owner attestations and
unobserved Console verification tasks remain before public-release setup is complete. Final assets
and exact dashboard fields are recorded in `play-console-final-checklist.md`.
Do not publish Production automatically.
