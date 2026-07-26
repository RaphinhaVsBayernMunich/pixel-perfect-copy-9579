/**
 * Premium paywall — Apple-quality dialog.
 *
 * Renders the current plan catalog (from SubscriptionService, which routes
 * to Google Play Billing on native and to the web checkout on the web),
 * a benefits list, and Restore + legal links.
 *
 * A/B testing hook: the layout / copy / featured plan are all local to
 * this component. Swap it out or feature-flag variants without touching
 * feature gates or the subscription store.
 */
import { useCallback, useEffect } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { PREMIUM_FEATURES } from "@/lib/subscription/types";
import { getStripe, paymentsConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const BENEFIT_KEYS: (keyof typeof PREMIUM_FEATURES)[] = [
  "ai.unlimited",
  "ai.memory",
  "ai.future_me",
  "ai.executive_assistant",
  "analytics.advanced",
  "themes.premium",
  "widgets.premium",
  "integrations.calendar",
];

export function Paywall() {
  const open = useUI((s) => s.paywallOpen);
  const close = useUI((s) => s.closePaywall);
  const clientSecret = useUI((s) => s.checkoutClientSecret);
  const setClientSecret = useUI((s) => s.setCheckoutClientSecret);
  const state = useSubscription();
  const refreshOfferings = useSubscription((s) => s.refreshOfferings);
  const refreshFromBackend = useSubscription((s) => s.refreshFromBackend);
  const purchase = useSubscription((s) => s.purchase);
  const restore = useSubscription((s) => s.restore);

  useEffect(() => {
    if (open) void refreshOfferings();
  }, [open, refreshOfferings]);

  const fetchClientSecret = useCallback(async () => clientSecret ?? "", [clientSecret]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {clientSecret ? (
          <div className="px-2 pt-8 pb-2">
            <button
              onClick={() => setClientSecret(null)}
              className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Back to plans"
            >
              <X className="h-4 w-4" />
            </button>
            <EmbeddedCheckoutProvider
              stripe={getStripe()}
              options={{
                fetchClientSecret,
                onComplete: () => {
                  // Webhook is authoritative — just re-read the profile.
                  void refreshFromBackend();
                  setTimeout(() => {
                    setClientSecret(null);
                    close();
                  }, 1500);
                },
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <PaywallPlans
            state={state}
            close={close}
            purchase={purchase}
            restore={restore}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaywallPlans({
  state,
  close,
  purchase,
  restore,
}: {
  state: ReturnType<typeof useSubscription.getState>;
  close: () => void;
  purchase: (id: any) => Promise<boolean>;
  restore: () => Promise<boolean>;
}) {
  const daysLeft = trialDaysLeft(state);
  const featured = state.offerings?.current.find((p) => p.featured) ?? state.offerings?.current[0];
  const configured = paymentsConfigured();

  return (
    <>
      {/* Hero */}
        <div className="relative bg-gradient-to-b from-primary/20 via-primary/5 to-transparent px-6 pt-8 pb-6">
          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close paywall"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-primary">
            <Sparkles className="h-3.5 w-3.5" /> QuestOS Premium
          </div>
          <DialogTitle className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Play your life on higher difficulty.
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {state.status === "trial" && daysLeft !== null
              ? `You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} of trial premium left.`
              : state.status === "premium"
                ? "You already have Premium. Manage below."
                : "Unlock every AI, theme, and integration."}
          </DialogDescription>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-2">
          <ul className="grid grid-cols-1 gap-2">
            {BENEFIT_KEYS.map((k) => {
              const meta = PREMIUM_FEATURES[k];
              return (
                <li key={k} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">{meta.label}</span>
                    <span className="text-muted-foreground"> — {meta.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pt-4 pb-6">
          {state.offerings?.current.length ? (
            <div className="space-y-2">
              {state.offerings.current.map((pkg) => (
                <button
                  key={pkg.identifier}
                  onClick={() => void purchase(pkg.identifier)}
                  disabled={state.pending}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    pkg.featured
                      ? "border-primary bg-primary/10 hover:bg-primary/15"
                      : "border-hairline hover:bg-accent",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-display font-semibold">{pkg.displayName}</span>
                    <span className="tabular-nums text-sm font-medium">{pkg.priceString}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pkg.featured ? "Best value — cancel anytime." : "Cancel anytime."}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-hairline p-4 text-sm text-muted-foreground">
              Loading plans…
            </div>
          )}

          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={state.pending || !featured}
            onClick={() => featured && void purchase(featured.identifier)}
          >
            {state.pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
              </>
            ) : (
              <>Continue with Premium</>
            )}
          </Button>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => void restore()}>
              Restore purchases
            </button>
            <button className="hover:text-foreground" onClick={close}>
              Maybe later
            </button>
            <a
              className="hover:text-foreground"
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Privacy
            </a>
            <a
              className="hover:text-foreground"
              href="/legal/terms"
              target="_blank"
              rel="noreferrer"
            >
              Terms
            </a>
          </div>
        </div>
      </>
  );
}
}
