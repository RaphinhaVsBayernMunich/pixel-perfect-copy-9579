# QuestOS final Console automation pass — 12 October 2026

Owner: Oryxion. Package: `app.questos.android`. Data Safety is **completed, owner-reported**;
its saved answers/review status are not exposed by the authenticated APIs used here.
No policy declaration, tester change, app review submission or Production release was performed.

## Authenticated current state and automation result

| Item                    | Observed result                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durable English listing | Title QuestOS only; no short/full description returned.                                                                                             |
| Durable assets          | Icon 0, feature graphic 0, phone screenshots 0, tablet screenshots 0.                                                                               |
| App details             | Default language en-US; contact email/website absent from returned details. Category is not exposed by AppDetails.                                  |
| Releases                | Internal completed versionCode 2; Production/beta/alpha have no releases. Tester configuration untouched.                                           |
| Upload attempt          | Supported API staged/verified 1 icon, 1 feature graphic and 5 phone screenshots in documented order. Listing and contact fields also staged.        |
| Commit                  | HTTP 400 with changesNotSentForReview/review hint. The no-review safeguard was retained; no alternate commit attempted. Own temporary edit deleted. |
| Fresh readback          | Title only and zero graphics unchanged. No durable upload or metadata update is claimed.                                                            |

`scripts/play-listing.mjs --apply` now supports these existing assets, checks manifest hashes before
staging and API-returned hashes/order afterward, avoids duplicates and refuses to replace different
owner graphics. It preserves existing contact phone/languages and does not write tracks/testers.
Only a `changesNotSentForReview=true` commit is permitted; failures discard its own edit.
Do not remove that safeguard to force an API commit.

Supported scope: listing text/images, contact details, tracks/bundles and subscriptions are observable.
Category, app-content completion badges, IARC answers/certificate, developer/payment verification,
Monetization Setup UI availability and Play's saved RTDN field are not exposed by these resources.
The AppStoreAppsReview resource concerns app-store review submissions; it is not a substitute
for consumer-app Console policy declarations. No speculative or undocumented endpoints are used.

## Owner Console values and attestation boundary

Except Data Safety, completion of these forms is **unverified**, not asserted incomplete.
Perform the actions below only for missing/inaccurate cards. Paths may appear under Policy/
Monitor & Improve in a newer Console navigation instead of Policy and programs.

| Console path                                                         | Exact prepared selection/value                                                                                                                                                                                                                                                                                  | Requirement / why manual                                                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grow users → Store presence → Main store listing → en-US             | QuestOS; short/full text from `play-listing-copy-ready.md`; `questos-icon-512.png`, `questos-feature-graphic.png`, screenshots 01–05 in `screenshots/README.md` order.                                                                                                                                          | Required listing/assets; API's guarded commit rejected. Save draft, do not send for review.                                                                                            |
| Grow users → Store presence → Store settings                         | App; Productivity; founder@oryxion.net; https://questos.questos-1fd92776.workers.dev.                                                                                                                                                                                                                           | Category Console-only in available API; contact API write blocked with edit. No invented phone/tags.                                                                                   |
| Policy and programs → App content → Target audience and content      | **13–15, 16–17, 18 and over** only. Exclude **5 and under, 6–8, 9–12**; do not restrict all minors.                                                                                                                                                                                                             | Required owner attestation; no supported status/write operation used.                                                                                                                  |
| App content → Content ratings                                        | Founder email; productivity/utility / All other app types where offered. Authored violence, sex/nudity, profanity, horror, gambling, drugs/alcohol: No. Betting/paid random loot: No. Digital purchases: Yes. Public user exchange/messaging/profile/location sharing and ads: No. AI generation: Yes if asked. | Required branched IARC attestation; actual rating assigned by IARC, never invented. Private journal is not public UGC. No universal future-AI safety guarantee.                        |
| App content → Ads                                                    | No, my app does not contain ads.                                                                                                                                                                                                                                                                                | Required owner declaration; paywall is not advertising.                                                                                                                                |
| App content → App access                                             | All or some functionality is restricted; QuestOS email/password and premium-feature review. Enter private reviewer fields and `reviewer-access.md` instructions.                                                                                                                                                | Required due login; credentials never public. Prepared account verified, saved Console entry unobservable.                                                                             |
| App content → Privacy policy                                         | https://questos.questos-1fd92776.workers.dev/legal/privacy                                                                                                                                                                                                                                                      | Required; live page ready, saved form status unobservable.                                                                                                                             |
| App content → Data safety                                            | Already completed by owner. Account URL `/legal/delete-account`; partial answer YES, data URL `/legal/delete-data` on the production origin.                                                                                                                                                                    | No resubmission. Confirm saved URLs only if uncertain; do not replace owner attestations.                                                                                              |
| App content → Health apps; Health Connect declarations when shown    | Optional steps/exercise and sleep totals for personal progress. Applicable categories Activity and Fitness / Sleep Management; read steps, sleep and exercise only. No diagnosis, treatment, medical device or research claim.                                                                                  | Required for health data access, even in a productivity app; owner must review actual branched form/permission purposes. Do not select no health access.                               |
| App content → Financial features                                     | My app doesn't provide any financial features.                                                                                                                                                                                                                                                                  | Required declaration for release tracks where applicable. XP has no cash redemption; subscription checkout is not banking, wallet, lending or investment functionality. Owner attests. |
| App content → Advertising ID, if shown                               | No Advertising ID use.                                                                                                                                                                                                                                                                                          | Conditional card; no AD_ID permission/collection implementation. Owner verifies displayed request.                                                                                     |
| Dashboard / Policy status / Publishing overview                      | Inspect any other required card; do not infer government/news/VPN/accessibility declarations or verification facts from absent APIs.                                                                                                                                                                            | Account-specific Google requirements, saved status and policy decisions unobservable.                                                                                                  |
| Developer account → Account details / Verification; payments profile | Oryxion where operator identity is required; actual address, jurisdiction, identity/banking/tax facts supplied privately by owner.                                                                                                                                                                              | External identity/payment verification; no invented facts or legal attestation.                                                                                                        |

