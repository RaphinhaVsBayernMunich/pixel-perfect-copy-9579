import { MONTHLY_PLAN, PLAY_PRODUCT, PLAY_BASE_PLAN } from "./billing-contracts";
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
  period: "monthly" | "monthly" | "lifetime";
  defaultPriceString: string;
  featured?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    id: MONTHLY_PLAN,
    // Google Play SKU. The web price lookup key is premium_monthly.
    productId: PLAY_PRODUCT,
    displayName: "Premium — Monthly",
    period: "monthly",
    defaultPriceString: "$2.99 / month",
    featured: true,
  },
];

export function planById(id: PlanId): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

export function planByProductId(productId: string): PlanDef | undefined {
  return PLANS.find(
    (p) => p.productId === productId || `${p.productId}:${PLAY_BASE_PLAN}` === productId,
  );
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
