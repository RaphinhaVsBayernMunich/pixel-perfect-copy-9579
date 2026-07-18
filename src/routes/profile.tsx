import { createFileRoute } from "@tanstack/react-router";
import { RouteStub } from "@/components/route-stub";
import { character, CATEGORY_LABEL, CATEGORY_TOKEN } from "@/lib/demo-data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — QuestOS" },
      {
        name: "description",
        content:
          "Your character sheet: level, attributes, skills, projects, and settings.",
      },
      { property: "og:title", content: "Profile — QuestOS" },
      {
        property: "og:description",
        content: "Your character sheet and settings.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RouteStub
      eyebrow="Character sheet"
      title={character.name}
      description={`Level ${character.level} · ${character.title} · ${character.season}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
            Lifetime XP
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-xp">
            {character.xp.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
            Momentum
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60 ring-hairline">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${character.momentum * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {Math.round(character.momentum * 100)}% · streak {character.streakDays} days
          </p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
          Top categories
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(character.categoryXp) as (keyof typeof character.categoryXp)[])
            .sort((a, b) => character.categoryXp[b] - character.categoryXp[a])
            .slice(0, 5)
            .map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-hairline px-3 py-1 text-xs"
                style={{ color: CATEGORY_TOKEN[cat] }}
              >
                {CATEGORY_LABEL[cat]} · {character.categoryXp[cat].toLocaleString()}
              </span>
            ))}
        </div>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Attributes, skill tree, resume, and settings arrive in Phase 4.
      </p>
    </RouteStub>
  );
}
