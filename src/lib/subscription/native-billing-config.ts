import { z } from "zod";
/** Public SDK configuration is compiled into the signed Android app, never a private key. */
export function verifiedNativeBillingKey(packaged: unknown, published: unknown): string {
  const key = z
    .string()
    .regex(/^goog_[A-Za-z0-9]+$/)
    .parse(packaged);
  if (typeof published !== "string" || key !== published)
    throw new Error("Update QuestOS from Google Play before using billing.");
  return key;
}
