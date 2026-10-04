export const mapping = Object.freeze({
  packageId: "app.questos.android",
  playProduct: "questos_premium_monthly",
  basePlan: "monthly",
  rcProduct: "questos_premium_monthly:monthly",
  entitlement: "premium",
  offering: "default",
  package: "$rc_monthly",
});
export function verifyPlayProduct(product, offers) {
  const plan = product.basePlans?.find((p) => p.basePlanId === mapping.basePlan);
  const price = plan?.regionalConfigs?.find((r) => r.regionCode === "US")?.price;
  if (
    product.productId !== mapping.playProduct ||
    plan?.state !== "ACTIVE" ||
    plan.autoRenewingBasePlanType?.billingPeriodDuration !== "P1M" ||
    price?.currencyCode !== "USD" ||
    Number(price.units ?? 0) * 100 + Number(price.nanos ?? 0) / 1e7 !== 299
  )
    throw new Error("Play monthly product must be ACTIVE, P1M and US $2.99.");
  if (
    offers.some(
      (o) =>
        o.state === "ACTIVE" &&
        o.phases?.some((p) => p.regionalConfigs?.some((r) => r.free !== undefined)),
    )
  )
    throw new Error("Active store trial would stack with the app-managed trial.");
}
export function verifyRevenueCatMapping(
  app,
  product,
  entitlementProducts,
  offering,
  packageProducts,
  appId,
) {
  if (
    app.id !== appId ||
    app.type !== "play_store" ||
    app.play_store?.package_name !== mapping.packageId
  )
    throw new Error("RevenueCat Android app identity does not match QuestOS.");
  if (
    product.app_id !== appId ||
    product.store_identifier !== mapping.rcProduct ||
    product.type !== "subscription"
  )
    throw new Error("RevenueCat product does not match the canonical monthly store product.");
  if (!entitlementProducts.some((p) => p.id === product.id))
    throw new Error("Premium entitlement is not attached to the monthly product.");
  if (offering.lookup_key !== mapping.offering || !offering.is_current)
    throw new Error("The default offering must be current.");
  if (
    !packageProducts.some((p) => p.product?.id === product.id && p.eligibility_criteria === "all")
  )
    throw new Error("Monthly package must contain the canonical product for all SDK versions.");
}
