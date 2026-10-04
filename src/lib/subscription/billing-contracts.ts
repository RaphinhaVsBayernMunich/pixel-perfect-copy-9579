import { z } from "zod";
export const billingEnvironment = z.enum(["sandbox", "live"]);
export const subscriptionSnapshot = z.object({
  tier: z.enum(["free", "trial", "premium"]),
  subscription_status: z.enum(["free", "trial", "premium", "grace", "expired"]),
  entitlement: z.enum(["free", "premium"]),
  current_plan: z.enum(["trial", "premium_monthly", "premium_annual"]).nullable(),
  trial_start: z.string().nullable(),
  trial_end: z.string().nullable(),
  premium_expiration: z.string().nullable(),
  paid_until: z.string().nullable(),
  grace_end: z.string().nullable(),
  cancel_at_period_end: z.boolean(),
  billing_provider: z.string().nullable(),
  environment: billingEnvironment,
  last_verification: z.string().nullable(),
  revenuecat_customer_id: z.string().nullable(),
});
export const billingEvent = z.object({
  provider: z.enum(["stripe", "revenuecat"]),
  environment: billingEnvironment,
  eventId: z.string().min(1).max(250),
  eventAt: z.string().datetime({ offset: true }),
  userId: z.string().uuid(),
  customerId: z.string().min(1).max(250),
  subscriptionId: z.string().min(1).max(250),
  productId: z.enum([
    "premium_monthly",
    "questos_premium_monthly",
    "questos_premium_monthly:monthly",
    "premium_annual",
    "questos_premium_annual",
    "questos_premium_annual:annual",
  ]),
  status: z.enum(["active", "grace", "expired", "revoked"]),
  paidUntil: z.string().datetime({ offset: true }),
  failureSince: z.string().datetime({ offset: true }).nullable(),
  cancelAtPeriodEnd: z.boolean(),
});
export type BillingEvent = z.infer<typeof billingEvent>;
export const ANNUAL_PLAN = "premium_annual" as const;
export const MONTHLY_PLAN = "premium_monthly" as const;
export const PLAY_PRODUCT = "questos_premium_monthly";
export const PLAY_BASE_PLAN = "monthly";
export const RC_ENTITLEMENT = "premium";
export const RC_OFFERING = "default";
export const RC_PACKAGE = "$rc_monthly";
export function isSupportedPlayProduct(id: string) {
  // Annual receipts remain recognized for existing customers; new offerings are monthly only.
  return (
    id === PLAY_PRODUCT ||
    id === `${PLAY_PRODUCT}:${PLAY_BASE_PLAN}` ||
    id === "questos_premium_annual" ||
    id === "questos_premium_annual:annual"
  );
}
export function accessTier(
  s: {
    status: string;
    trialEnd: string | null;
    premiumExpiration: string | null;
    entitlement: string;
  },
  now = Date.now(),
) {
  if (s.entitlement !== "premium") return "free";
  if (s.status === "trial") return s.trialEnd && Date.parse(s.trialEnd) > now ? "trial" : "free";
  return ["premium", "grace"].includes(s.status) &&
    s.premiumExpiration &&
    Date.parse(s.premiumExpiration) > now
    ? "premium"
    : "free";
}
