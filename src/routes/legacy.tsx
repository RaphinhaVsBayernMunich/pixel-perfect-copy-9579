import { createFileRoute } from "@tanstack/react-router";
import { RouteStub } from "@/components/route-stub";

export const Route = createFileRoute("/legacy")({
  head: () => ({
    meta: [
      { title: "Legacy — QuestOS" },
      {
        name: "description",
        content:
          "Your timeline, milestones, achievements, and memory vault. The story you're writing.",
      },
      { property: "og:title", content: "Legacy — QuestOS" },
      {
        property: "og:description",
        content: "Timeline, achievements, and the story of you.",
      },
    ],
  }),
  component: () => (
    <RouteStub
      eyebrow="Chapter 4"
      title="Legacy"
      description="Timeline, achievements, milestones, and memory vault. Comes online in Phase 4."
    />
  ),
});
