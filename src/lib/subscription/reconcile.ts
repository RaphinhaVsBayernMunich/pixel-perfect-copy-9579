export type ReconciliationResult = "paid" | "pending" | "account-changed";
/** Reconcile only the signed-in identity. Provider callbacks alone never grant access. */
export async function reconcileUntilVerified(deps: {
  isCurrent: () => boolean;
  reconcile: () => Promise<unknown>;
  refresh: () => Promise<void>;
  hasPaidAccess: () => boolean;
  wait: (ms: number) => Promise<void>;
}): Promise<ReconciliationResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!deps.isCurrent()) return "account-changed";
    try {
      await deps.reconcile();
    } catch {
      /* A webhook may have delivered the authoritative result. */
    }
    if (!deps.isCurrent()) return "account-changed";
    await deps.refresh();
    if (!deps.isCurrent()) return "account-changed";
    if (deps.hasPaidAccess()) return "paid";
    if (attempt < 4) await deps.wait([1000, 2000, 4000, 8000][attempt]);
  }
  return "pending";
}
