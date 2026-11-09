import { expect, test } from "bun:test";
import { verifyWebhookEnvironments } from "../src/lib/subscription/sandbox-policy";

test("provider environment cannot turn live accounts into sandbox accounts", () => {
  expect(() =>
    verifyWebhookEnvironments(["live"], { type: "INITIAL_PURCHASE", environment: "SANDBOX" }),
  ).toThrow();
  expect(() =>
    verifyWebhookEnvironments(["sandbox"], { type: "INITIAL_PURCHASE", environment: "PRODUCTION" }),
  ).toThrow();
  expect(() =>
    verifyWebhookEnvironments(["sandbox"], { type: "INITIAL_PURCHASE", environment: "SANDBOX" }),
  ).not.toThrow();
  expect(() =>
    verifyWebhookEnvironments(["live"], { type: "RENEWAL", environment: "PRODUCTION" }),
  ).not.toThrow();
});
test("mixed-environment transfers fail before either account can be changed", () => {
  for (const environment of [undefined, "SANDBOX", "PRODUCTION"] as const)
    expect(() =>
      verifyWebhookEnvironments(["live", "sandbox"], { type: "TRANSFER", environment }),
    ).toThrow();
  expect(() =>
    verifyWebhookEnvironments(["sandbox", "sandbox"], { type: "TRANSFER" }),
  ).not.toThrow();
  expect(() => verifyWebhookEnvironments(["live"], { type: "RENEWAL" })).toThrow();
  expect(() => verifyWebhookEnvironments([], { type: "TRANSFER" })).toThrow();
});
