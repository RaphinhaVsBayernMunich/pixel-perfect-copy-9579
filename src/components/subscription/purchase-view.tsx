import { Check, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export interface PurchaseViewProps {
  tier: "free" | "trial" | "premium";
  days: number | null;
  price?: string;
  loaded: boolean;
  pricingLoading: boolean;
  pricingError: string | null;
  error: string | null;
  pending: boolean;
  native: boolean;
  cancelAtPeriodEnd: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  onRetry: () => void;
  onManage: () => void;
}

// Presentation only: access and price are supplied by the existing verified billing store.
export function PurchaseView(p: PurchaseViewProps) {
  const paid = p.tier === "premium";
  return (
    <section className="premium-purchase space-y-5" aria-label="Premium subscription">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-eyebrow text-primary">QuestOS Premium</p>
          <h2 className="type-h2 mt-2">
            {!p.loaded
              ? "Checking your access…"
              : paid
                ? "Premium Active"
                : p.tier === "trial"
                  ? "Premium Trial"
                  : "Make room for more."}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {paid
              ? p.cancelAtPeriodEnd
                ? "Your paid access continues until the current period ends."
                : "Your planning tools and expanded AI are ready."
              : p.tier === "trial"
                ? `${p.days ?? 0} days remaining · upgrade whenever you're ready.`
                : "More space to plan, reflect and follow through."}
          </p>
        </div>
        {paid && <Check className="mt-2 size-6 shrink-0 text-primary" aria-hidden />}
      </div>
      {!p.loaded ? (
        <PricingSkeleton />
      ) : paid ? (
        <Button className="w-full sm:w-auto" disabled={p.pending} onClick={p.onManage}>
          Manage subscription <ArrowUpRight />
        </Button>
      ) : p.pricingLoading ? (
        <PricingSkeleton />
      ) : p.pricingError || !p.price ? (
        <div className="space-y-3 rounded-xl bg-surface-2 p-4" role="status">
          <p className="text-sm">We couldn't load the current monthly price.</p>
          <Button variant="outline" disabled={p.pending} onClick={p.onRetry}>
            Retry pricing
          </Button>
          <p className="text-xs text-muted-foreground">
            Your current access is unchanged. No purchase has been made.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            size="lg"
            className="min-h-14 w-full flex-wrap whitespace-normal py-3"
            disabled={p.pending}
            onClick={p.onPurchase}
          >
            {p.pending ? (
              <>
                <Loader2 className="animate-spin" /> Completing purchase…
              </>
            ) : (
              <>
                <span>Upgrade to Premium</span>
                <span className="font-normal">· {p.price}</span>
              </>
            )}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {p.tier === "trial" &&
              "Your current trial is provided by QuestOS. You don't need to wait for it to end. "}
            {p.native
              ? "Buying now starts your Google Play subscription. Google Play manages monthly renewal and cancellation."
              : "Buying now starts your monthly subscription. Manage renewal and cancellation through billing settings."}
          </p>
          {p.tier === "trial" && (
            <p className="text-xs text-muted-foreground">
              Or keep using your trial — no purchase required today.
            </p>
          )}
        </div>
      )}
      {p.error && (
        <p role="alert" className="text-sm text-destructive">
          {p.error}
        </p>
      )}
      <Button variant="ghost" size="sm" disabled={p.pending || !p.loaded} onClick={p.onRestore}>
        {p.pending ? "Verifying purchase…" : "Restore purchases"}
      </Button>
    </section>
  );
}

function PricingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading verified pricing"
      className="space-y-3 py-1 motion-safe:animate-pulse"
    >
      <div className="h-14 rounded-xl bg-surface-2" />
      <div className="h-3 w-3/4 rounded bg-surface-2" />
      <span className="sr-only">Loading verified pricing</span>
    </div>
  );
}
