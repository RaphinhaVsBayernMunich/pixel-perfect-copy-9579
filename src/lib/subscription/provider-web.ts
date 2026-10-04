/**
 * Web subscription provider — Stripe Embedded Checkout.
 *
 * The provider intentionally never renders UI; it hands a `clientSecret`
 * back through the returned error object's discriminator, and the
 * subscription store forwards it to the Paywall which mounts the
 * <EmbeddedCheckoutProvider>. That keeps `SubscriptionProvider` a pure
 * data contract shared with the native RevenueCat provider.
 */
import type { Entitlement, Offerings, PlanId, PurchaseResult, SubscriptionProvider } from "./types";
import { planById } from "./plans";
import {
  createStripeCheckout,
  createStripePortal,
  getStripeOfferings,
  reconcileBilling,
} from "./stripe-checkout.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";

export interface WebPurchaseResult extends PurchaseResult {
  /** Present on success — the Paywall mounts EmbeddedCheckout with this. */
  clientSecret?: string;
}

export function createWebProvider(): SubscriptionProvider {
  const listeners = new Set<(e: Entitlement) => void>();

  return {
    kind: "web",
    async init() {
      /* nothing to init on the web — Stripe.js loads lazily */
    },
    async identify() {
      /* handled by Supabase auth */
    },
    async getOfferings(): Promise<Offerings> {
      const result = await getStripeOfferings();
      if ("error" in result) throw new Error(result.error);
      return result;
    },

    async purchase(planId: PlanId): Promise<WebPurchaseResult> {
      const plan = planById(planId);
      if (!plan) return { ok: false, entitlement: "free", error: "Unknown plan" };
      if (!paymentsConfigured()) {
        return {
          ok: false,
          entitlement: "free",
          error: "Payments are not configured for this build.",
        };
      }

      const returnUrl = `${window.location.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const res = await createStripeCheckout({
        data: {
          priceId: "premium_monthly",
          returnUrl,
          environment: getStripeEnvironment(),
        },
      });

      if ("error" in res) return { ok: false, entitlement: "free", error: res.error };
      // Purchase itself completes asynchronously inside embedded checkout;
      // the webhook updates entitlement, and refreshFromBackend picks it up.
      return { ok: true, entitlement: "free", clientSecret: res.clientSecret };
    },

    async restore(): Promise<PurchaseResult> {
      // Web entitlement is server-authoritative; the store's
      // refreshFromBackend() call is the effective "restore".
      const state = await reconcileBilling({ data: { provider: "stripe" } });
      return { ok: true, entitlement: state.tier === "premium" ? "premium" : "free" };
    },

    async refreshEntitlement(): Promise<Entitlement> {
      const state = await reconcileBilling({ data: { provider: "stripe" } });
      return state.entitlement;
    },

    onEntitlementChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

/** Open the Stripe billing portal in a new tab for the current user. */
export async function openStripeBillingPortal(): Promise<void> {
  const res = await createStripePortal({
    data: {
      returnUrl: `${window.location.origin}/profile`,
      environment: getStripeEnvironment(),
    },
  });
  if ("error" in res) throw new Error(res.error);
  window.open(res.url, "_blank", "noopener,noreferrer");
}
