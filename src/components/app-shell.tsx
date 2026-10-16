import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Swords, CalendarDays, Scroll, User, Plus, LogOut, Settings } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUI } from "@/lib/ui-store";
import { useQuests } from "@/lib/quests-store";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { QuestQuickAdd } from "@/components/quest-quick-add";
import { QuestEditor } from "@/components/quest-editor";
import { QuestCelebration } from "@/components/quest-celebration";
import { AICoach } from "@/components/ai-coach";
import { Paywall } from "@/components/subscription/paywall";
import { TrialEndedGate } from "@/components/subscription/trial-ended";
import { TrialBadge } from "@/components/subscription/trial-badge";

import { PremiumRuntime } from "./premium-runtime";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/quests", label: "Quests", icon: Swords },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/legacy", label: "Legacy", icon: Scroll },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/premium", label: "Premium", icon: Plus },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const syncAchievements = useQuests((s) => s.syncAchievements);

  useEffect(() => {
    syncAchievements();
  }, [syncAchievements]);

  return (
    <div className="min-h-screen bg-ambient text-foreground">
      <div className="flex min-h-screen">
        {/* Desktop side rail */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-hairline bg-sidebar/60 px-4 py-6 backdrop-blur-md md:flex">
          <Link to="/" className="mb-8 flex items-center gap-2 px-2">
            <LogoMark />
            <span className="font-display text-lg font-semibold tracking-tight">QuestOS</span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-primary" : "text-sidebar-foreground/60",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <TrialBadge />
          <SignOutButton />
        </aside>

        <main className="app-content relative flex min-h-screen w-full flex-col md:pb-8">
          <PremiumRuntime />
          <header className="flex items-center justify-between gap-2 px-5 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
            <Link to="/" className="font-display text-sm">
              QuestOS
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/premium" className="flex min-h-11 items-center px-2 text-sm text-primary">
                Premium
              </Link>
              <Link
                to="/settings"
                aria-label="Settings"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground"
              >
                <Settings className="size-5" />
              </Link>
            </div>
          </header>
          {children}
        </main>
      </div>

      {/* Floating action button */}
      <button
        type="button"
        aria-label="Add quest"
        onClick={openQuickAdd}
        className="fixed right-5 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition active:scale-95 md:right-8 md:bottom-8"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-background/85 backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.slice(0, 5).map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 type-nav transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Global quest UI */}
      <QuestQuickAdd />
      <QuestEditor />
      <QuestCelebration />
      <AICoach />
      <Paywall />
      <TrialEndedGate />
    </div>
  );
}

function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-hairline">
      <div className="h-3 w-3 rotate-45 bg-primary shadow-glow-xp" />
    </div>
  );
}

function SignOutButton() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await supabase.auth.signOut();
      }}
      className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="truncate">{user.email ?? "Sign out"}</span>
    </button>
  );
}
