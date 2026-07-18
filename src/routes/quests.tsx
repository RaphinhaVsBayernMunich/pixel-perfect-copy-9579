import { createFileRoute } from "@tanstack/react-router";
import { RouteStub } from "@/components/route-stub";

export const Route = createFileRoute("/quests")({
  head: () => ({
    meta: [
      { title: "Quests — QuestOS" },
      {
        name: "description",
        content:
          "Your quest board: main missions, daily quests, weekly goals, side quests, and boss battles.",
      },
      { property: "og:title", content: "Quests — QuestOS" },
      {
        property: "og:description",
        content: "Your full quest board across every category.",
      },
    ],
  }),
  component: () => (
    <RouteStub
      eyebrow="Chapter 3"
      title="Quests"
      description="Every mission you're running, organized by type. Full quest board arrives in Phase 2."
    />
  ),
});
