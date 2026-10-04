import { expect, test } from "bun:test";
import type {
  PurchasesPlugin,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";
import { createNativeProvider } from "../src/lib/subscription/provider-native";

const accountA = "10000000-0000-4000-8000-000000000001";
const accountB = "10000000-0000-4000-8000-000000000002";
function fixture() {
  let identity = "$RCAnonymousID:test";
  let purchases = 0;
  let restores = 0;
  let duringPurchase: (() => Promise<void>) | undefined;
  const info = { entitlements: { active: { premium: {} } } } as CustomerInfo;
  const pkg = {
    identifier: "$rc_annual",
    product: {
      identifier: "questos_premium_annual:annual",
      subscriptionPeriod: "P1Y",
      defaultOption: { id: "annual", isBasePlan: true },
      currencyCode: "USD",
      price: 19.99,
      priceString: "$19.99",
    },
  } as PurchasesPackage;
  const catalog = { all: { default: { availablePackages: [pkg] } }, current: null };
  const api = {
    configure: async (options: { appUserID: string }) => {
      identity = options.appUserID;
    },
    addCustomerInfoUpdateListener: async () => "listener",
    logIn: async (options: { appUserID: string }) => {
      identity = options.appUserID;
    },
    logOut: async () => {
      identity = "$RCAnonymousID:test";
    },
    isAnonymous: async () => ({ isAnonymous: identity.startsWith("$RCAnonymousID:") }),
    getAppUserID: async () => ({ appUserID: identity }),
    getOfferings: async () => catalog,
    purchasePackage: async () => {
      purchases++;
      await duringPurchase?.();
      return { customerInfo: info };
    },
    restorePurchases: async () => {
      restores++;
      return { customerInfo: info };
    },
    getCustomerInfo: async () => ({ customerInfo: info }),
  } as unknown as PurchasesPlugin;
  const provider = createNativeProvider(
    () => "goog_test_public",
    async () => api,
  );
  return {
    provider,
    pkg,
    catalog,
    identity: () => identity,
    counts: () => ({ purchases, restores }),
    switchDuringPurchase: (callback: () => Promise<void>) => {
      duringPurchase = callback;
    },
  };
}
test("native billing rejects anonymous, missing and non-UUID identities", async () => {
  const f = fixture();
  await expect(f.provider.init(null)).rejects.toThrow();
  await expect(f.provider.identify("another-user")).rejects.toThrow();
  expect((await f.provider.purchase("premium_annual")).ok).toBe(false);
  expect((await f.provider.restore()).ok).toBe(false);
  expect(f.counts()).toEqual({ purchases: 0, restores: 0 });
});
test("native logout blocks purchase and restore, then binds account B", async () => {
  const f = fixture();
  await f.provider.init(accountA);
  expect(f.identity()).toBe(accountA);
  await f.provider.reset!();
  expect((await f.provider.restore()).ok).toBe(false);
  await f.provider.identify(accountB);
  expect(f.identity()).toBe(accountB);
  expect((await f.provider.restore()).ok).toBe(true);
});
test("account switching discards an in-flight purchase result", async () => {
  const f = fixture();
  await f.provider.init(accountA);
  f.switchDuringPurchase(async () => {
    await f.provider.reset!();
    await f.provider.identify(accountB);
  });
  expect((await f.provider.purchase("premium_annual")).ok).toBe(false);
  expect(f.identity()).toBe(accountB);
});
test("catalog requires default offering, annual package, annual base plan and valid localized price", async () => {
  const f = fixture();
  await f.provider.init(accountA);
  expect((await f.provider.getOfferings()).current).toHaveLength(1);
  f.pkg.identifier = "$rc_monthly";
  expect((await f.provider.purchase("premium_annual")).ok).toBe(false);
  f.pkg.identifier = "$rc_annual";
  f.pkg.product.price = 0;
  expect((await f.provider.getOfferings()).current).toHaveLength(0);
  f.pkg.product.price = 19.99;
  delete (f.catalog.all as Partial<typeof f.catalog.all>).default;
  expect((await f.provider.purchase("premium_annual")).ok).toBe(false);
  expect(f.counts().purchases).toBe(0);
});
