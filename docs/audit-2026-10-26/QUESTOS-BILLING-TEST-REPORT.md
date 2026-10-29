# Billing verification

## Verified configuration

`bun run billing:verify`: **10/10 PASS**. Checks cover canonical IDs/runtime, secret scan, live Supabase authority (rollback), production health, server configuration, Cloudflare secret presence, Google APIs/service account, RTDN topic/publisher, Play monthly product and RevenueCat mapping.

Preserved mapping:

`questos_premium_monthly:monthly -> premium`

`default -> $rc_monthly -> questos_premium_monthly:monthly`

RTDN topic: `projects/questos-510417/topics/questos-revenuecat`.

Historical annual receipt parsing remains supported; no product/price/offering/key changes were made. Trial remains app-managed and separate from paid subscription state. Invalid/unauthenticated webhook requests are rejected by the live endpoint.

## Automated contract coverage

Unit/database tests exercise receipt parsing, environment separation, entitlement expiry/revocation, event idempotency and account authority. These are simulated inputs and transaction tests, **not real Google Play purchases or provider webhook delivery**.

## External verification gap

The owner signed into a license-test Google account on the emulator. No sandbox purchase was executed. Renewal, cancellation, refund, grace, expiry, restore and lifecycle-triggered RTDN/webhook delivery remain unverified in this audit.

Production intentionally filters sandbox receipts (`is_sandbox` must match backend environment). Do not weaken that filter or switch the production Worker to sandbox. A full entitlement lifecycle test requires an isolated sandbox backend/database configuration plus a licensed test installation and test payment methods. Verify the Play purchase sheet explicitly identifies a test payment instrument before proceeding; never use a real card.

Catalog readiness is PASS. End-to-end store lifecycle readiness is BLOCKED, not 10/10 purchase success.
