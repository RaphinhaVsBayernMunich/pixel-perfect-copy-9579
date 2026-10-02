import { PLAY_BASE_PLAN } from "./billing-contracts";
import type { Entitlement, Offerings, SubscriptionProvider } from "./types";
import { planById, planByProductId, toOfferingPackage } from "./plans";
import type { CustomerInfo, PurchasesPackage } from "@revenuecat/purchases-capacitor";
const eligible = (pkg: PurchasesPackage) =>
  !!planByProductId(pkg.product.identifier) &&
  pkg.product.subscriptionPeriod === "P1Y" &&
  pkg.product.defaultOption?.id === PLAY_BASE_PLAN &&
  pkg.product.defaultOption.isBasePlan &&
  !(pkg.product.currencyCode === "USD" && Math.round(pkg.product.price * 100) !== 1999);
export function createNativeProvider(getApiKey: () => string | undefined): SubscriptionProvider {
  const listeners = new Set<(e: Entitlement) => void>();
  let initialized = false;
  const sdk = async () => (await import("@revenuecat/purchases-capacitor")).Purchases;
  const entitlement = (info: CustomerInfo): Entitlement =>
    info.entitlements.active.premium ? "premium" : "free";
  return {
    kind: "native",
    async init(userId) {
      if (initialized) return;
      const apiKey = getApiKey();
      if (!apiKey?.startsWith("goog_")) throw new Error("Google Play billing is not configured.");
      const purchases = await sdk();
      await purchases.configure({ apiKey, appUserID: userId ?? undefined });
      await purchases.addCustomerInfoUpdateListener((info) =>
        listeners.forEach((cb) => cb(entitlement(info))),
      );
      initialized = true;
    },
    async reset() {
      if (initialized && !(await (await sdk()).isAnonymous()).isAnonymous)
        await (await sdk()).logOut();
    },
    async identify(userId) {
      await (await sdk()).logIn({ appUserID: userId });
    },
    async getOfferings(): Promise<Offerings> {
      const offerings = await (await sdk()).getOfferings();
      return {
        current: (offerings.current?.availablePackages ?? []).flatMap((pkg) => {
          const plan = planByProductId(pkg.product.identifier);
          return plan && eligible(pkg)
            ? [toOfferingPackage(plan, pkg.product.priceString + " / year")]
            : [];
        }),
      };
    },
    async purchase(planId) {
      if (planId !== "premium_annual" || !planById(planId))
        return { ok: false, entitlement: "free", error: "Only the annual plan is available." };
      try {
        const purchases = await sdk();
        const offerings = await purchases.getOfferings();
        const pkg = offerings.current?.availablePackages.find(
          (p) => eligible(p) && planByProductId(p.product.identifier)?.id === planId,
        );
        if (!pkg)
          return {
            ok: false,
            entitlement: "free",
            error: "The annual product is unavailable in Google Play.",
          };
        const result = await purchases.purchasePackage({ aPackage: pkg });
        return { ok: true, entitlement: entitlement(result.customerInfo) };
      } catch (error) {
        const cancelled =
          typeof error === "object" &&
          error !== null &&
          "userCancelled" in error &&
          error.userCancelled;
        return {
          ok: false,
          entitlement: "free",
          error: cancelled
            ? "cancelled"
            : "Google Play could not complete the purchase. Please retry.",
        };
      }
    },
    async restore() {
      try {
        const info = await (await sdk()).restorePurchases();
        return { ok: true, entitlement: entitlement(info.customerInfo) };
      } catch {
        return {
          ok: false,
          entitlement: "free",
          error: "Restore failed. Check your Google Play account and connection.",
        };
      }
    },
    async refreshEntitlement() {
      return entitlement((await (await sdk()).getCustomerInfo()).customerInfo);
    },
    onEntitlementChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
