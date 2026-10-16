// Inline upgrade entry for the desktop rail. Mobile uses the Premium header link.
import { Sparkles } from "lucide-react";
import { useSubscription, trialDaysLeft } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export function TrialBadge() {
  const state = useSubscription();
  const openPaywall = useUI((s) => s.openPaywall);
  const days = trialDaysLeft(state);

  if (!state.loaded) return null;
  if (state.status === "premium" || state.status === "grace") return null;

  const label =
    state.status === "trial" && days !== null
      ? `Premium · ${days}d left`
      : state.status === "expired"
        ? "Free · Upgrade"
        : "Get Premium";

  return (
    <button
      type="button"
      onClick={openPaywall}
      className={cn(
        "mt-5 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-primary transition-colors hover:bg-primary/10",
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </button>
  );
}
