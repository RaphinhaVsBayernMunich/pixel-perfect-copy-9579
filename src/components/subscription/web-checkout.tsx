import { useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

export default function WebCheckout({
  secret,
  onComplete,
}: {
  secret: string;
  onComplete: () => void;
}) {
  const fetchClientSecret = useCallback(async () => secret, [secret]);
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret, onComplete }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
