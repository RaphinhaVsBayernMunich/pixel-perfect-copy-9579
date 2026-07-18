import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter, Sparkles, Plus } from "lucide-react";
import { useQuests, QUEST_TEMPLATES, type QuestTemplate } from "@/lib/quests-store";
import {
  CATEGORY_LABEL,
  CATEGORY_TOKEN,
  type Category,
  type QuestType,
} from "@/lib/demo-data";
import { QuestRow } from "@/components/quest-row";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
        content: "Every mission you're running, in one board.",
      },
    ],
  }),
  component: QuestsPage,
});

type Tab = QuestType | "all" | "completed";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "main", label: "Main" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "side", label: "Side" },
  { value: "boss", label: "Boss" },
  { value: "completed", label: "Completed" },
];

function QuestsPage() {
  const quests = useQuests((s) => s.quests);
  const add = useQuests((s) => s.add);
  const openQuickAdd = useUI((s) => s.openQuickAdd);

  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    return quests.filter((quest) => {
      if (tab === "completed") {
        if (!quest.completed) return false;
      } else if (tab === "all") {
        if (quest.completed) return false;
      } else {
        if (quest.type !== tab) return false;
        if (quest.completed) return false;
      }
      if (catFilter !== "all" && quest.category !== catFilter) return false;
      if (q && !quest.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [quests, tab, catFilter, q]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: 0, main: 0, daily: 0, weekly: 0, side: 0, boss: 0, completed: 0,
    };
    for (const quest of quests) {
      if (quest.completed) c.completed++;
      else {
        c.all++;
        c[quest.type]++;
      }
    }
    return c;
  }, [quests]);

  function useTemplate(tpl: QuestTemplate) {
    add({ ...tpl.quest });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-8 md:px-10 md:pt-12">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Chapter 3
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            Quest board
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {quests.filter((x) => !x.completed).length} active ·{" "}
            {counts.completed} completed. Tap a quest to edit, or complete it
            with the checkbox.
          </p>
        </div>
        <button
          onClick={openQuickAdd}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New quest
        </button>
      </header>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              tab === t.value
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-hairline bg-card/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className={cn(
              "rounded-full px-1.5 text-[10px] tabular-nums",
              tab === t.value ? "bg-primary/20" : "bg-background/60",
            )}>
              {counts[t.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search quests…"
            className="h-10 border-hairline bg-card/40 pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <CatChip active={catFilter === "all"} onClick={() => setCatFilter("all")}>
            All
          </CatChip>
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <CatChip
              key={c}
              active={catFilter === c}
              onClick={() => setCatFilter(c)}
              color={CATEGORY_TOKEN[c]}
            >
              {CATEGORY_LABEL[c]}
            </CatChip>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((quest) => (
            <QuestRow key={quest.id} quest={quest} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline bg-card/40 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-4 font-display text-lg">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a quest, or start from a template below.
          </p>
        </div>
      )}

      {/* Templates */}
      <section className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Templates
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Start from a proven routine
            </h2>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUEST_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => useTemplate(tpl)}
              className="group flex items-center gap-3 rounded-xl border border-hairline bg-card/60 p-3 text-left transition hover:bg-card"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                style={{
                  background: `color-mix(in oklch, ${CATEGORY_TOKEN[tpl.quest.category]} 18%, transparent)`,
                }}
              >
                {tpl.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tpl.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {CATEGORY_LABEL[tpl.quest.category]} · {tpl.quest.estimatedMinutes}m · +
                  {tpl.quest.xp} XP
                </p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-hairline bg-card/40 text-muted-foreground hover:text-foreground",
      )}
      style={active && color ? { borderColor: color, color, background: `color-mix(in oklch, ${color} 15%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}
