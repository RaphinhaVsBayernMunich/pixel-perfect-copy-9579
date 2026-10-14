/**
 * Client-side Stripe.js loader. Derives the environment from the token
 * prefix — never defaults to 'live' when unset, since that would silently
 * route real users through a broken checkout.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function paymentsConfigured(): boolean {
  return (
    !!clientToken && (clientToken.startsWith("pk_test_") || clientToken.startsWith("pk_live_"))
  );
}

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error("Web payments are currently unavailable. Contact founder@oryxion.net for help.");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    getStripeEnvironment(); // throws if misconfigured
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}
