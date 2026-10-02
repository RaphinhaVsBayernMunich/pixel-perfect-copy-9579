import { createFileRoute } from "@tanstack/react-router";
import { PremiumWorkspace } from "@/components/premium-workspace";
export const Route = createFileRoute("/premium")({
  component: () => (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-10">
      <h1 className="font-display text-3xl">Premium workspace</h1>
      <p>Tools for planning, focus and learning from your progress.</p>
      <PremiumWorkspace />
    </div>
  ),
});
