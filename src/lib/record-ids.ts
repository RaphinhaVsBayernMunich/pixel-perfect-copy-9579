export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function newRecordId(): string {
  return crypto.randomUUID();
}

/** Remap one snapshot together so event references and deletion queues stay valid. */
export function migrateRecordIds<
  T extends {
    quests: { id: string }[];
    events: { id: string; questId?: string }[];
    pendingDeletions: string[];
    pendingEventDeletions?: string[];
    lastCompletion?: { questId: string; ts: number };
  },
>(snapshot: T): T {
  const questIds = new Map<string, string>();
  const eventIds = new Map<string, string>();
  function mapId(map: Map<string, string>, id: string) {
    if (isUuid(id)) return id;
    if (!map.has(id)) map.set(id, newRecordId());
    return map.get(id)!;
  }
  return {
    ...snapshot,
    quests: snapshot.quests.map((q) => ({ ...q, id: mapId(questIds, q.id) })),
    events: snapshot.events.map((e) => ({
      ...e,
      id: mapId(eventIds, e.id),
      ...(e.questId ? { questId: mapId(questIds, e.questId) } : {}),
    })),
    pendingDeletions: snapshot.pendingDeletions.map((id) => mapId(questIds, id)),
    pendingEventDeletions: (snapshot.pendingEventDeletions ?? []).map((id) => mapId(eventIds, id)),
    lastCompletion: snapshot.lastCompletion
      ? { ...snapshot.lastCompletion, questId: mapId(questIds, snapshot.lastCompletion.questId) }
      : undefined,
  };
}
