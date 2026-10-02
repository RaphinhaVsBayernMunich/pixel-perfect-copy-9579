import "@tanstack/react-start/server-only";
// Direct provider SDK: no connector gateway or development-platform credentials.
import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

export function createStripeClient(env: StripeEnv): Stripe {
  const key = getEnv(env === "sandbox" ? "STRIPE_SANDBOX_SECRET_KEY" : "STRIPE_LIVE_SECRET_KEY");
  if (!key.startsWith(env === "sandbox" ? "sk_test_" : "sk_live_"))
    throw new Error("Stripe key environment does not match billing mode");
  return new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    timeout: 15000,
    maxNetworkRetries: 1,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripeErrorMessage(_error: unknown): string {
  return "Billing could not complete this request. Please retry or contact support.";
}
export async function verifyWebhook(req: Request, env: StripeEnv): Promise<Stripe.Event> {
  const signature = req.headers.get("stripe-signature");
  if (!signature || Number(req.headers.get("content-length")) > 262144)
    throw new Error("Invalid webhook");
  const body = await req.text();
  if (new TextEncoder().encode(body).length > 262144) throw new Error("Invalid webhook");
  const secret = getEnv(
    env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET",
  );
  const verifier = new Stripe("unused-local-signature-verifier");
  return verifier.webhooks.constructEventAsync(
    body,
    signature,
    secret,
    300,
    Stripe.createSubtleCryptoProvider(),
  );
}
