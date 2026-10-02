import { useCallback, useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { PREMIUM_FEATURES } from "@/lib/subscription/types";
import { getStripe } from "@/lib/stripe";
export function Paywall() {
  const open = useUI((s) => s.paywallOpen),
    close = useUI((s) => s.closePaywall),
    secret = useUI((s) => s.checkoutClientSecret),
    setSecret = useUI((s) => s.setCheckoutClientSecret);
  const state = useSubscription();
  const refreshOfferings = state.refreshOfferings;
  useEffect(() => {
    if (open) void refreshOfferings();
  }, [open, refreshOfferings]);
  const fetchClientSecret = useCallback(async () => secret ?? "", [secret]);
  const complete = useCallback(async () => {
    if (await useSubscription.getState().reconcile()) {
      setSecret(null);
      close();
    }
  }, [close, setSecret]);
  const days = trialDaysLeft(state);
  const paid = state.status === "premium" || state.status === "grace";
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
        <DialogDescription>
          {paid
            ? "Manage your annual subscription."
            : days !== null
              ? `${days} days remain in your 7-day trial.`
              : "More ways to plan, reflect and build momentum."}
        </DialogDescription>
        {state.error && (
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
            <ul className="space-y-2 text-sm">
              {Object.entries(PREMIUM_FEATURES).map(([key, feature]) => (
                <li key={key}>
                  <strong>{feature.label}</strong> — {feature.description}
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Paid Premium: 500 AI requests per UTC day, shared across all AI tools. Trial: 40/day.
              Free: 10/day. Unused requests do not roll over.
            </p>
            {state.offerings?.current.map((plan) => (
              <div key={plan.identifier} className="rounded-xl border p-4">
                <strong>{plan.displayName}</strong>
                <p>{plan.priceString}</p>
                <p className="text-xs">
                  Auto-renews annually until cancelled. Your current paid period remains available
                  after cancellation.
                </p>
                <Button
                  className="mt-3 w-full"
                  disabled={state.pending || paid}
                  onClick={() => void state.purchase(plan.identifier)}
                >
                  Subscribe annually
                </Button>
              </div>
            ))}
            {!state.offerings?.current.length && (
              <Button disabled={state.pending} onClick={() => void state.refreshOfferings()}>
                Retry loading verified pricing
              </Button>
            )}
            {paid && (
              <Button onClick={() => void state.openBillingPortal()}>Manage subscription</Button>
            )}
            <Button variant="outline" disabled={state.pending} onClick={() => void state.restore()}>
              {state.pending ? "Verifying…" : "Restore purchases"}
            </Button>
            <p className="text-xs">
              Free keeps quests, basic calendar, XP, Legacy, achievements and Cloud Sync. Your
              existing data is preserved after downgrade.
            </p>
            <div className="flex gap-4 text-xs">
              <a href="/legal/privacy">Privacy</a>
              <a href="/legal/terms">Terms</a>
              <button onClick={close}>Keep using Free</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
