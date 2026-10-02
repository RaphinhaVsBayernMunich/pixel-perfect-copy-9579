import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";
export function SubscriptionSection() {
  const state = useSubscription();
  const days = trialDaysLeft(state);
  const paid = ["premium", "grace"].includes(state.status);
  const price = state.offerings?.current[0]?.priceString;
  const refreshOfferings = state.refreshOfferings;
  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);
  const date = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString() : "—";
  return (
    <section className="rounded-3xl border border-hairline bg-card/60 p-6">
      <h2 className="font-display text-xl">
        Subscription ·{" "}
        {state.status === "grace"
          ? "Payment grace period"
          : state.status === "expired"
            ? "Free (previous access ended)"
            : state.status}
      </h2>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <dl className="my-5 grid grid-cols-2 gap-3 text-sm">
        <dt>Current plan</dt>
        <dd>
          {state.currentPlan === "premium_annual"
            ? "Premium Annual"
            : state.currentPlan === "trial"
              ? "7-day trial"
              : "Free"}
        </dd>
        <dt>Verified annual price</dt>
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
          A paid renewal failed. Access lasts at most 3 days from the failure boundary. Update your
          payment method.
        </p>
      )}
      <p className="my-3 text-xs">
        AI limits reset at midnight UTC: Free 10/day, trial 40/day, paid Premium 500/day fair use.
        Free permits 25 active quests, including at most 3 active main quests (projects). Existing
        data stays accessible.
      </p>
      <div className="flex flex-wrap gap-2">
        {!paid && <Button onClick={() => useUI.getState().openPaywall()}>Upgrade</Button>}
        <Button variant="outline" disabled={state.pending} onClick={() => void state.restore()}>
          Restore
        </Button>
        <Button variant="outline" disabled={state.pending} onClick={() => void state.reconcile()}>
          Refresh billing
        </Button>
        {state.billingProvider && (
          <Button variant="outline" onClick={() => void state.openBillingPortal()}>
            Manage subscription
          </Button>
        )}
      </div>
    </section>
  );
}
