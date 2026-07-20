/**
 * Web subscription provider.
 *
 * On the web we don't ship a browser billing SDK yet — purchases go through
 * a server function that will (in a follow-up wire-up) call RevenueCat Web
 * Billing or Stripe Checkout. Until then this provider surfaces catalog
 * pricing and defers purchase to the backend, which is the correct
 * abstraction shape: the UI never learns which processor ran the charge.
 */
import type {
  Entitlement,
  Offerings,
  PlanId,
  PurchaseResult,
  SubscriptionProvider,
} from "./types";
import { PLANS, planById, toOfferingPackage } from "./plans";

export function createWebProvider(): SubscriptionProvider {
  const listeners = new Set<(e: Entitlement) => void>();

  return {
    kind: "web",
    async init() {
      /* no SDK to initialize on web today */
    },
    async identify() {
      /* handled by Supabase auth */
    },
    async getOfferings(): Promise<Offerings> {
      return { current: PLANS.map((p) => toOfferingPackage(p)) };
    },
    async purchase(planId: PlanId): Promise<PurchaseResult> {
      const plan = planById(planId);
      if (!plan) return { ok: false, entitlement: "free", error: "Unknown plan" };
      // Real web checkout is wired via startWebCheckout() in the store.
      return {
        ok: false,
        entitlement: "free",
        error: "Web checkout is not yet configured. See docs/subscription-setup.md.",
      };
    },
    async restore(): Promise<PurchaseResult> {
      // On the web, entitlement lives in the backend — the subscription
      // store's refreshFromBackend() call is the effective "restore".
      return { ok: true, entitlement: "free" };
    },
    async refreshEntitlement(): Promise<Entitlement> {
      // Web entitlement is authoritative from Supabase; the store handles
      // that read directly.
      return "free";
    },
    onEntitlementChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
