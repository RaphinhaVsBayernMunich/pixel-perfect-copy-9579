import { expect, test } from "bun:test";
import { pricingDeadline } from "../src/lib/subscription/pricing-deadline";

test("a stalled native read stops loading without cancelling identity work", async () => {
  let finish!: (value: string) => void;
  const identity = new Promise<string>((resolve) => {
    finish = resolve;
  });
  await expect(pricingDeadline(identity, 5)).rejects.toThrow("Pricing timed out");
  finish("verified-owner");
  expect(await identity).toBe("verified-owner");
  expect(await pricingDeadline(identity, 5)).toBe("verified-owner");
});

test("pricing preserves success and rejection and handles late rejection", async () => {
  expect(await pricingDeadline(Promise.resolve("verified-price"), 50)).toBe("verified-price");
  await expect(pricingDeadline(Promise.reject(new Error("unavailable")), 50)).rejects.toThrow(
    "unavailable",
  );
  let fail!: (error: Error) => void;
  const pending = new Promise<never>((_, reject) => {
    fail = reject;
  });
  await expect(pricingDeadline(pending, 5)).rejects.toThrow("timed out");
  fail(new Error("late provider failure"));
  await Promise.resolve();
});
