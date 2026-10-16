import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionSection } from "@/components/subscription/subscription-section";
import { PremiumWorkspace } from "@/components/premium-workspace";
export const Route = createFileRoute("/premium")({
  component: () => (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-10">
      <header className="space-y-2">
        <p className="type-eyebrow text-muted-foreground">Your personal operating system</p>
        <h1 className="type-h1">A little more possibility.</h1>
        <p className="text-muted-foreground">
          Tools for planning, focus and learning from your progress.
        </p>
      </header>
      <SubscriptionSection />
      <PremiumWorkspace />
    </div>
  ),
});
