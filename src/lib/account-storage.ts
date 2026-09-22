/** Unowned v1 saves are intentionally never attributed to the next login. */
export function accountStorageKey(userId: string, kind: string): string {
  return `questos:v2:${userId}:${kind}`;
}

export function readAccountState<T>(storage: Storage, userId: string, kind: string): T | null {
  const raw = storage.getItem(accountStorageKey(userId, kind));
  if (!raw) return null;
  const envelope = JSON.parse(raw) as { userId: string; state: T };
  if (envelope.userId !== userId)
    throw new Error("Local save owner mismatch. Original save preserved.");
  return envelope.state;
}

export function writeAccountState<T>(storage: Storage, userId: string, kind: string, state: T) {
  storage.setItem(accountStorageKey(userId, kind), JSON.stringify({ userId, state }));
}
