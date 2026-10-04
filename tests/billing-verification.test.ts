import { expect, test } from "bun:test";
import { verifyPlayProduct, verifyRevenueCatMapping } from "../scripts/billing-contract-checks.mjs";
test("billing readiness rejects inactive, wrong-price and store-trial monthly products", () => {
  const plan = {
    basePlanId: "monthly",
    state: "ACTIVE",
    autoRenewingBasePlanType: { billingPeriodDuration: "P1M" },
    regionalConfigs: [
      { regionCode: "US", price: { currencyCode: "USD", units: "2", nanos: 990000000 } },
    ],
  };
  const product = { productId: "questos_premium_monthly", basePlans: [plan] };
  expect(() => verifyPlayProduct(product, [])).not.toThrow();
  plan.state = "DRAFT";
  expect(() => verifyPlayProduct(product, [])).toThrow("ACTIVE");
  plan.state = "ACTIVE";
  plan.regionalConfigs[0].price.units = "9";
  expect(() => verifyPlayProduct(product, [])).toThrow("2.99");
  plan.regionalConfigs[0].price.units = "2";
  expect(() =>
    verifyPlayProduct(product, [
      { state: "ACTIVE", phases: [{ regionalConfigs: [{ free: {} }] }] },
    ]),
  ).toThrow("stack");
});
test("RevenueCat readiness rejects the wrong app, unattached entitlement and wrong offering", () => {
  const app = {
    id: "app1",
    type: "play_store",
    play_store: { package_name: "app.questos.android" },
  };
  const product = {
    id: "prod1",
    app_id: "app1",
    store_identifier: "questos_premium_monthly:monthly",
    type: "subscription",
  };
  const offering = { lookup_key: "default", is_current: true };
  const products = [{ product: { id: "prod1" }, eligibility_criteria: "all" }];
  expect(() =>
    verifyRevenueCatMapping(app, product, [product], offering, products, "app1"),
  ).not.toThrow();
  expect(() => verifyRevenueCatMapping(app, product, [], offering, products, "app1")).toThrow(
    "entitlement",
  );
  expect(() =>
    verifyRevenueCatMapping(app, product, [product], offering, products, "another-app"),
  ).toThrow("identity");
  offering.is_current = false;
  expect(() =>
    verifyRevenueCatMapping(app, product, [product], offering, products, "app1"),
  ).toThrow("current");
});
