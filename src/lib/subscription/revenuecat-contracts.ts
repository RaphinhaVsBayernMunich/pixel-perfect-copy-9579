import { z } from "zod";
import { billingEvent, type BillingEvent, isAnnualPlayProduct } from "./billing-contracts";
const rcSubscription = z.object({
  expires_date: z.string().nullable(),
  billing_issues_detected_at: z.string().nullable().optional(),
  is_sandbox: z.boolean(),
  store: z.string(),
  refunded_at: z.string().nullable().optional(),
  unsubscribe_detected_at: z.string().nullable().optional(),
  period_type: z.string().optional(),
  store_transaction_id: z.union([z.string(), z.number()]).nullable().optional(),
});
const customerSchema = z.object({
  subscriber: z.object({
    subscriptions: z.record(rcSubscription),
    entitlements: z.record(z.object({ product_identifier: z.string() })),
  }),
});

export function parseRevenueCatRecords(
  input: unknown,
  context: { userId: string; eventId: string; eventAt: string; env: "live" | "sandbox" },
  now = Date.now(),
): BillingEvent[] {
  const { subscriber } = customerSchema.parse(input);
  const { userId, eventId, eventAt, env } = context;
  const events: BillingEvent[] = [];
  for (const [product, sub] of Object.entries(subscriber.subscriptions)) {
    if (
      !isAnnualPlayProduct(product) ||
      sub.store !== "play_store" ||
      sub.is_sandbox !== (env === "sandbox") ||
      !sub.expires_date
    )
      continue;
    if (!sub.store_transaction_id)
      throw new Error("Store receipt identity is unavailable; contact support");
    const transaction = String(sub.store_transaction_id).split("..")[0];
    if (!/^GPA\.[0-9-]+$/.test(transaction)) throw new Error("Invalid Play receipt identity");
    const entitled = subscriber.entitlements.premium?.product_identifier === product;
    let status: BillingEvent["status"] =
      entitled && Date.parse(sub.expires_date) > now ? "active" : "expired";
    let failureSince: string | null = null;
    if (sub.billing_issues_detected_at && sub.period_type !== "trial") {
      status = "grace";
      failureSince = sub.billing_issues_detected_at;
    }
    if (sub.refunded_at) status = "revoked";
    // Trials must be app-managed; store offers cannot grant a second trial.
    if (sub.period_type === "trial") status = "expired";
    events.push(
      billingEvent.parse({
        provider: "revenuecat",
        environment: env,
        eventId: `${eventId}:${userId}:${product}`,
        eventAt,
        userId,
        customerId: userId,
        subscriptionId: transaction,
        productId: product,
        status,
        paidUntil: sub.expires_date,
        failureSince,
        cancelAtPeriodEnd: !!sub.unsubscribe_detected_at,
      }),
    );
  }

  return events;
}
