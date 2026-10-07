import { expect, test } from "bun:test";
import { removeAccountState } from "../src/lib/account-storage";
import { deleteRevenueCatCustomer } from "../src/lib/subscription/revenuecat-http.server";

test("deletion clears only the deleted account including recovery copies", () => {
  const records = new Map([
    ["questos:v2:alice:save", "a"],
    ["questos:v2:alice:conflict-backup-123", "backup"],
    ["questos:v2:bob:save", "b"],
    ["questos:v2:alice-other:save", "c"],
    ["unrelated", "d"],
  ]);
  const storage = {
    get length() {
      return records.size;
    },
    key: (index: number) => [...records.keys()][index] ?? null,
    removeItem: (key: string) => records.delete(key),
  } as Storage;
  removeAccountState(storage, "alice");
  expect([...records.keys()]).toEqual([
    "questos:v2:bob:save",
    "questos:v2:alice-other:save",
    "unrelated",
  ]);
});

test("RevenueCat deletion uses authenticated DELETE and allows retry after already deleted", async () => {
  for (const status of [200, 404]) {
    const request = (async (url: string | URL | Request, options?: RequestInit) => {
      expect(url).toBe("https://api.revenuecat.com/v1/subscribers/account-id");
      expect(options?.method).toBe("DELETE");
      expect(options?.headers).toEqual({ Authorization: "Bearer test-placeholder" });
      expect(options?.redirect).toBe("manual");
      return new Response(null, { status });
    }) as typeof fetch;
    await expect(
      deleteRevenueCatCustomer("account-id", "test-placeholder", request),
    ).resolves.toBeUndefined();
  }
});

test("provider failures and redirects block account deletion without exposing response bodies", async () => {
  for (const status of [301, 401, 429, 500]) {
    const request = (async () =>
      new Response("private-provider-details", { status })) as typeof fetch;
    await expect(
      deleteRevenueCatCustomer("account-id", "test-placeholder", request),
    ).rejects.toThrow("retry or contact support");
  }
  const request = (async () => {
    throw new Error("private-network-details");
  }) as typeof fetch;
  await expect(deleteRevenueCatCustomer("account-id", "test-placeholder", request)).rejects.toThrow(
    "retry or contact support",
  );
});
