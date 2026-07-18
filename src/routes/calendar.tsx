import { createFileRoute } from "@tanstack/react-router";
import { RouteStub } from "@/components/route-stub";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — QuestOS" },
      {
        name: "description",
        content:
          "Plan your week, block focus sessions, and let the AI balance your workload.",
      },
      { property: "og:title", content: "Calendar — QuestOS" },
      {
        property: "og:description",
        content: "Smart scheduling that adapts when life changes.",
      },
    ],
  }),
  component: () => (
    <RouteStub
      eyebrow="Chapter 5"
      title="Calendar"
      description="Today, week, month, timeline, and drag-to-reschedule. Landing in Phase 3."
    />
  ),
});
