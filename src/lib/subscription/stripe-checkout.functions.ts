import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
const request = z
  .object({
    priceId: z.literal("premium_annual"),
    returnUrl: z.string().url(),
    environment: z.enum(["sandbox", "live"]),
  })
  .strict();
export const getStripeOfferings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { annualStripePrice } = await import("./stripe-billing.server");
      const p = await annualStripePrice();
      return {
        current: [
          {
            identifier: "premium_annual" as const,
            displayName: "Premium — Annual",
            priceString:
              new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency }).format(
                p.unit_amount! / 100,
              ) + " / year",
            period: "annual" as const,
            featured: true,
          },
        ],
      };
    } catch {
      return {
        current: [],
        error: "Annual pricing could not be verified. Please retry or contact support.",
      };
    }
  });
export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => request.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { configuredBillingEnvironment, billingDb, takeBillingRequest } =
        await import("./billing-db.server");
      await takeBillingRequest(context.userId);
      const { reconcileStripeUser } = await import("./stripe-billing.server");
      if (data.environment !== configuredBillingEnvironment()) throw new Error("Wrong environment");
      if ((await reconcileStripeUser(context.userId)).tier === "premium")
        return { error: "Premium is already active. Use Manage subscription." };
      const { annualStripePrice, stripeCustomer, approvedReturnUrl } =
        await import("./stripe-billing.server");
      const { createStripeClient } = await import("@/lib/stripe.server");
      const price = await annualStripePrice();
      const { data: auth, error } = await context.supabase.auth.getUser();
      if (error || !auth.user) throw new Error("Authentication required");
      const customer = await stripeCustomer(context.userId, auth.user.email, true);
      const existing = await createStripeClient(
        configuredBillingEnvironment(),
      ).checkout.sessions.list({ customer: customer!, status: "open", limit: 100 });
      if (existing.has_more) throw new Error("Checkout history requires support review");
      const reusable = existing.data.find(
        (session) =>
          session.metadata?.userId === context.userId &&
          session.metadata?.priceId === "premium_annual" &&
          session.mode === "subscription" &&
          session.client_secret,
      );
      if (reusable?.client_secret) return { clientSecret: reusable.client_secret };
      const { data: keyData, error: keyError } = await billingDb.rpc("billing_checkout_key", {
        _user_id: context.userId,
        _environment: configuredBillingEnvironment(),
      });
      if (keyError) throw new Error("Checkout reservation failed");
      const key = z.object({ key: z.string().uuid(), expiresAt: z.number().int() }).parse(keyData);
      const session = await createStripeClient(
        configuredBillingEnvironment(),
      ).checkout.sessions.create(
        {
          mode: "subscription",
          ui_mode: "embedded_page",
          expires_at: key.expiresAt,
          customer: customer!,
          line_items: [{ price: price.id, quantity: 1 }],
          return_url: approvedReturnUrl(data.returnUrl),
          metadata: { userId: context.userId, priceId: "premium_annual" },
          subscription_data: { metadata: { userId: context.userId, priceId: "premium_annual" } },
        },
        { idempotencyKey: `questos-checkout-${key.key}` },
      );
      if (!session.client_secret) throw new Error("Missing checkout");
      return { clientSecret: session.client_secret };
    } catch {
      return {
        error:
          "Checkout could not start. Verify your account and retry; contact support if this continues.",
      };
    }
  });
export const createStripePortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => request.omit({ priceId: true }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { configuredBillingEnvironment } = await import("./billing-db.server");
      if (data.environment !== configuredBillingEnvironment()) throw new Error("Wrong environment");
      const { stripeCustomer, approvedReturnUrl } = await import("./stripe-billing.server");
      const customer = await stripeCustomer(context.userId);
      if (!customer) return { error: "No web subscription found for this account." };
      const { createStripeClient } = await import("@/lib/stripe.server");
      const portal = await createStripeClient(
        configuredBillingEnvironment(),
      ).billingPortal.sessions.create({ customer, return_url: approvedReturnUrl(data.returnUrl) });
      return { url: portal.url };
    } catch {
      return { error: "Billing management is unavailable. Please retry or contact support." };
    }
  });
export const reconcileBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ provider: z.enum(["stripe", "revenuecat"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { takeBillingRequest } = await import("./billing-db.server");
    await takeBillingRequest(context.userId);
    if (data.provider === "revenuecat") {
      const { reconcileRevenueCatUser } = await import("./revenuecat-billing.server");
      return reconcileRevenueCatUser(context.userId);
    }
    const { reconcileStripeUser } = await import("./stripe-billing.server");
    return reconcileStripeUser(context.userId);
  });
