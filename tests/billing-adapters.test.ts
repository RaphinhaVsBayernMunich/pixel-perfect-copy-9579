import { test, expect } from "bun:test";
import Stripe from "stripe";
import { verifyWebhook } from "../src/lib/stripe.server";
import { parseRevenueCatRecords } from "../src/lib/subscription/revenuecat-contracts";
const now = Date.parse("2026-10-01T12:00:00Z");
const stamp = (days: number) => new Date(now + days * 86400000).toISOString();
const context = {
  userId: "10000000-0000-4000-8000-000000000001",
  eventId: "event_1",
  eventAt: stamp(0),
  env: "sandbox" as const,
};
function receipt(changes: Record<string, unknown> = {}) {
  return {
    subscriber: {
      entitlements: { premium: { product_identifier: "questos_premium_monthly:monthly" } },
      subscriptions: {
        "questos_premium_monthly:monthly": {
          expires_date: stamp(30),
          is_sandbox: true,
          store: "play_store",
          period_type: "normal",
          store_transaction_id: "GPA.6801-7988-0152-76034..5",
          ...changes,
        },
      },
    },
  };
}
test("Stripe verifies the signed raw body and rejects changed payloads or wrong environment secrets", async () => {
  const previous = process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
  process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = "test_signature_secret";
  try {
    const body = JSON.stringify({
      id: "evt_local",
      object: "event",
      type: "invoice.paid",
      data: { object: {} },
    });
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload: body,
      secret: "test_signature_secret",
    });
    const req = (payload: string) =>
      new Request("https://example.invalid/webhook", {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: payload,
      });
    expect((await verifyWebhook(req(body), "sandbox")).id).toBe("evt_local");
    await expect(verifyWebhook(req(body + " "), "sandbox")).rejects.toThrow();
    process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = "different";
    await expect(verifyWebhook(req(body), "sandbox")).rejects.toThrow();
  } finally {
    if (previous === undefined) delete process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
    else process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET = previous;
  }
});
test("native monthly receipt uses stable Play order identity across renewal suffixes", () => {
  const first = parseRevenueCatRecords(receipt(), context, now)[0];
  const next = parseRevenueCatRecords(
    receipt({ store_transaction_id: "GPA.6801-7988-0152-76034..6" }),
    context,
    now,
  )[0];
  expect(first.status).toBe("active");
  expect(next.subscriptionId).toBe(first.subscriptionId);
});
test("native sandbox receipts never grant live access; non-Play and lifetime entries do not grant", () => {
  expect(parseRevenueCatRecords(receipt(), { ...context, env: "live" }, now)).toHaveLength(0);
  expect(parseRevenueCatRecords(receipt({ store: "app_store" }), context, now)).toHaveLength(0);
  expect(parseRevenueCatRecords(receipt({ expires_date: null }), context, now)).toHaveLength(0);
});
test("native trial cannot start paid grace; refund overrides cancellation and future expiry", () => {
  expect(
    parseRevenueCatRecords(
      receipt({ period_type: "trial", billing_issues_detected_at: stamp(-1) }),
      context,
      now,
    )[0].status,
  ).toBe("expired");
  const refunded = parseRevenueCatRecords(
    receipt({ refunded_at: stamp(0), unsubscribe_detected_at: stamp(0) }),
    context,
    now,
  )[0];
  expect(refunded.status).toBe("revoked");
  expect(refunded.cancelAtPeriodEnd).toBe(true);
});
test("native paid failure keeps its original failure timestamp", () => {
  const item = parseRevenueCatRecords(
    receipt({ expires_date: stamp(-1), billing_issues_detected_at: stamp(-1) }),
    context,
    now,
  )[0];
  expect(item.status).toBe("grace");
  expect(item.failureSince).toBe(stamp(-1));
});
test("native missing or malformed receipt identity fails closed", () => {
  for (const id of [null, "fake"])
    expect(() =>
      parseRevenueCatRecords(receipt({ store_transaction_id: id }), context, now),
    ).toThrow();
});

test("internal Stripe plan ID cannot be accepted as a Google Play receipt", () => {
  const data = receipt();
  data.subscriber.entitlements.premium.product_identifier = "premium_annual";
  const subscriptions = data.subscriber.subscriptions as Record<string, unknown>;
  subscriptions.premium_annual = subscriptions["questos_premium_monthly:monthly"];
  delete subscriptions["questos_premium_monthly:monthly"];
  expect(parseRevenueCatRecords(data, context, now)).toHaveLength(0);
});

test("historical annual receipts remain verified without appearing in new monthly offerings", () => {
  const historical = JSON.parse(
    JSON.stringify(receipt()).replaceAll(
      "questos_premium_monthly:monthly",
      "questos_premium_annual:annual",
    ),
  );
  expect(parseRevenueCatRecords(historical, context, now)[0].productId).toBe(
    "questos_premium_annual:annual",
  );
});
