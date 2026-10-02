import { beforeAll, beforeEach, afterAll, test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
const db = new PGlite();
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002";
const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
beforeAll(async () => {
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;`,
  );
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  for (const id of [a, b])
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'test@example.invalid')", [id]);
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(
    "RESET ROLE;TRUNCATE billing_request_limits,billing_checkout_keys,billing_subscriptions,billing_events,billing_accounts,quests,assistant_proposals,ai_requests,ai_usage;UPDATE profiles SET subscription_status='free',entitlement='free',trial_start=NULL,trial_end=NULL,premium_expiration=NULL;UPDATE billing_configuration SET environment='live';",
  );
  for (const id of [a, b])
    for (const provider of ["stripe", "revenuecat"])
      await db.query("INSERT INTO billing_accounts VALUES($1,$2,'live',$3)", [id, provider, id]);
});
function event(overrides: Record<string, unknown> = {}) {
  return {
    provider: "stripe",
    environment: "live",
    eventId: crypto.randomUUID(),
    eventAt: date(-0.01),
    userId: a,
    customerId: a,
    subscriptionId: "sub_a",
    productId: "premium_annual",
    status: "active",
    paidUntil: date(30),
    failureSince: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}
async function apply(e = event()) {
  return (
    await db.query<{ ok: boolean }>("SELECT apply_billing_event($1::jsonb) ok", [JSON.stringify(e)])
  ).rows[0].ok;
}
async function snapshot(id = a) {
  return (
    await db.query<{
      s: {
        tier: string;
        subscription_status: string;
        premium_expiration: string | null;
        billing_provider: string | null;
        cancel_at_period_end: boolean;
      };
    }>("SELECT subscription_snapshot($1) s", [id])
  ).rows[0].s;
}
async function quest(type = "side", user = a, id = crypto.randomUUID()) {
  await db.query(
    "INSERT INTO quests(id,user_id,title,type,category,difficulty) VALUES($1,$2,'Test quest',$3,'coding','easy')",
    [id, user, type],
  );
  return id;
}
test("free, active trial, expired trial, paid, canceled, grace and expired paid", async () => {
  expect((await snapshot()).tier).toBe("free");
  await db.query(
    "UPDATE profiles SET subscription_status='trial',entitlement='premium',trial_end=$2 WHERE user_id=$1",
    [a, date(7)],
  );
  expect((await snapshot()).tier).toBe("trial");
  await db.query("UPDATE profiles SET trial_end=$2 WHERE user_id=$1", [a, date(-1)]);
  expect((await snapshot()).tier).toBe("free");
  await apply();
  expect((await snapshot()).tier).toBe("premium");
  await apply(event({ eventAt: date(-0.009), cancelAtPeriodEnd: true }));
  expect((await snapshot()).cancel_at_period_end).toBe(true);
  await apply(
    event({ eventAt: date(-0.008), status: "grace", paidUntil: date(-1), failureSince: date(-1) }),
  );
  expect((await snapshot()).subscription_status).toBe("grace");
  await apply(
    event({ eventAt: date(-0.007), status: "grace", paidUntil: date(-4), failureSince: date(-4) }),
  );
  expect((await snapshot()).tier).toBe("free");
  expect((await snapshot()).billing_provider).toBe("stripe");
});
test("grace does not slide with repeat billing failures", async () => {
  const failure = date(-2);
  await apply(event({ status: "grace", paidUntil: failure, failureSince: failure }));
  const first = await snapshot();
  await apply(
    event({ eventAt: date(-0.001), status: "grace", paidUntil: failure, failureSince: date(-1) }),
  );
  expect((await snapshot()).premium_expiration).toBe(first.premium_expiration);
});
test("duplicates and older expirations cannot revoke a current paid period", async () => {
  const e = event();
  expect(await apply(e)).toBe(true);
  expect(await apply(e)).toBe(false);
  expect(await apply(event({ eventAt: date(-1), status: "expired", paidUntil: date(-1) }))).toBe(
    false,
  );
  expect((await snapshot()).tier).toBe("premium");
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int n FROM subscription_events WHERE user_id=$1",
        [a],
      )
    ).rows[0].n,
  ).toBeGreaterThan(0);
});
test("refund arriving after reconciliation revokes same period, restore cannot resurrect it; paid renewal can", async () => {
  const paidUntil = date(30);
  await apply(event({ eventAt: date(-0.001), paidUntil }));
  await apply(event({ eventAt: date(-0.005), paidUntil, status: "revoked" }));
  expect((await snapshot()).tier).toBe("free");
  await apply(event({ eventAt: date(0), paidUntil }));
  expect((await snapshot()).tier).toBe("free");
  await apply(event({ eventAt: date(0), paidUntil: date(395) }));
  expect((await snapshot()).tier).toBe("premium");
});
test("provider overlap and environment isolation", async () => {
  await apply();
  await apply(
    event({
      provider: "revenuecat",
      subscriptionId: "GPA.1234",
      productId: "questos_premium_annual",
      status: "expired",
      paidUntil: date(-1),
    }),
  );
  expect((await snapshot()).tier).toBe("premium");
  await db.exec("UPDATE billing_configuration SET environment='sandbox'");
  expect((await snapshot()).tier).toBe("free");
});
test("receipt ownership conflict is rejected and rolls back event record", async () => {
  await apply(
    event({
      provider: "revenuecat",
      subscriptionId: "GPA.1234",
      productId: "questos_premium_annual",
    }),
  );
  const e = event({
    provider: "revenuecat",
    subscriptionId: "GPA.1234",
    productId: "questos_premium_annual",
    userId: b,
    customerId: b,
  });
  await expect(apply(e)).rejects.toThrow("ownership");
  expect(
    (await db.query("SELECT * FROM billing_events WHERE event_id=$1", [e.eventId])).rows,
  ).toHaveLength(0);
});
test("verified transfer batch moves one receipt atomically", async () => {
  const source = event({
    provider: "revenuecat",
    subscriptionId: "GPA.1234",
    productId: "questos_premium_annual",
  });
  await apply(source);
  const revoke = { ...source, eventId: "transfer-old", eventAt: date(0), status: "revoked" };
  const grant = {
    ...source,
    eventId: "transfer-new",
    eventAt: revoke.eventAt,
    userId: b,
    customerId: b,
  };
  await db.query("SELECT apply_billing_batch($1::jsonb)", [JSON.stringify([revoke, grant])]);
  expect((await snapshot(a)).tier).toBe("free");
  expect((await snapshot(b)).tier).toBe("premium");
});
test("invalid batch rolls back preceding valid events", async () => {
  await expect(
    db.query("SELECT apply_billing_batch($1::jsonb)", [
      JSON.stringify([event(), event({ customerId: "forged" })]),
    ]),
  ).rejects.toThrow();
  expect((await snapshot()).tier).toBe("free");
});
test("all billing and premium data/RPCs are server only, including cross-user premium check", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec("SET ROLE " + role);
    for (const sql of [
      `SELECT subscription_snapshot('${a}')`,
      `SELECT has_active_premium('${b}')`,
      `SELECT * FROM premium_documents`,
      `SELECT * FROM billing_accounts`,
      `SELECT apply_billing_batch('[]')`,
      `SELECT confirm_assistant_plan('${a}','${b}')`,
    ])
      await expect(db.exec(sql)).rejects.toThrow();
    await db.exec("RESET ROLE");
  }
});
test("client cannot bypass free quest or project limits; existing edits and completion remain usable", async () => {
  for (let i = 0; i < 3; i++) await quest("main");
  await expect(quest("main")).rejects.toThrow("FREE_PROJECT_LIMIT");
  for (let i = 0; i < 22; i++) await quest();
  await expect(quest()).rejects.toThrow("FREE_QUEST_LIMIT");
  const ids = (await db.query<{ id: string }>("SELECT id FROM quests")).rows;
  await db.query("UPDATE quests SET title='Edited' WHERE id=$1", [ids[0].id]);
  await db.query("UPDATE quests SET status='completed' WHERE id=$1", [ids[0].id]);
  await quest();
});
test("queued concurrent creates cannot exceed the last free slot", async () => {
  for (let i = 0; i < 24; i++) await quest();
  const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => quest()));
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
});
test("downgrade preserves over-limit quests, blocks additions only", async () => {
  await apply();
  for (let i = 0; i < 27; i++) await quest();
  await apply(event({ eventAt: date(0), status: "expired", paidUntil: date(-1) }));
  await db.exec("UPDATE quests SET title='Retained'");
  expect((await db.query<{ n: number }>("SELECT count(*)::int n FROM quests")).rows[0].n).toBe(27);
  await expect(quest()).rejects.toThrow("FREE_QUEST_LIMIT");
});
test("premium AI routes cannot reserve as Free and caller quota overrides are ignored", async () => {
  await expect(
    db.query("SELECT reserve_ai_request($1,'future_me',1000,1000,1000)", [a]),
  ).rejects.toThrow("Premium");
  const row = await db.query<{ r: { limit: number } }>(
    "SELECT reserve_ai_request($1,'morning_brief',1000,1000,1000) r",
    [a],
  );
  expect(row.rows[0].r.limit).toBe(10);
});
test("assistant confirmation checks owner, versions, expiry and is idempotent", async () => {
  await apply();
  const id = await quest();
  const q = (
    await db.query<{ updated_at: Date }>("SELECT updated_at FROM quests WHERE id=$1", [id])
  ).rows[0];
  const proposal = crypto.randomUUID();
  await db.query("INSERT INTO assistant_proposals(id,user_id,actions) VALUES($1,$2,$3)", [
    proposal,
    a,
    JSON.stringify([
      {
        id,
        date: "2026-11-01",
        startTime: "10:00",
        minutes: 30,
        version: new Date(q.updated_at).toISOString(),
      },
    ]),
  ]);
  await expect(db.query("SELECT confirm_assistant_plan($1,$2)", [b, proposal])).rejects.toThrow();
  await db.query("SELECT confirm_assistant_plan($1,$2)", [a, proposal]);
  await db.query("SELECT confirm_assistant_plan($1,$2)", [a, proposal]);
  expect(
    (await db.query<{ start_time: string }>("SELECT start_time FROM quests WHERE id=$1", [id]))
      .rows[0].start_time,
  ).toBe("10:00");
  const stale = crypto.randomUUID();
  await db.query("INSERT INTO assistant_proposals(id,user_id,actions) VALUES($1,$2,$3)", [
    stale,
    a,
    JSON.stringify([{ id, date: "2026-11-01", startTime: "12:00", version: date(-2) }]),
  ]);
  await expect(db.query("SELECT confirm_assistant_plan($1,$2)", [a, stale])).rejects.toThrow(
    "stale",
  );
});
test("billing refresh is bounded and checkout retries share one server idempotency key", async () => {
  for (let i = 0; i < 12; i++) await db.query("SELECT take_billing_request($1)", [a]);
  await expect(db.query("SELECT take_billing_request($1)", [a])).rejects.toThrow("limit");
  const keys = await Promise.all(
    Array.from({ length: 8 }, () =>
      db.query<{ k: { key: string } }>("SELECT billing_checkout_key($1,'live') k", [a]),
    ),
  );
  expect(new Set(keys.map((r) => r.rows[0].k.key)).size).toBe(1);
  const other = (
    await db.query<{ k: { key: string } }>("SELECT billing_checkout_key($1,'sandbox') k", [a])
  ).rows[0].k.key;
  expect(other).not.toBe(keys[0].rows[0].k.key);
});
test("authenticated direct inserts obey limits and ownership rules", async () => {
  for (let i = 0; i < 25; i++) await quest();
  await db.exec("GRANT SELECT,INSERT,UPDATE,DELETE ON quests TO authenticated");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
  await db.exec("SET ROLE authenticated");
  await expect(quest()).rejects.toThrow("FREE_QUEST_LIMIT");
  await expect(quest("side", b)).rejects.toThrow();
  await db.exec("RESET ROLE");
});
