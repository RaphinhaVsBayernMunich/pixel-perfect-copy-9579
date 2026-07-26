/**
 * Stripe webhook — authoritative purchase state feed for the web billing
 * path. Mirrors the shape of the RevenueCat webhook so entitlement state
 * on the `profiles` table stays consistent regardless of provider.
 *
 * Endpoint: /api/public/payments/webhook?env=sandbox|live
 * Signature: Stripe-Signature header verified via verifyWebhook().
 */
import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

async function handle(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const nowIso = new Date().toISOString();

  async function findUserIdByCustomer(customerId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;

    // Fall back to Stripe: customer metadata.userId.
    try {
      const stripe = createStripeClient(env);
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !("deleted" in customer)) {
        const uid = (customer.metadata as any)?.userId;
        if (uid) {
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: customerId } as any)
            .eq("user_id", uid);
          return uid;
        }
      }
    } catch (e) {
      console.warn("findUserIdByCustomer: Stripe lookup failed", e);
    }
    return null;
  }

  async function logEvent(userId: string, kind: string, productId: string | null, entitlement: "free" | "premium", metadata: Record<string, unknown>) {
    try {
      await supabaseAdmin.from("subscription_events").insert({
        user_id: userId,
        kind,
        source: "stripe",
        product_id: productId,
        entitlement,
        metadata,
      } as any);
    } catch (e) {
      console.warn("subscription_events insert failed", e);
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId ?? (session.customer ? await findUserIdByCustomer(session.customer) : null);
      if (!userId) break;
      if (session.customer) {
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: session.customer } as any)
          .eq("user_id", userId);
      }
      // For one-off payments we're done; subscriptions get their state from
      // customer.subscription.created below.
      if (session.mode === "payment") {
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "premium",
            entitlement: "premium",
            current_plan: session.metadata?.priceId ?? "premium_annual",
            last_verification: nowIso,
          } as any)
          .eq("user_id", userId);
      }
      await logEvent(userId, "checkout_completed", session.metadata?.priceId ?? null, "premium", {
        session_id: session.id,
        mode: session.mode,
      });
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = sub.metadata?.userId ?? (sub.customer ? await findUserIdByCustomer(sub.customer) : null);
      if (!userId) break;

      const item = sub.items?.data?.[0];
      const priceId = item?.price?.lookup_key ?? sub.metadata?.priceId ?? item?.price?.id ?? "premium_annual";
      const periodEnd = item?.current_period_end ?? sub.current_period_end;
      const expiration = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

      const isActive = ["active", "trialing", "past_due"].includes(sub.status);
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: isActive ? "premium" : sub.status === "canceled" ? "expired" : "free",
          entitlement: isActive ? "premium" : "free",
          current_plan: priceId,
          premium_expiration: expiration,
          stripe_customer_id: sub.customer,
          last_verification: nowIso,
        } as any)
        .eq("user_id", userId);
      await logEvent(userId, event.type.replace("customer.subscription.", "subscription_"), priceId, isActive ? "premium" : "free", {
        subscription_id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata?.userId ?? (sub.customer ? await findUserIdByCustomer(sub.customer) : null);
      if (!userId) break;
      const item = sub.items?.data?.[0];
      const priceId = item?.price?.lookup_key ?? sub.metadata?.priceId ?? null;
      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "expired",
          entitlement: "free",
          current_plan: "free",
          last_verification: nowIso,
        } as any)
        .eq("user_id", userId);
      await logEvent(userId, "subscription_deleted", priceId, "free", { subscription_id: sub.id });
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object;
      const userId = inv.customer ? await findUserIdByCustomer(inv.customer) : null;
      if (!userId) break;
      await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "expired", last_verification: nowIso } as any)
        .eq("user_id", userId);
      await logEvent(userId, "invoice_payment_failed", null, "free", { invoice_id: inv.id });
      break;
    }

    default:
      // Ignore unhandled events but 200 so Stripe stops retrying.
      break;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Stripe webhook: invalid env query parameter", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handle(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Stripe webhook error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
