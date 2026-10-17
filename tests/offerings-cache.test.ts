import { expect, test } from "bun:test";
import { createOfferingsCache } from "../src/lib/subscription/offerings-cache";
import type { Offerings } from "../src/lib/subscription/types";

const metadata = {
  current: [{ identifier: "premium_monthly", priceString: "Store price" }],
} as Offerings;
test("pricing deduplicates concurrent requests and reuses metadata until expiry", async () => {
  let now = 0,
    calls = 0;
  const cache = createOfferingsCache(() => now);
  const fetcher = async () => {
    calls++;
    return metadata;
  };
  await Promise.all([cache.load(fetcher), cache.load(fetcher), cache.load(fetcher)]);
  await cache.load(fetcher);
  expect(calls).toBe(1);
  now = 300_001;
  await cache.load(fetcher);
  expect(calls).toBe(2);
  await cache.load(fetcher, true);
  expect(calls).toBe(3);
});
test("failed pricing backs off even on repeated explicit retries and later recovers", async () => {
  let now = 0,
    calls = 0;
  const cache = createOfferingsCache(() => now);
  const fail = async () => {
    calls++;
    throw new Error("offline");
  };
  await expect(cache.load(fail)).rejects.toThrow();
  await expect(cache.load(fail, true)).rejects.toThrow();
  expect(calls).toBe(1);
  now = 2001;
  expect(await cache.load(async () => metadata)).toEqual(metadata);
});
test("reset prevents an old identity's delayed response from populating the new cache", async () => {
  const cache = createOfferingsCache();
  let finish!: (value: Offerings) => void;
  const old = cache.load(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await Promise.resolve();
  cache.reset();
  finish(metadata);
  await old;
  let calls = 0;
  await cache.load(async () => {
    calls++;
    return metadata;
  });
  expect(calls).toBe(1);
});
test("empty catalog is not cached as valid pricing", async () => {
  const cache = createOfferingsCache();
  await expect(cache.load(async () => ({ current: [] }))).rejects.toThrow();
});
