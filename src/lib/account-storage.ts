/** Unowned v1 saves are intentionally never attributed to the next login. */
export function accountStorageKey(userId: string, kind: string): string {
  return `questos:v2:${userId}:${kind}`;
}

/** Call after confirmed backend deletion, with sync detached. Preserve other accounts. */
export function removeAccountState(storage: Storage, userId: string) {
  const prefix = accountStorageKey(userId, "");
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
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
