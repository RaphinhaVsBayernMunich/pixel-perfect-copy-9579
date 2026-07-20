/**
 * Settings → Subscription section.
 * Renders current plan, status, renewal / trial end, and management links.
 */
import { format } from "date-fns";
import { CreditCard, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";
import { isNative, nativePlatform } from "@/lib/native/platform";
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

export function SubscriptionSection() {
  const state = useSubscription();
  const restore = useSubscription((s) => s.restore);
  const openPaywall = useUI((s) => s.openPaywall);
  const daysLeft = trialDaysLeft(state);

  const renewalDate = state.premiumExpiration ?? state.trialEnd;
  const isPremium = state.status === "premium";

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
        <div>
          <dt className="text-xs text-muted-foreground">Current plan</dt>
          <dd className="mt-0.5 font-medium">
            {state.currentPlan === "premium_annual"
              ? "Annual — $19.99/yr"
              : state.currentPlan === "trial"
                ? "7-day trial"
                : "Free"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {state.status === "trial" ? "Trial ends" : isPremium ? "Renews" : "Ended"}
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {renewalDate ? format(new Date(renewalDate), "MMM d, yyyy") : "—"}
          </dd>
        </div>
        {daysLeft !== null && (
          <div className="col-span-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
            {daysLeft} day{daysLeft === 1 ? "" : "s"} of Premium remaining on your trial.
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {!isPremium && (
          <Button onClick={openPaywall} className="gap-1.5">
            <Sparkles className="h-4 w-4" /> {state.status === "trial" ? "Upgrade" : "Get Premium"}
          </Button>
        )}
        <Button variant="outline" onClick={() => void restore()} className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Restore purchases
        </Button>
        {isPremium && (
          <a
            href={
              isNative() && nativePlatform() === "android"
                ? "https://play.google.com/store/account/subscriptions"
                : "mailto:support@questos.app"
            }
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Manage subscription
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </a>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <a href="/legal/privacy" className="hover:text-foreground">Privacy</a>
        <a href="/legal/terms" className="hover:text-foreground">Terms</a>
      </div>
    </section>
  );
}
