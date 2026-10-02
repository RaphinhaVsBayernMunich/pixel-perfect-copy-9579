import { beforeAll, afterAll, test, expect } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
const db = new PGlite();
const a = "11000000-0000-4000-8000-000000000001",
  b = "11000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;`,
  );
  for (const f of (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  for (const id of [a, b]) await db.query("INSERT INTO auth.users(id)VALUES($1)", [id]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
  await db.exec("SET ROLE authenticated");
}, 30000);
afterAll(() => db.close());
test("destination removes platform default anonymous writes and server-table writes", async () => {
  const result = await db.query<{ safe: boolean }>(`SELECT
    NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'
      AND has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE'))
    AND NOT has_table_privilege('authenticated','public.ai_usage','UPDATE')
    AND NOT has_table_privilege('authenticated','public.installations','UPDATE')
    AND NOT has_table_privilege('authenticated','public.subscription_events','INSERT') safe`);
  expect(result.rows[0].safe).toBe(true);
});
async function read() {
  return (
    await db.query<{
      s: {
        revision: number;
        profile: Record<string, unknown>;
        quests: { id: string }[];
        events: unknown[];
      };
    }>("SELECT read_account_save() s")
  ).rows[0].s;
}
function save(title = "New quest") {
  return {
    profile: {
      display_name: "Player",
      character_title: "Player",
      level: 1,
      total_xp: 0,
      category_xp: {},
      character_state: {},
      settings: {},
    },
    quests: [
      {
        id: crypto.randomUUID(),
        title,
        type: "side",
        category: "coding",
        priority: "medium",
        difficulty: "easy",
        xp_reward: 10,
        estimated_duration: 30,
        scheduled_for: null,
        start_time: null,
        status: "active",
      },
    ],
    events: [],
    achievements: [],
    deletedQuests: [],
    deletedEvents: [],
  };
}
async function write(revision: number, value: unknown) {
  return db.query("SELECT write_account_save($1,$2::jsonb)", [revision, JSON.stringify(value)]);
}
test("atomic save accepts normal fields and UUIDs; an old revision cannot overwrite it", async () => {
  const before = await read(),
    data = save();
  await write(before.revision, data);
  const after = await read();
  expect(after.quests.some((q) => q.id === data.quests[0].id)).toBe(true);
  expect(after.revision).toBeGreaterThan(before.revision);
  await expect(write(before.revision, save("Stale"))).rejects.toThrow("SYNC_CONFLICT");
  expect((await read()).revision).toBe(after.revision);
});
test("failed quest write rolls back profile edits and pending deletion atomically", async () => {
  const before = await read(),
    data = save();
  data.profile.display_name = "Must roll back";
  data.quests[0].id = "q_bad";
  data.deletedQuests = before.quests.map((q) => q.id) as never[];
  await expect(write(before.revision, data)).rejects.toThrow();
  const after = await read();
  expect(after.profile.display_name).toBe(before.profile.display_name);
  expect(after.quests).toEqual(before.quests);
  expect(after.revision).toBe(before.revision);
});
test("new sync RPC cannot write billing fields or another account and revision is read only", async () => {
  const before = await read(),
    data = save();
  Object.assign(data.profile, { entitlement: "premium", stripe_customer_id: "fake" });
  await expect(write(before.revision, data)).rejects.toThrow("Invalid editable profile fields");
  await expect(db.exec("UPDATE account_sync_revisions SET revision=0")).rejects.toThrow();
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [b]);
  expect((await read()).quests).toEqual([]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
});
test("direct edits and deletes invalidate cached save, preventing resurrection", async () => {
  const before = await read();
  await db.query("DELETE FROM quests WHERE id=$1", [before.quests[0].id]);
  const after = await read();
  expect(after.revision).toBeGreaterThan(before.revision);
  await expect(write(before.revision, save())).rejects.toThrow("SYNC_CONFLICT");
});
test("anonymous clients cannot read or write account snapshots", async () => {
  await db.exec("RESET ROLE; SET ROLE anon");
  await expect(read()).rejects.toThrow();
  await expect(write(0, save())).rejects.toThrow();
  await db.exec("RESET ROLE; SET ROLE authenticated");
});
