import { useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";
import { useSubscription } from "@/lib/subscription/service";
import { PREMIUM_FEATURES } from "@/lib/subscription/types";
import { getStripe } from "@/lib/stripe";
import { PremiumPurchase } from "./premium-purchase";
import { accessTier } from "@/lib/subscription/billing-contracts";
export function Paywall() {
  const open = useUI((s) => s.paywallOpen),
    close = useUI((s) => s.closePaywall),
    secret = useUI((s) => s.checkoutClientSecret),
    setSecret = useUI((s) => s.setCheckoutClientSecret);
  const state = useSubscription();
  const fetchClientSecret = useCallback(async () => secret ?? "", [secret]);
  const complete = useCallback(async () => {
    if (await useSubscription.getState().reconcile()) {
      setSecret(null);
      close();
    }
  }, [close, setSecret]);
  const tier = accessTier(state);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSecret(null);
          close();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogTitle>QuestOS Premium</DialogTitle>
        <DialogDescription>More ways to plan, reflect and build momentum.</DialogDescription>
        {secret && state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {secret ? (
          <>
            <EmbeddedCheckoutProvider
              stripe={getStripe()}
              options={{ fetchClientSecret, onComplete: () => void complete() }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <Button disabled={state.pending} onClick={() => void complete()}>
              Check purchase status
            </Button>
            <Button variant="ghost" onClick={() => setSecret(null)}>
              Back to plans
            </Button>
          </>
        ) : (
          <>
            <PremiumPurchase />
            <details className="disclosure">
              <summary>Everything included</summary>
              <ul className="mt-4 space-y-3 text-sm">
                {Object.entries(PREMIUM_FEATURES).map(([key, feature]) => (
                  <li key={key}>
                    <strong className="font-medium">{feature.label}</strong>
                    <p className="mt-1 text-muted-foreground">{feature.description}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Paid Premium: 500 AI requests per UTC day across all tools. Trial: 40/day. Free:
                10/day. Unused requests do not roll over.
              </p>
            </details>
            <p className="text-xs">
              Free keeps quests, basic calendar, XP, Legacy, achievements and Cloud Sync. Your
              existing data is preserved after downgrade.
            </p>
            <div className="flex gap-4 text-xs">
              <a href="/legal/privacy">Privacy</a>
              <a href="/legal/terms">Terms</a>
              <button className="min-h-11" onClick={close}>
                {tier === "trial"
                  ? "Keep using trial"
                  : tier === "premium"
                    ? "Back to QuestOS"
                    : "Keep using Free"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
