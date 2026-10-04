import "@tanstack/react-start/server-only";
import Stripe from "stripe";
import { createStripeClient } from "@/lib/stripe.server";
import {
  billingDb,
  configuredBillingEnvironment,
  applyBillingEvent,
  getBillingSnapshot,
} from "./billing-db.server";
import { MONTHLY_PLAN, ANNUAL_PLAN, type BillingEvent } from "./billing-contracts";

export async function monthlyStripePrice() {
  const stripe = createStripeClient(configuredBillingEnvironment());
  const { data } = await stripe.prices.list({
    lookup_keys: [MONTHLY_PLAN],
    active: true,
    limit: 2,
    expand: ["data.product"],
  });
  const price = data[0];
  if (
    data.length !== 1 ||
    !price ||
    price.currency !== "usd" ||
    price.unit_amount !== 299 ||
    price.type !== "recurring" ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.livemode !== (configuredBillingEnvironment() === "live")
  )
    throw new Error(
      "Monthly price is unavailable or differs from the approved $2.99/month. Contact support.",
    );
  if (typeof price.product !== "string" && ("deleted" in price.product || !price.product.active))
    throw new Error("Monthly product is unavailable.");
  return price;
}
export async function stripeCustomer(userId: string, email?: string, create = false) {
  const env = configuredBillingEnvironment();
  const stripe = createStripeClient(env);
  const { data: account, error } = await billingDb
    .from("billing_accounts")
    .select("customer_id")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .eq("environment", env)
    .maybeSingle();
  if (error) throw new Error("Billing account lookup failed");
  let customerId = account?.customer_id as string | undefined;
  if (!customerId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 2,
    });
    if (found.data.length > 1) throw new Error("Multiple billing accounts require support review");
    customerId = found.data[0]?.id;
    if (!customerId && create) {
      const customer = await stripe.customers.create(
        { email, metadata: { userId } },
        { idempotencyKey: `questos-${env}-${userId}` },
      );
      customerId = customer.id;
    }
  }
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (
    customer.deleted ||
    customer.metadata.userId !== userId ||
    customer.livemode !== (env === "live")
  )
    throw new Error("Billing ownership could not be verified");
  const { error: saveError } = await billingDb
    .from("billing_accounts")
    .upsert(
      { user_id: userId, provider: "stripe", environment: env, customer_id: customerId },
      { onConflict: "user_id,provider,environment" },
    );
  if (saveError) throw new Error("Billing account persistence failed");
  return customerId;
}
function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id;
}
function invoiceSubscription(invoice: Stripe.Invoice) {
  return objectId(invoice.parent?.subscription_details?.subscription);
}
async function owner(customerId: string) {
  const env = configuredBillingEnvironment();
  const stripe = createStripeClient(env);
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.metadata.userId || customer.livemode !== (env === "live"))
    throw new Error("Unverified billing customer");
  const userId = customer.metadata.userId;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid owner");
  const { error } = await billingDb
    .from("billing_accounts")
    .upsert(
      { user_id: userId, provider: "stripe", environment: env, customer_id: customerId },
      { onConflict: "user_id,provider,environment" },
    );
  if (error) throw new Error("Billing ownership persistence failed");
  return userId;
}
export async function reconcileStripeSubscription(
  sub: Stripe.Subscription,
  eventId: string,
  eventAt: number,
  revokedThrough?: number,
) {
  const env = configuredBillingEnvironment();
  const customerId = objectId(sub.customer)!;
  const userId = await owner(customerId);
  const items = sub.items.data;
  const item = items[0];
  const plan = item?.price.lookup_key ?? sub.metadata.priceId;
  const monthly = plan === MONTHLY_PLAN;
  if (
    items.length !== 1 ||
    (!monthly && plan !== ANNUAL_PLAN) ||
    item.price.recurring?.interval !== (monthly ? "month" : "year") ||
    item.price.recurring.interval_count !== 1 ||
    sub.livemode !== (env === "live")
  )
    return;
  const stripe = createStripeClient(env);
  // Only a settled paid invoice grants a period. An unpaid renewal period is not paid access.
  const invoices = await stripe.invoices.list({ subscription: sub.id, status: "paid", limit: 10 });
  const paid = invoices.data
    .filter((i) => i.amount_paid > 0)
    .sort((a, b) => b.period_end - a.period_end)[0];
  const paidUntil =
    paid?.lines.data.reduce((end, line) => Math.max(end, line.period.end), paid.period_end) ?? 0;
  let status: BillingEvent["status"] = "expired";
  let failureSince: string | null = null;
  if (paidUntil > 0 && ["active", "canceled"].includes(sub.status) && paidUntil * 1000 > Date.now())
    status = "active";
  if (sub.status === "past_due" && paidUntil > 0) {
    status = "grace";
    failureSince = new Date(paidUntil * 1000).toISOString();
  }
  if (paid) {
    const payments = await stripe.invoicePayments.list({
      invoice: paid.id,
      status: "paid",
      limit: 100,
    });
    if (payments.has_more) throw new Error("Invoice payment history requires support review");
    for (const payment of payments.data) {
      let chargeId = objectId(payment.payment.charge);
      const intentId = objectId(payment.payment.payment_intent);
      if (intentId)
        chargeId = objectId((await stripe.paymentIntents.retrieve(intentId)).latest_charge);
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        if (charge.refunded) status = "revoked";
      }
    }
  }
  if (revokedThrough && revokedThrough >= paidUntil) status = "revoked";
  await applyBillingEvent({
    provider: "stripe",
    environment: env,
    eventId,
    eventAt: new Date(eventAt * 1000).toISOString(),
    userId,
    customerId,
    subscriptionId: sub.id,
    productId: monthly ? MONTHLY_PLAN : ANNUAL_PLAN,
    status,
    paidUntil: new Date(paidUntil * 1000).toISOString(),
    failureSince,
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.status === "canceled",
  });
}
export async function reconcileStripeUser(userId: string) {
  const customer = await stripeCustomer(userId);
  if (!customer) return getBillingSnapshot(userId);
  const stripe = createStripeClient(configuredBillingEnvironment());
  const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
  if (subs.has_more) throw new Error("Billing account requires support reconciliation");
  const now = Math.floor(Date.now() / 1000);
  for (const sub of subs.data)
    await reconcileStripeSubscription(sub, `reconcile-${crypto.randomUUID()}`, now);
  return getBillingSnapshot(userId);
}
export async function handleStripeEvent(event: Stripe.Event) {
  const env = configuredBillingEnvironment();
  if (event.livemode !== (env === "live")) throw new Error("Wrong event environment");
  const stripe = createStripeClient(env);
  let subscriptionId: string | undefined;
  let revokedThrough: number | undefined;
  if (event.type.startsWith("customer.subscription."))
    subscriptionId = (event.data.object as Stripe.Subscription).id;
  else if (event.type.startsWith("invoice."))
    subscriptionId = invoiceSubscription(event.data.object as Stripe.Invoice);
  else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return;
    subscriptionId = objectId(session.subscription);
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    if (!charge.refunded) return;
    // Stripe 2026 charge invoice association is obtained through the payment record.
    const intentId = objectId(charge.payment_intent);
    if (!intentId) throw new Error("Refunded invoice needs manual review");
    const payments = await stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: intentId },
      limit: 10,
    });
    for (const payment of payments.data) {
      const invoice = await stripe.invoices.retrieve(objectId(payment.invoice)!);
      subscriptionId = invoiceSubscription(invoice);
      revokedThrough = invoice.lines.data.reduce(
        (end, line) => Math.max(end, line.period.end),
        invoice.period_end,
      );
      if (subscriptionId) break;
    }
  } else return;
  if (!subscriptionId) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await reconcileStripeSubscription(sub, event.id, event.created, revokedThrough);
}
export function approvedReturnUrl(input: string) {
  const origin = new URL(process.env.APP_ORIGIN ?? "").origin;
  const url = new URL(input);
  if (url.origin !== origin || url.protocol !== "https:")
    throw new Error("Return URL is not allowed");
  return url.toString();
}
