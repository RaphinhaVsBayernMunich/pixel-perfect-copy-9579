import type { OfferingPackage, PlanId } from "./types";

/**
 * Canonical plan catalog.
 *
 * `productId` values MUST match:
 *   - Google Play Console → Monetize → Subscriptions
 *   - RevenueCat dashboard → Products
 *   - RevenueCat dashboard → Entitlements ("premium") → attached products
 *
 * Add a new plan by appending an entry here. No other code change required
 * unless the plan gates a new feature.
 */
export interface PlanDef {
  id: PlanId;
  productId: string; // store SKU (Google Play / App Store / Stripe price id)
  displayName: string;
  period: "annual" | "monthly" | "lifetime";
  defaultPriceString: string;
  featured?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    id: "premium_annual",
    productId: "questos_premium_annual",
    displayName: "Premium — Annual",
    period: "annual",
    defaultPriceString: "$19.99 / year",
    featured: true,
  },
  // Future plans — commented out until priced & configured in the stores.
  // { id: "premium_monthly",  productId: "questos_premium_monthly",  displayName: "Premium — Monthly",  period: "monthly",  defaultPriceString: "$2.99 / month" },
  // { id: "premium_lifetime", productId: "questos_premium_lifetime", displayName: "Premium — Lifetime", period: "lifetime", defaultPriceString: "$79.99 once" },
];

export function planById(id: PlanId): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

export function planByProductId(productId: string): PlanDef | undefined {
  return PLANS.find((p) => p.productId === productId);
}

export function toOfferingPackage(plan: PlanDef, priceString?: string): OfferingPackage {
  return {
    identifier: plan.id,
    displayName: plan.displayName,
    priceString: priceString ?? plan.defaultPriceString,
    period: plan.period,
    featured: plan.featured,
  };
}
