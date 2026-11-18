import { expect, test } from "bun:test";
import { pricingErrorMessage } from "../src/lib/subscription/pricing-error";

test("pricing errors distinguish startup, catalog timeout and unavailable products", () => {
  expect(pricingErrorMessage(new Error("Pricing timed out."), "identity")).toContain("starting");
  expect(pricingErrorMessage(new Error("Pricing timed out."), "catalog")).toContain(
    "pricing in time",
  );
  expect(
    pricingErrorMessage(new Error("No verified monthly plan available."), "catalog"),
  ).toContain("no verified monthly plan");
  expect(pricingErrorMessage({ code: "23" }, "catalog")).toContain("configuration");
});
test("raw SDK messages and credentials never appear in pricing errors", () => {
  for (const code of [undefined, "2", "3", "10", "23", "unknown"]) {
    const result = pricingErrorMessage(
      { code, message: "private credential and customer record" },
      "catalog",
    );
    expect(result).not.toContain("private credential");
    expect(result).not.toContain("customer record");
  }
});
