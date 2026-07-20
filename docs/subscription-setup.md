# QuestOS — Subscription & Native Android Setup

QuestOS ships as **one codebase** that produces both the web app (Cloudflare
Workers via TanStack Start) and a native Android app (Capacitor + Google
Play Billing). RevenueCat is the single source of truth for paid
entitlements.

```
┌──────────── UI (feature gates via usePremium / <PremiumGate>) ────────────┐
│                                                                          │
│              SubscriptionService (src/lib/subscription/service.ts)       │
│                     │                     │                              │
│               WebProvider          NativeProvider (RevenueCat SDK)       │
│                     │                     │                              │
│         Web checkout │           Google Play Billing                     │
│                     │                     │                              │
└────────── Backend truth: profiles + subscription_events (Supabase) ──────┘
                            ▲
                            │  RevenueCat webhook
                            │  /api/public/revenuecat-webhook
```

The app never imports RevenueCat or Stripe directly. Every premium check
goes through `usePremium("feature.key")` or `<PremiumGate feature="…">`.

---

## 1. Architecture at a glance

| Layer | File | Purpose |
| --- | --- | --- |
| Types & feature catalog | `src/lib/subscription/types.ts` | `PremiumFeature` enum, `SubscriptionProvider` interface. |
| Plan catalog | `src/lib/subscription/plans.ts` | Add plans here — one entry per store SKU. |
| Web provider | `src/lib/subscription/provider-web.ts` | Reads plan catalog, defers checkout to server. |
| Native provider | `src/lib/subscription/provider-native.ts` | RevenueCat + Play Billing via `@revenuecat/purchases-capacitor`. |
| Service / store | `src/lib/subscription/service.ts` | Chooses provider, mirrors backend state, exposes hooks. |
| Server functions | `src/lib/subscription/subscription.functions.ts` | `getSubscription`, `startTrial`, `listSubscriptionEvents`. |
| Install fingerprint | `src/lib/subscription/install-id.ts` | Policy-compliant per-install identifier. |
| Webhook | `src/routes/api/public/revenuecat-webhook.ts` | Signed handler that writes purchase state. |
| Paywall | `src/components/subscription/paywall.tsx` | The upsell dialog. |
| Gates | `src/components/subscription/premium-gate.tsx` | Wraps premium capabilities. |
| Settings section | `src/components/subscription/subscription-section.tsx` | Rendered on the Profile page. |

### App-managed 7-day trial

- Every new user gets `subscription_status = 'trial'`, `entitlement = 'premium'`, `trial_end = now + 7d` via the `on_auth_user_created` trigger.
- `startTrial` (server fn) is called on every app boot after auth. It is
  idempotent, backend-authoritative, and enforces the abuse-prevention
  rules against the `installations` table.
- When `now > trial_end`, `getSubscription` transitions the user to
  `expired` / `entitlement = 'free'` server-side and logs a
  `trial_expired` event.
- No user data is deleted. Free users keep quests, calendar, XP, Legacy,
  Cloud Sync, and Resume/Portfolio.

### Trial abuse prevention

- Web: random UUID in `localStorage` (best-effort — obviously wipeable).
- Android: `@capacitor/device` `identifier` returns SSAID, which is
  per-app-signing-key and Play-policy-safe. Combined with
  `@capacitor/preferences` persistence.
- Fingerprint is **hashed server-side** with a stable pepper
  (`INSTALL_FINGERPRINT_PEPPER`) before storage. The DB never sees raw
  device identifiers.
- If an install already consumed a trial via a different user account,
  a new user on the same install is denied a fresh trial and lands in
  `free` immediately.
- 100% abuse prevention is impossible without a payment method on
  file; factory reset rotates the SSAID. This is accepted.

---

## 2. Environment variables

Add to `.env` (or Lovable secrets — server-only vars must NOT be prefixed
with `VITE_`).

```
# --- client-side (safe to expose) -----------------------------------------
VITE_REVENUECAT_ANDROID_KEY=goog_...              # RevenueCat "public SDK key" for Android

# --- server-side ----------------------------------------------------------
REVENUECAT_WEBHOOK_AUTH=<shared secret>           # matches RC dashboard → Integrations → Webhook → Authorization header
INSTALL_FINGERPRINT_PEPPER=<random 32+ chars>     # rotate any time; only affects future installs
```

Generate the webhook shared secret yourself (e.g. `openssl rand -hex 32`)
and paste the **same value** into:
1. RevenueCat dashboard → Project → Integrations → Webhook → Authorization
   header value.
2. Lovable secret `REVENUECAT_WEBHOOK_AUTH`.

---

## 3. RevenueCat dashboard setup

1. Create a project. Attach the **Google Play** app (package
   `app.questos.android`).
2. Upload your Play Console service-account JSON for real-time subscription
   status.
3. Create products:
   - `questos_premium_annual` — auto-renewing annual subscription.
   - (later) `questos_premium_monthly`, `questos_premium_lifetime`, etc.
   The `productId`s **must** match `PLANS` in `plans.ts`.
4. Create an entitlement: **id = `premium`**, attach every premium product.
5. Create an offering: **id = `default`**, attach the packages.
6. Integrations → Webhook:
   - URL: `https://project--<project-id>.lovable.app/api/public/revenuecat-webhook`
     (published) — or `-dev.lovable.app` for staging.
   - Authorization header: `Bearer <same value as REVENUECAT_WEBHOOK_AUTH>`.

The webhook writes to `profiles.subscription_status`,
`profiles.entitlement`, `profiles.premium_expiration`, and appends to
`subscription_events`.

---

## 4. Google Play Console setup

1. Create the app — package name `app.questos.android`. Match this in
   `capacitor.config.ts`.
2. Set up billing:
   - App content → Financial features / Data safety.
   - Monetize → Subscriptions → create **QuestOS Premium** with a base
     plan `annual` at $19.99/yr. Localized pricing enabled by default.
3. **Do not** configure a free trial in Play — QuestOS runs its own
   app-managed 7-day trial.
4. Add license testers under Setup → License testing so purchases can be
   verified without real money.
5. Upload a signed AAB to an internal testing track.

---

## 5. Building the Android app (do this locally)

You need Android Studio (Giraffe or newer) and JDK 17.

```bash
# 1. Add the Android platform (first time only)
bunx cap add android

# 2. Build the web bundle
bun run build

# 3. Sync web assets + plugins into android/
bunx cap sync android

# 4. Open Android Studio and run
bunx cap open android
```

In `android/app/build.gradle`, confirm:
- `applicationId "app.questos.android"`
- `minSdkVersion 24` (RevenueCat requirement)
- Signing config for release.

For push notifications, add your `google-services.json` to
`android/app/`.

For deep links, edit `android/app/src/main/AndroidManifest.xml` and add
`<intent-filter>` entries mapping `https://questos.app/*` back to
`MainActivity`.

---

## 6. Adding future plans

1. Create the SKU in Play Console and add it to the `premium` entitlement
   in RevenueCat.
2. Append a `PlanDef` entry in `src/lib/subscription/plans.ts`.
3. Ship. The paywall auto-renders it; no other code changes.

---

## 7. Adding a new premium feature

1. Add the key to `PremiumFeature` and `PREMIUM_FEATURES` in
   `src/lib/subscription/types.ts`.
2. Wrap the UI with `<PremiumGate feature="your.new.key">…</PremiumGate>`.
3. For server-enforced APIs, check
   `has_active_premium(auth.uid())` (Postgres function, service-role-only)
   or query the profile row inside a `requireSupabaseAuth` server function.

That's the entire surface. No billing-provider code changes required.
