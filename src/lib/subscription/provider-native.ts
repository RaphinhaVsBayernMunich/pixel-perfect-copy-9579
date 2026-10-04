import { z } from "zod";
import { PLAY_BASE_PLAN, RC_OFFERING, RC_PACKAGE, RC_ENTITLEMENT } from "./billing-contracts";
import type { Entitlement, Offerings, SubscriptionProvider } from "./types";
import { planById, planByProductId, toOfferingPackage } from "./plans";
import type {
  CustomerInfo,
  PurchasesPackage,
  PurchasesPlugin,
} from "@revenuecat/purchases-capacitor";
const eligible = (pkg: PurchasesPackage) =>
  pkg.identifier === RC_PACKAGE &&
  !!planByProductId(pkg.product.identifier) &&
  pkg.product.subscriptionPeriod === "P1Y" &&
  pkg.product.defaultOption?.id === PLAY_BASE_PLAN &&
  pkg.product.defaultOption.isBasePlan &&
  Number.isFinite(pkg.product.price) &&
  pkg.product.price > 0;
export function createNativeProvider(
  getApiKey: () => string | undefined,
  sdk: () => Promise<PurchasesPlugin> = async () =>
    (await import("@revenuecat/purchases-capacitor")).Purchases,
): SubscriptionProvider {
  const listeners = new Set<(e: Entitlement) => void>();
  let initialized = false;
  let owner: string | null = null;
  const assertIdentity = async (expected: string | null) => {
    if (
      !expected ||
      owner !== expected ||
      (await (await sdk()).getAppUserID()).appUserID !== expected ||
      owner !== expected
    )
      throw new Error("Sign in again before using Google Play billing.");
  };
  const entitlement = (info: CustomerInfo): Entitlement =>
    info.entitlements.active[RC_ENTITLEMENT] ? "premium" : "free";
  return {
    kind: "native",
    async init(userId) {
      z.string().uuid().parse(userId);
      if (initialized) return;
      const apiKey = getApiKey();
      if (!apiKey?.startsWith("goog_")) throw new Error("Google Play billing is not configured.");
      const purchases = await sdk();
      await purchases.configure({ apiKey, appUserID: userId! });
      await purchases.addCustomerInfoUpdateListener(
        (info) => owner && listeners.forEach((cb) => cb(entitlement(info))),
      );
      initialized = true;
      owner = userId;
    },
    async reset() {
      owner = null;
      if (initialized && !(await (await sdk()).isAnonymous()).isAnonymous)
        await (await sdk()).logOut();
    },
    async identify(userId) {
      z.string().uuid().parse(userId);
      owner = null;
      await (await sdk()).logIn({ appUserID: userId });
      owner = userId;
    },
    async getOfferings(): Promise<Offerings> {
      const offerings = await (await sdk()).getOfferings();
      return {
        current: (offerings.all[RC_OFFERING]?.availablePackages ?? []).flatMap((pkg) => {
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
      const expected = owner;
      try {
        await assertIdentity(expected);
        const purchases = await sdk();
        const offerings = await purchases.getOfferings();
        const pkg = offerings.all[RC_OFFERING]?.availablePackages.find(
          (p) => eligible(p) && planByProductId(p.product.identifier)?.id === planId,
        );
        if (!pkg)
          return {
            ok: false,
            entitlement: "free",
            error: "The annual product is unavailable in Google Play.",
          };
        await assertIdentity(expected);
        const result = await purchases.purchasePackage({ aPackage: pkg });
        await assertIdentity(expected);
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
      const expected = owner;
      try {
        await assertIdentity(expected);
        const info = await (await sdk()).restorePurchases();
        await assertIdentity(expected);
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
      const expected = owner;
      await assertIdentity(expected);
      const info = await (await sdk()).getCustomerInfo();
      await assertIdentity(expected);
      return entitlement(info.customerInfo);
    },
    onEntitlementChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
