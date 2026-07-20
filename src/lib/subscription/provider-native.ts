/**
 * Native subscription provider — RevenueCat + Google Play Billing.
 *
 * We dynamic-import `@revenuecat/purchases-capacitor` so the web bundle
 * doesn't have to resolve native-only code paths. RevenueCat is the single
 * source of truth for paid entitlements on device; it also handles
 * offline caching, restore, and store-issued renewals/cancellations.
 */
import type {
  Entitlement,
  Offerings,
  PlanId,
  PurchaseResult,
  SubscriptionProvider,
} from "./types";
import { PLANS, planById, planByProductId, toOfferingPackage } from "./plans";

const PREMIUM_ENTITLEMENT_ID = "premium";

export function createNativeProvider(getApiKey: () => string | undefined): SubscriptionProvider {
  const listeners = new Set<(e: Entitlement) => void>();
  let initialized = false;

  async function getSdk() {
    const mod = await import("@revenuecat/purchases-capacitor");
    return mod.Purchases;
  }

  function entitlementFromInfo(info: any): Entitlement {
    const active = info?.entitlements?.active ?? {};
    return active[PREMIUM_ENTITLEMENT_ID] ? "premium" : "free";
  }

  return {
    kind: "native",

    async init(userId) {
      if (initialized) return;
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Missing RevenueCat public SDK key (VITE_REVENUECAT_ANDROID_KEY).");
      const Purchases = await getSdk();
      await Purchases.configure({ apiKey, appUserID: userId ?? undefined });
      // Attach entitlement change listener.
      try {
        Purchases.addCustomerInfoUpdateListener((info: any) => {
          const ent = entitlementFromInfo(info);
          listeners.forEach((cb) => cb(ent));
        });
      } catch {
        /* SDK versions differ slightly across releases */
      }
      initialized = true;
    },

    async identify(userId) {
      const Purchases = await getSdk();
      try {
        await Purchases.logIn({ appUserID: userId });
      } catch (e) {
        console.warn("RevenueCat logIn failed", e);
      }
    },

    async getOfferings(): Promise<Offerings> {
      try {
        const Purchases = await getSdk();
        const result = await Purchases.getOfferings();
        const current = result?.current;
        if (!current) return { current: PLANS.map((p) => toOfferingPackage(p)) };
        const packages = current.availablePackages ?? [];
        return {
          current: packages
            .map((pkg: any) => {
              const productId = pkg?.product?.identifier ?? pkg?.identifier;
              const plan = productId ? planByProductId(productId) : undefined;
              if (!plan) return null;
              return toOfferingPackage(plan, pkg?.product?.priceString);
            })
            .filter(Boolean) as any,
        };
      } catch (e) {
        console.warn("Failed to load RevenueCat offerings, falling back to catalog", e);
        return { current: PLANS.map((p) => toOfferingPackage(p)) };
      }
    },

    async purchase(planId: PlanId): Promise<PurchaseResult> {
      const plan = planById(planId);
      if (!plan) return { ok: false, entitlement: "free", error: "Unknown plan" };
      try {
        const Purchases = await getSdk();
        const offerings = await Purchases.getOfferings();
        const pkg = offerings?.current?.availablePackages?.find(
          (p: any) => (p?.product?.identifier ?? p?.identifier) === plan.productId,
        );
        if (!pkg) return { ok: false, entitlement: "free", error: "Product not available" };
        const result = await Purchases.purchasePackage({ aPackage: pkg });
        const entitlement = entitlementFromInfo(result?.customerInfo);
        return { ok: entitlement === "premium", entitlement };
      } catch (e: any) {
        if (e?.userCancelled) return { ok: false, entitlement: "free", error: "cancelled" };
        return { ok: false, entitlement: "free", error: e?.message ?? "Purchase failed" };
      }
    },

    async restore(): Promise<PurchaseResult> {
      try {
        const Purchases = await getSdk();
        const info = await Purchases.restorePurchases();
        const entitlement = entitlementFromInfo(info?.customerInfo ?? info);
        return { ok: true, entitlement };
      } catch (e: any) {
        return { ok: false, entitlement: "free", error: e?.message ?? "Restore failed" };
      }
    },

    async refreshEntitlement(): Promise<Entitlement> {
      try {
        const Purchases = await getSdk();
        const info = await Purchases.getCustomerInfo();
        return entitlementFromInfo(info?.customerInfo ?? info);
      } catch {
        return "free";
      }
    },

    onEntitlementChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
