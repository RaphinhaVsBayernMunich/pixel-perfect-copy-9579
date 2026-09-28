import { beforeAll, afterAll, beforeEach, describe, test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
const db = new PGlite();
const users = Array.from(
  { length: 20 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  for (const id of users)
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'test@example.invalid')", [id]);
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(
    "RESET ROLE; TRUNCATE public.ai_requests,public.ai_usage; UPDATE public.profiles SET subscription_status='free',entitlement='free',trial_end=NULL,premium_expiration=NULL;",
  );
});
type Reservation = {
  allowed: boolean;
  requestId?: string;
  reason?: string;
  used: number;
  limit: number;
};
async function reserve(user = users[0]): Promise<Reservation> {
  const result = await db.query<{ r: Reservation }>(
    "SELECT public.reserve_ai_request($1,'morning_brief',10,40,500) r",
    [user],
  );
  return result.rows[0].r;
}
async function finish(id: string) {
  await db.query("SELECT public.finish_ai_request($1,NULL,120,80)", [id]);
}
describe("real PostgreSQL migrations and atomic quotas", () => {
  test("signup survives all migrations and profile edits cannot grant premium or billing IDs", async () => {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [users[0]]);
    await db.exec("SET ROLE authenticated");
    await db.query("UPDATE public.profiles SET display_name='Allowed' WHERE user_id=$1", [
      users[0],
    ]);
    for (const assignment of [
      "entitlement='premium'",
      "subscription_status='premium'",
      "stripe_customer_id='fake'",
      "revenuecat_customer_id='fake'",
      "trial_end=now()+interval '100 days'",
    ]) {
      await expect(
        db.query(`UPDATE public.profiles SET ${assignment} WHERE user_id=$1`, [users[0]]),
      ).rejects.toThrow();
    }
    await db.exec("RESET ROLE");
    const result = await db.query<{ display_name: string }>(
      "SELECT display_name FROM public.profiles WHERE user_id=$1",
      [users[0]],
    );
    expect(result.rows[0].display_name).toBe("Allowed");
  });
  test("authenticated and anonymous roles cannot reserve, finish, mutate usage or read request metadata", async () => {
    for (const role of ["authenticated", "anon"]) {
      await db.exec(`SET ROLE ${role}`);
      await expect(reserve()).rejects.toThrow();
      await expect(finish(users[0])).rejects.toThrow();
      await expect(db.exec("SELECT * FROM public.ai_requests")).rejects.toThrow();
      await expect(db.exec("UPDATE public.ai_usage SET request_count=0")).rejects.toThrow();
      await expect(
        db.query("SELECT increment_ai_usage($1,'morning_brief')", [users[0]]),
      ).rejects.toThrow();
      await db.exec("RESET ROLE");
    }
    await db.exec("SET ROLE service_role");
    expect((await reserve()).allowed).toBe(true);
  });
  test("trial, paid, expired and null-expiry lifetime tiers use database state", async () => {
    const cases = [
      ["trial", "premium", "future", null, 40],
      ["trial", "premium", "past", null, 10],
      ["trial", "premium", null, null, 10],
      ["premium", "premium", null, "future", 500],
      ["premium", "premium", null, "past", 10],
      ["premium", "premium", null, null, 500],
      ["premium", "free", null, null, 10],
    ] as const;
    for (const [status, entitlement, trial, paid, limit] of cases) {
      const date = (s: string | null) =>
        s === null
          ? null
          : new Date(Date.now() + (s === "future" ? 86400000 : -86400000)).toISOString();
      await db.query(
        "UPDATE profiles SET subscription_status=$2,entitlement=$3,trial_end=$4,premium_expiration=$5 WHERE user_id=$1",
        [users[0], status, entitlement, date(trial), date(paid)],
      );
      const result = await reserve();
      expect(result.limit).toBe(limit);
      await finish(result.requestId!);
    }
  });
  test("parallel calls cannot exceed remaining quota; existing counts are preserved", async () => {
    await db.query("INSERT INTO ai_usage(user_id,request_count) VALUES($1,9)", [users[0]]);
    const results = await Promise.all(Array.from({ length: 12 }, () => reserve()));
    expect(results.filter((r) => r.allowed)).toHaveLength(1);
    expect(results.filter((r) => r.reason === "quota")).toHaveLength(11);
    const counts = await db.query<{ request_count: number }>("SELECT request_count FROM ai_usage");
    expect(counts.rows[0].request_count).toBe(10);
  });
  test("per-user concurrency is two and failure does not refund consumed quota", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => reserve()));
    expect(results.filter((r) => r.allowed)).toHaveLength(2);
    expect(results.filter((r) => r.reason === "busy")).toHaveLength(6);
    await db.query("SELECT finish_ai_request($1,'AI_NETWORK',NULL,NULL)", [
      results.find((r) => r.allowed)!.requestId,
    ]);
    expect((await reserve()).used).toBe(3);
  });
  test("global concurrency is sixteen across users; expired leases release slots", async () => {
    const results = await Promise.all(users.map((id) => reserve(id)));
    expect(results.filter((r) => r.allowed)).toHaveLength(16);
    await db.exec("UPDATE ai_requests SET lease_expires_at=now()-interval '1 second'");
    expect((await reserve(users[19])).allowed).toBe(true);
  });
  test("daily global circuit breaker and missing profiles fail closed", async () => {
    await db.query(
      "INSERT INTO ai_requests(user_id,feature,status) SELECT $1,'morning_brief','failed' FROM generate_series(1,10000)",
      [users[0]],
    );
    expect((await reserve()).reason).toBe("busy");
    await expect(reserve("00000000-0000-4000-8000-999999999999")).rejects.toThrow();
  });
  test("completion records tokens only; invalid metadata is rejected", async () => {
    const result = await reserve();
    await finish(result.requestId!);
    const rows = await db.query<{ status: string; input_tokens: number; output_tokens: number }>(
      "SELECT status,input_tokens,output_tokens FROM ai_requests",
    );
    expect(rows.rows[0]).toEqual({ status: "succeeded", input_tokens: 120, output_tokens: 80 });
    const second = await reserve();
    await expect(
      db.query("SELECT finish_ai_request($1,'raw-provider-error',0,0)", [second.requestId]),
    ).rejects.toThrow();
  });
});
