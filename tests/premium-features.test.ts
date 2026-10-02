import { test, expect } from "bun:test";
import {
  analytics,
  planDay,
  simulate,
  premiumWrite,
  type MetricQuest,
} from "../src/lib/premium/contracts";
import { calendarIcs, parseCalendarIcs, healthCsv } from "../src/lib/premium/import-export";
import { readAccountState, writeAccountState, accountStorageKey } from "../src/lib/account-storage";
import { isUuid, newRecordId } from "../src/lib/record-ids";
import { reconcileUntilVerified } from "../src/lib/subscription/reconcile";
import { accessTier } from "../src/lib/subscription/billing-contracts";
const now = Date.parse("2026-10-01T12:00:00Z");
const quest = (overrides: Partial<MetricQuest> = {}): MetricQuest => ({
  id: crypto.randomUUID(),
  title: "Practice scales",
  category: "creativity",
  type: "side",
  status: "active",
  estimated_duration: 30,
  scheduled_for: null,
  start_time: null,
  updated_at: new Date(now).toISOString(),
  ...overrides,
});
test("scheduling respects existing blocks, other days, durations and does not mutate quests", () => {
  const list = [
    quest({ scheduled_for: "2026-10-02", start_time: "09:00" }),
    quest({ scheduled_for: "2026-10-03", start_time: "10:00" }),
    quest({ type: "main" }),
    quest(),
  ];
  const before = JSON.stringify(list);
  const actions = planDay(list, "2026-10-02", 9, 120);
  expect(actions).toHaveLength(2);
  expect(actions[0].startTime).toBe("09:30");
  expect(actions[1].startTime).toBe("10:05");
  expect(JSON.stringify(list)).toBe(before);
  expect(actions.map((a) => a.id)).not.toContain(list[1].id);
});
test("schedule does not spill past midnight or create quests to fill space", () => {
  expect(planDay([quest({ estimated_duration: 120 })], "2026-10-02", 23, 120)).toHaveLength(0);
  expect(planDay([], "2026-10-02", 9, 120)).toHaveLength(0);
});
test("goal scenarios have deterministic adherence math", () => {
  expect(simulate(100, 5).map((s) => s.weeks)).toEqual([34, 25, 20]);
});
test("analytics uses real completions and includes deleted quest categories", () => {
  const events = [
    {
      kind: "completion",
      category: "coding",
      xp_earned: 50,
      occurred_at: new Date(now - 86400000).toISOString(),
    },
    { kind: "journal", category: "coding", xp_earned: 0, occurred_at: new Date(now).toISOString() },
    {
      kind: "completion",
      category: "coding",
      xp_earned: 200,
      occurred_at: new Date(now + 86400000).toISOString(),
    },
  ];
  const data = analytics([quest()], events, now);
  expect(data.last7).toBe(1);
  expect(data.categories.find((c) => c.category === "coding")?.xp).toBe(50);
  expect(data.plannedMinutes).toBe(30);
});
test("calendar file round-trip preserves scheduled quest times and resists line injection", () => {
  const q = quest({
    title: "Read, then write\r\nBEGIN:VEVENT",
    scheduled_for: "2026-10-02",
    start_time: "09:30:00",
  });
  const text = calendarIcs([q]);
  expect(text.match(/(?:^|\r\n)BEGIN:VEVENT\r\n/g)).toHaveLength(1);
  const result = parseCalendarIcs(text);
  expect(result).toHaveLength(1);
  expect(Date.parse(result[0].end) - Date.parse(result[0].start)).toBe(1800000);
});
test("calendar import rejects recurrence and unsupported times rather than guessing", () => {
  expect(() => parseCalendarIcs("BEGIN:VEVENT\nRRULE:FREQ=DAILY\nEND:VEVENT")).toThrow("Recurring");
  expect(() => parseCalendarIcs("BEGIN:VEVENT\nDTSTART:20261002\nDTEND:20261003")).toThrow("UTC");
});
test("health import validates units, ranges and real dates", () => {
  expect(healthCsv("date,steps,sleepMinutes,workoutMinutes\n2026-10-01,5000,420,30")[0].steps).toBe(
    5000,
  );
  for (const row of ["2026-99-01,1,1,1", "2026-10-01,-1,1,1", "2026-10-01,1,2000,1"])
    expect(() => healthCsv("date,steps,sleepMinutes,workoutMinutes\n" + row)).toThrow();
});
test("memory and preferences reject oversized or unsupported documents", () => {
  expect(
    premiumWrite.safeParse({ kind: "memory", value: { enabled: true, facts: ["a".repeat(241)] } })
      .success,
  ).toBe(false);
  expect(
    premiumWrite.safeParse({ kind: "preferences", value: { theme: "invented" } }).success,
  ).toBe(false);
});
test("account storage does not adopt unowned or mismatched saves; records are UUIDs", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  } as Storage;
  writeAccountState(storage, "account-a", "quests", { title: "A private quest" });
  expect(readAccountState(storage, "account-b", "quests")).toBeNull();
  expect(readAccountState(storage, "account-a", "quests")).toEqual({ title: "A private quest" });
  values.set(
    accountStorageKey("account-b", "quests"),
    values.get(accountStorageKey("account-a", "quests"))!,
  );
  expect(() => readAccountState(storage, "account-b", "quests")).toThrow("owner");
  expect(["q_1", "ev_2", "q1"].some(isUuid)).toBe(false);
  for (let i = 0; i < 20; i++) expect(isUuid(newRecordId())).toBe(true);
});
test("delayed unlock retries verification, never repeats a purchase", async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await reconcileUntilVerified({
    isCurrent: () => true,
    reconcile: async () => {
      calls++;
    },
    refresh: async () => {},
    hasPaidAccess: () => calls === 3,
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  expect(result).toBe("paid");
  expect(calls).toBe(3);
  expect(waits).toEqual([1000, 2000]);
});
test("restore remains pending after five failures; account switching cancels immediately", async () => {
  let calls = 0;
  const deps = {
    isCurrent: () => true,
    reconcile: async () => {
      calls++;
      throw new Error("database failed");
    },
    refresh: async () => {},
    hasPaidAccess: () => false,
    wait: async () => {},
  };
  expect(await reconcileUntilVerified(deps)).toBe("pending");
  expect(calls).toBe(5);
  calls = 0;
  expect(await reconcileUntilVerified({ ...deps, isCurrent: () => calls === 0 })).toBe(
    "account-changed",
  );
  expect(calls).toBe(1);
});
test("trial or missing expiry cannot masquerade as paid Premium", () => {
  expect(
    accessTier(
      { entitlement: "premium", status: "premium", premiumExpiration: null, trialEnd: null },
      now,
    ),
  ).toBe("free");
  expect(
    accessTier(
      {
        entitlement: "premium",
        status: "trial",
        premiumExpiration: null,
        trialEnd: new Date(now + 1000).toISOString(),
      },
      now,
    ),
  ).toBe("trial");
});
