/**
 * Settings → Subscription section.
 *
 * Single place that renders: current plan, subscription status, entitlement,
 * trial status, trial days remaining, renewal / expiration date, and the
 * full action set: Manage subscription (Stripe portal / Play Store),
 * Restore purchases, Refresh status, Upgrade, Privacy, Terms.
 *
 * Nothing here talks to a billing SDK directly — everything routes through
 * SubscriptionService so the same UI works on web (Stripe) and Android
 * (Google Play Billing via RevenueCat).
 */
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";
import { APP_CONFIG } from "@/lib/config/admin-config";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  trial: "Free Trial",
  free: "Free",
  premium: "Premium",
  expired: "Trial ended",
};

const STATUS_TONE: Record<string, string> = {
  trial: "bg-primary/15 text-primary",
  free: "bg-muted text-muted-foreground",
  premium: "bg-primary/20 text-primary",
  expired: "bg-muted text-muted-foreground",
};

const PLAN_LABEL: Record<string, string> = {
  premium_annual: "Annual — $19.99/yr",
  premium_monthly: "Monthly",
  trial: "7-day trial",
  free: "Free",
};

export function SubscriptionSection() {
  const state = useSubscription();
  const restore = useSubscription((s) => s.restore);
  const refresh = useSubscription((s) => s.refreshFromBackend);
  const openPortal = useSubscription((s) => s.openBillingPortal);
  const openPaywall = useUI((s) => s.openPaywall);
  const daysLeft = trialDaysLeft(state);

  const isPremium = state.status === "premium";
  const isTrial = state.status === "trial";
  const renewalDate = isPremium ? state.premiumExpiration : state.trialEnd;

  return (
    <section className="rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Subscription
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            QuestOS {isPremium ? "Premium" : STATUS_LABEL[state.status]}
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider",
            STATUS_TONE[state.status],
          )}
        >
          {STATUS_LABEL[state.status] ?? state.status}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <Row label="Current plan" value={PLAN_LABEL[state.currentPlan ?? "free"] ?? state.currentPlan ?? "Free"} />
        <Row label="Entitlement" value={state.entitlement === "premium" ? "Premium" : "Free"} />
        <Row
          label={isTrial ? "Trial ends" : isPremium ? "Renews" : "Ended"}
          value={renewalDate ? format(new Date(renewalDate), "MMM d, yyyy") : "—"}
          mono
        />
        <Row
          label="Last verified"
          value={state.lastVerification ? format(new Date(state.lastVerification), "MMM d, HH:mm") : "—"}
          mono
        />
        {daysLeft !== null && (
          <div className="col-span-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
            {daysLeft} day{daysLeft === 1 ? "" : "s"} of Premium remaining on your trial.
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {!isPremium && (
          <Button onClick={openPaywall} className="gap-1.5">
            <Sparkles className="h-4 w-4" /> {isTrial ? "Upgrade to Premium" : "Get Premium"}
          </Button>
        )}
        {isPremium && (
          <Button variant="default" onClick={() => void openPortal()} className="gap-1.5">
            <CreditCard className="h-4 w-4" /> Manage subscription
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => void refresh()}
          disabled={state.pending}
          className="gap-1.5"
        >
          {state.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh status
        </Button>
        <Button variant="outline" onClick={() => void restore()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Restore purchases
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <a href={APP_CONFIG.legal.privacyUrl} className="hover:text-foreground">Privacy Policy</a>
        <a href={APP_CONFIG.legal.termsUrl} className="hover:text-foreground">Terms of Service</a>
        <a href={`mailto:${APP_CONFIG.legal.supportEmail}`} className="hover:text-foreground">
          Contact support
        </a>
      </div>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-medium", mono && "tabular-nums")}>{value}</dd>
    </div>
  );
}
