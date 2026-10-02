import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { usePremiumData } from "@/lib/premium/hooks";
import { usePremium, useSubscription } from "@/lib/subscription/service";
import { useAuth } from "@/lib/auth-store";
import { isNative } from "@/lib/native/platform";
import { QuestOSNative } from "@/lib/premium/native";
export function PremiumRuntime() {
  const { data } = usePremiumData();
  const enabled = usePremium("themes.premium");
  const userId = useAuth((s) => s.user?.id);
  const expires = useSubscription((s) => (s.status === "trial" ? s.trialEnd : s.premiumExpiration));
  useEffect(() => {
    document.documentElement.dataset.premiumTheme = enabled
      ? (data?.preferences.theme ?? "default")
      : "default";
    return () => {
      delete document.documentElement.dataset.premiumTheme;
    };
  }, [enabled, data?.preferences.theme, userId]);
  useEffect(() => {
    if (!isNative()) return;
    const text =
      enabled && data
        ? data.quests
            .filter((q) => q.status === "active")
            .slice(0, 5)
            .map((q) => `${q.scheduled_for ?? "Unscheduled"} · ${q.title}`)
            .join("\n")
        : "";
    void QuestOSNative.widget({
      text,
      expiresAt: enabled && expires ? Math.min(Date.parse(expires), Date.now() + 3600000) : 0,
    }).catch(() => {});
    return () => {
      void QuestOSNative.widget({ text: "", expiresAt: 0 }).catch(() => {});
    };
  }, [enabled, data, userId, expires]);
  return null;
}
export function PremiumDashboard() {
  const enabled = usePremium("widgets.dashboard_advanced");
  const { data, error } = usePremiumData();
  if (!enabled)
    return (
      <Link to="/premium" className="mb-5 block rounded-xl border border-hairline p-4 text-primary">
        Explore Premium tools and dashboard widgets →
      </Link>
    );
  if (!data)
    return (
      <p className="mb-5 text-sm">
        {error ? "Premium dashboard could not load." : "Loading dashboard…"}
      </p>
    );
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      {data.preferences.widgets.map((widget) => (
        <section key={widget} className="rounded-xl border border-hairline bg-card p-4">
          <h2 className="font-display capitalize">{widget}</h2>
          {widget === "focus" ? (
            <>
              <p>
                {data.metrics.active} active quests · {Math.round(data.metrics.plannedMinutes / 60)}{" "}
                hours estimated backlog
              </p>
              <Link to="/premium">Open focus timer</Link>
            </>
          ) : widget === "week" ? (
            <p>
              {data.metrics.last7} completions in the last 7 days ({data.metrics.previous7} in the
              previous 7).
            </p>
          ) : widget === "category" ? (
            data.metrics.categories.map((c) => (
              <p key={c.category}>
                {c.category}: {c.active} active · {c.completed} completed
              </p>
            ))
          ) : (
            <p>
              At your chosen {data.preferences.dailyMinutes} minutes/day, the current backlog needs
              about {Math.ceil(data.metrics.plannedMinutes / data.preferences.dailyMinutes)} days.
              This is an estimate.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
