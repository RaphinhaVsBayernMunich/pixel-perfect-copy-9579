import { type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUI } from "@/lib/ui-store";
import { usePremium } from "@/lib/subscription/service";
import type { PremiumFeature } from "@/lib/subscription/types";
import { PREMIUM_FEATURES } from "@/lib/subscription/types";
import { Button } from "@/components/ui/button";

/**
 * Wrap any premium capability with <PremiumGate feature="ai.memory">.
 *   - If the user has the entitlement, renders children.
 *   - Otherwise renders a compact, non-punitive upsell card.
 *
 * The gate reads from `usePremium(feature)`, so business logic never
 * references the billing provider directly.
 */
export function PremiumGate({
  feature,
  children,
  fallback,
  className,
  inline = false,
}: {
  feature: PremiumFeature;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  inline?: boolean;
}) {
  const unlocked = usePremium(feature);
  if (unlocked) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return <PremiumUpsell feature={feature} className={className} inline={inline} />;
}

export function PremiumUpsell({
  feature,
  className,
  inline = false,
}: {
  feature: PremiumFeature;
  className?: string;
  inline?: boolean;
}) {
  const meta = PREMIUM_FEATURES[feature];
  const openPaywall = useUI((s) => s.openPaywall);
  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline bg-card/60 backdrop-blur-sm",
        inline ? "p-4" : "p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Lock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            Premium
          </p>
          <h3 className="mt-0.5 font-display text-base font-semibold text-foreground">
            {meta.label}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          <Button
            size="sm"
            onClick={openPaywall}
            className="mt-3 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Unlock Premium
          </Button>
        </div>
      </div>
    </div>
  );
}
