/**
 * Server functions for Stripe web checkout & billing portal. Keeps the
 * SubscriptionProvider abstraction intact — the web provider only ever
 * calls these, never the Stripe SDK directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

const envSchema = z.enum(["sandbox", "live"]);
const priceIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/);

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  supabase: SupabaseClient<Database>,
  userId: string,
  email?: string,
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");

  // 1. Try the profile's cached stripe_customer_id first.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()
    .throwOnError();
  if (profile?.stripe_customer_id) {
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    if (customer.deleted || customer.metadata.userId !== userId) {
      throw new Error("Billing account ownership could not be verified. Contact support.");
    }
    return customer.id;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  async function saveCustomer(customerId: string) {
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId)
      .select("user_id")
      .single()
      .throwOnError();
  }

  // 2. Search Stripe by userId metadata.
  const byMeta = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });
  if (byMeta.data.length) {
    await saveCustomer(byMeta.data[0].id);
    return byMeta.data[0].id;
  }

  // Email equality alone is not proof of ownership. Never reassign another customer.

  // 4. Create.
  const created = await stripe.customers.create({
    ...(email && { email }),
    metadata: { userId },
  });
  await saveCustomer(created.id);
  return created.id;
}

// ---- createStripeCheckout -------------------------------------------------

export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        priceId: priceIdSchema,
        returnUrl: z.string().url(),
        environment: envSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) return { error: `Price not found: ${data.priceId}` };
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveOrCreateCustomer(
        stripe,
        supabase,
        userId,
        user?.email ?? undefined,
      );

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, priceId: data.priceId },
        ...(isRecurring && {
          subscription_data: { metadata: { userId, priceId: data.priceId } },
        }),
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createStripeCheckout failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

// ---- createStripePortal ---------------------------------------------------

export const createStripePortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ returnUrl: z.string().url(), environment: envSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PortalResult> => {
    try {
      const { supabase, userId } = context;
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .single()
        .throwOnError();
      if (!profile?.stripe_customer_id) {
        return { error: "No Stripe customer on file. Purchase a plan first." };
      }
      const stripe = createStripeClient(data.environment);
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (customer.deleted || customer.metadata.userId !== userId) {
        return { error: "Billing account ownership could not be verified. Contact support." };
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      console.error("createStripePortal failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });
