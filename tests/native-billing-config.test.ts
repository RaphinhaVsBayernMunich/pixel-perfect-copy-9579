import { expect, test } from "bun:test";
import { verifiedNativeBillingKey } from "../src/lib/subscription/native-billing-config";
test("native signed-app public SDK binding rejects stale and private configuration", () => {
  expect(verifiedNativeBillingKey("goog_publicTestKey", "goog_publicTestKey")).toBe(
    "goog_publicTestKey",
  );
  expect(() => verifiedNativeBillingKey("goog_oldPublicKey", "goog_publicTestKey")).toThrow(
    "Update QuestOS",
  );
  expect(() => verifiedNativeBillingKey("", "goog_publicTestKey")).toThrow();
  expect(() => verifiedNativeBillingKey("notAPublicKey", "notAPublicKey")).toThrow();
});
