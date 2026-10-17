import { useEffect } from "react";
import { toast } from "sonner";
import { PurchaseView } from "./purchase-view";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { accessTier } from "@/lib/subscription/billing-contracts";
import { isNative } from "@/lib/native/platform";
import { useUI } from "@/lib/ui-store";

export function PremiumPurchase() {
  const state = useSubscription();
  const refreshOfferings = state.refreshOfferings;
  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);
  const tier = accessTier(state);
  const plan = state.offerings?.current.find((p) => p.identifier === "premium_monthly");
  return (
    <PurchaseView
      tier={tier}
      days={trialDaysLeft(state)}
      price={plan?.priceString}
      loaded={state.loaded}
      pricingLoading={state.pricingLoading || state.offerings === null}
      pricingError={state.pricingError}
      error={state.error ?? null}
      pending={state.pending}
      native={isNative()}
      cancelAtPeriodEnd={state.cancelAtPeriodEnd ?? false}
      onRetry={() => void state.refreshOfferings(true)}
      onRestore={() => void state.restore()}
      onManage={() => void state.openBillingPortal()}
      onPurchase={async () => {
        const ok = await state.purchase("premium_monthly");
        if (useUI.getState().checkoutClientSecret) useUI.getState().openPaywall();
        else if (ok && accessTier(useSubscription.getState()) === "premium")
          toast.success("Premium is active. You're ready to go.");
      }}
    />
  );
}