Audience documentation and prepared values remain consistent with those three groups and no under-13
groups. The content-rating answers are grounded in implemented content, not an invented IARC rating.

## Monetization, RevenueCat and RTDN

- Subscription API is accessible: monthly base plan ACTIVE, P1M, US $2.99; no stacked store trial.
- RevenueCat catalog verification passes: `questos_premium_monthly:monthly` → `premium`,
  `default` → `$rc_monthly` → canonical monthly product; Android app matches `app.questos.android`.
- Historical annual receipt support preserved; annual base plan inactive for new purchases.
- Monetization Setup Console screen access is **unobservable**; API product access does not prove it.
- Topic `projects/questos-510417/topics/questos-revenuecat` exists; Play publisher IAM verified.
- Existing subscription `projects/questos-510417/subscriptions/RevenueCat-Subscriber-app2a0b484e6e`
  points to that topic and has push delivery configured, ack deadline 600 seconds, no filter.
  No subscription was created/changed in this pass. This replaces earlier empty-subscription observations.
- RevenueCat webhook list HTTP 200: one matching `whintgr2a29343fbd`, Android app
  `app2a0b484e6e`, production Worker URL, all environments (`null`). Secret fields never emitted.
- Production app/billing health HTTP 200; webhook unauthenticated POST 401; synthetic authenticated
  TEST and duplicate TEST both 200. These are direct tests, not RevenueCat-originated delivery.
- Play saved RTDN topic/test-send result and RevenueCat Last received/provider delivery remain
  unverified. Do not infer them from the subscriber, webhook configuration or billing 10/10.
- Temporary “QuestOS temporary integration setup” key: notes require revocation; not persisted locally
  or in Cloudflare. Current revocation cannot be confirmed through available supported authenticated
  operations. Dashboard: QuestOS project → API keys → Secret API keys → that exact key → Revoke/Delete
  if still present. Preserve the permanent V1 subscriber key and V2 catalog key.

## Checks and release artifact

- Typecheck passed; `bun test`: 98 passed, 0 failed, 492 assertions, 16 files.
- Privacy, account deletion and selected-data deletion public URLs each return HTTP 200.
- Production build passed; existing deprecation/bundler warnings are nonblocking.
- Production Android sync passed after retry with permitted network access; initial restricted
  DNS attempt failed, with no application/config change needed.
- Final security scan: 471 text files, zero findings.
- Changed-file ESLint (`scripts/play-listing.mjs`) passed.
- `bun run billing:verify`: 10/10 CONFIG READY. Private reviewer verification passed: password
  login/server user/Premium trial/expiry match, credential leaks zero; only checker session ended.
- Existing release AAB: signed, 466 entries verified, owner certificate matches; bundletool validation passed.
- AAB SHA256: `9D6228D51D39818F9BE06569B639AF219DE801B7AA3C19CDF73CE51FC7314033`.
- VersionCode 2, versionName 1.0.0; no native/client release changes. **NO REBUILD/REUPLOAD REQUIRED**.
- AAB: `C:\pixel-perfect-copy-9579\android\app\build\outputs\bundle\release\app-release.aab`.
- No Worker redeploy needed: only owner tooling/docs changed; existing production is healthy.

## Exact owner actions left — in order

1. **Main store listing:** paste prepared text and upload icon, feature graphic and phone screenshots
   01–05. **Store settings:** App / Productivity, founder@oryxion.net, production website. Save drafts;
   do not press Send for review. The API cannot safely persist this edit in the current state.
2. **App content:** finish only missing cards using the table above: audience, IARC rating, Ads No,
   private App access, privacy, health/Health Connect and financial No. Data Safety is already completed;
   check its saved account/data URLs if necessary. Owner must make the attestations.
3. **Dashboard / Policy status / Publishing overview:** resolve actual missing setup and identity/
   payment cards using real Oryxion facts. Google review/verification and production eligibility are
   external; no current blocker badges can be diagnosed through the available API audit.
4. **Monetize → Monetization setup → RTDN:** confirm the existing topic above is saved; send a test
   if receipt has not been confirmed. **RevenueCat → QuestOS → Apps → Android → Google notifications:**
   inspect Last received/test receipt. **Integrations → QuestOS Production webhook:** inspect actual
   provider test delivery. Do not recreate the existing topic/subscriber/webhook.
5. **RevenueCat → QuestOS → API keys → Secret API keys:** revoke only the temporary integration
   setup key if it still exists. Leave both permanent verification keys intact.

Separate later validation: owner-authorized Play-installed purchase/restore/refund lifecycle test;
none performed automatically. No tester configuration changes are needed or authorized in this pass.
Technically ready for these owner steps, but **not confirmed ready for final Play submission** until
the listing is saved and required Console cards/verification are complete. No Google approval claimed.

References: [safe edit commit](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit),
[image upload](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.images/upload),
[AppDetails fields](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.details),
[financial declaration](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en),
[health declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en),
[RevenueCat RTDN](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications),
[RevenueCat API keys](https://www.revenuecat.com/docs/projects/authentication).
