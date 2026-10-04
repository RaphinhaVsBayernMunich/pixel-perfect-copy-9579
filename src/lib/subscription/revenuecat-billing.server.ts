import { fetchRevenueCatSubscriber } from "./revenuecat-http.server";
import { parseRevenueCatRecords } from "./revenuecat-contracts";
import "@tanstack/react-start/server-only";
import { z } from "zod";
import { billingDb, configuredBillingEnvironment, getBillingSnapshot } from "./billing-db.server";
import { billingEvent, type BillingEvent } from "./billing-contracts";
export async function revenueCatSnapshot(
  userId: string,
  eventId: string,
  eventAt: string,
): Promise<BillingEvent[]> {
  z.string().uuid().parse(userId);
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) throw new Error("Native billing verification is not configured");
  const payload = await fetchRevenueCatSubscriber(userId, key);
  const env = configuredBillingEnvironment();
  const events = parseRevenueCatRecords(payload, { userId, eventId, eventAt, env });
  const { error } = await billingDb
    .from("billing_accounts")
    .upsert(
      { user_id: userId, provider: "revenuecat", environment: env, customer_id: userId },
      { onConflict: "user_id,provider,environment" },
    );
  if (error) throw new Error("Billing ownership persistence failed");
  const { data: existing, error: lookupError } = await billingDb
    .from("billing_subscriptions")
    .select("subscription_id,product_id,paid_until")
    .eq("user_id", userId)
    .eq("provider", "revenuecat")
    .eq("environment", env);
  if (lookupError) throw new Error("Native billing lookup failed");
  for (const old of existing ?? []) {
    if (events.some((e) => e.subscriptionId === old.subscription_id)) continue;
    events.push(
      billingEvent.parse({
        provider: "revenuecat",
        environment: env,
        eventId: `${eventId}:${userId}:revoke:${old.subscription_id}`,
        eventAt,
        userId,
        customerId: userId,
        subscriptionId: old.subscription_id,
        productId: old.product_id,
        status: "revoked",
        paidUntil: old.paid_until,
        failureSince: null,
        cancelAtPeriodEnd: true,
      }),
    );
  }
  return events;
}
export async function applyRevenueCatBatch(events: BillingEvent[]) {
  const { error } = await billingDb.rpc("apply_billing_batch", { _events: events });
  if (error) throw new Error("Native billing persistence failed");
}
export async function reconcileRevenueCatUser(userId: string) {
  await applyRevenueCatBatch(
    await revenueCatSnapshot(userId, crypto.randomUUID(), new Date().toISOString()),
  );
  return getBillingSnapshot(userId);
}
export const rcWebhook = z.object({
  event: z.object({
    id: z.string().max(100),
    type: z.string(),
    app_id: z.string(),
    event_timestamp_ms: z.number().int().positive(),
    environment: z.enum(["SANDBOX", "PRODUCTION"]).optional(),
    app_user_id: z.string().optional(),
    transferred_from: z.array(z.string()).max(20).optional(),
    transferred_to: z.array(z.string()).max(20).optional(),
  }),
});
export async function handleRevenueCatEvent(payload: unknown) {
  const { event } = rcWebhook.parse(payload);
  if (event.app_id !== process.env.REVENUECAT_APP_ID) throw new Error("Wrong RevenueCat app");
  if (event.type === "TEST") return;
  const env = configuredBillingEnvironment();
  if (event.environment && event.environment !== (env === "live" ? "PRODUCTION" : "SANDBOX"))
    throw new Error("Wrong RevenueCat environment");
  const users =
    event.type === "TRANSFER"
      ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
      : [event.app_user_id];
  const ids = [
    ...new Set(users.filter((id): id is string => !!id && z.string().uuid().safeParse(id).success)),
  ];
  if (!ids.length) throw new Error("No verified account identity");
  const events: BillingEvent[] = [];
  // Fetch both sides first; the batch revokes the source and grants destination atomically.
  for (const id of ids)
    events.push(
      ...(await revenueCatSnapshot(id, event.id, new Date(event.event_timestamp_ms).toISOString())),
    );
  await applyRevenueCatBatch(events);
}
