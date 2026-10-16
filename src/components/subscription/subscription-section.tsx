import { Button } from "@/components/ui/button";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { accessTier } from "@/lib/subscription/billing-contracts";
import { PremiumPurchase } from "./premium-purchase";
export function SubscriptionSection() {
  const state = useSubscription();
  const days = trialDaysLeft(state);
  const paid = accessTier(state) === "premium";
  const price = state.offerings?.current[0]?.priceString;
  const date = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString() : "—";
  return (
    <section className="surface-panel space-y-5">
      <PremiumPurchase />
      <details className="disclosure">
        <summary>Subscription details and usage limits</summary>
        <h3 className="mt-4 font-display text-lg">
          Subscription ·{" "}
          {state.status === "grace"
            ? "Payment grace period"
            : state.status === "expired"
              ? "Free (previous access ended)"
              : state.status}
        </h3>
        {state.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <dl className="my-5 grid grid-cols-2 gap-3 text-sm">
          <dt>Current plan</dt>
          <dd>
            {state.currentPlan === "premium_monthly"
              ? "Premium Monthly"
              : state.currentPlan === "premium_annual"
                ? "Premium Annual"
                : state.currentPlan === "trial"
                  ? "QuestOS trial"
                  : "Free"}
          </dd>
          <dt>Verified monthly price</dt>
          <dd>{price ?? "Unavailable — retry pricing"}</dd>
          <dt>Trial started / ends</dt>
          <dd>
            {date(state.trialStart)} / {date(state.trialEnd)}
          </dd>
          <dt>
            {state.graceEnd
              ? "Grace ends"
              : state.cancelAtPeriodEnd
                ? "Access ends"
                : "Paid access / renewal date"}
          </dt>
          <dd>{date(state.graceEnd ?? state.premiumExpiration)}</dd>
          <dt>Auto-renewal</dt>
          <dd>
            {paid
              ? state.cancelAtPeriodEnd
                ? "Cancelled; access continues until shown date"
                : state.status === "grace"
                  ? "Payment failed — update payment method"
                  : "Enabled"
              : "Not applicable"}
          </dd>
          <dt>Provider</dt>
          <dd>{state.billingProvider ?? "Application trial / Free"}</dd>
          <dt>Last verified</dt>
          <dd>{date(state.lastVerification)}</dd>
        </dl>
        {days !== null && <p>{days} trial days remaining.</p>}
        {state.status === "grace" && (
          <p role="alert">
            A paid renewal failed. Access lasts at most 3 days from the failure boundary. Update
            your payment method.
          </p>
        )}
        <p className="my-3 text-xs">
          AI limits reset at midnight UTC: Free 10/day, trial 40/day, paid Premium 500/day fair use.
          Free permits 25 active quests, including at most 3 active main quests (projects). Existing
          data stays accessible.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={state.pending} onClick={() => void state.reconcile()}>
            Refresh billing
          </Button>
          {state.billingProvider && (
            <Button variant="outline" onClick={() => void state.openBillingPortal()}>
              Manage subscription
            </Button>
          )}
        </div>
      </details>
    </section>
  );
}
