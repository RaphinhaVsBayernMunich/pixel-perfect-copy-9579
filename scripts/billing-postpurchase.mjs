import fs from "node:fs";
import { z } from "zod";
import { parseRevenueCatRecords } from "../src/lib/subscription/revenuecat-contracts.ts";
import { fetchRevenueCatSubscriber } from "../src/lib/subscription/revenuecat-http.server.ts";

// No purchase or entitlement mutation. Quota probes are rolled back.
// The provider GET is used only after an existing paid billing identity is confirmed;
// RevenueCat may recreate an empty customer if its existing customer was deleted.
const uuid = z.string().uuid();
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (index % 2 === 0) pairs.push([value, all[index + 1]]);
    return pairs;
  }, []),
);
class VerificationFailure extends Error {}
const fail = (message) => {
  throw new VerificationFailure(message);
};
async function query(sql) {
  const file = `supabase/.temp/postpurchase-${crypto.randomUUID()}.sql`;
  fs.mkdirSync("supabase/.temp", { recursive: true });
  fs.writeFileSync(file, sql);
  try {
    const child = Bun.spawn(
      [
        process.execPath,
        "x",
        "supabase",
        "db",
        "query",
        "--linked",
        "--project-ref",
        "kqsoccbtookvwelctyhm",
        "--output",
        "json",
        "--file",
        file,
      ],
      { stdin: "ignore", stdout: "pipe", stderr: "pipe" },
    );
    const [output] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if (await child.exited) fail("Database verification failed; inspect trusted access privately.");
    if (output.length > 262144) fail("Database response exceeded the verification limit.");
    const parsed = JSON.parse(output.slice(output.indexOf("{"), output.lastIndexOf("}") + 1));
    return (
      parsed.rows?.find((row) => row.result)?.result ??
      fail("Database verification result missing.")
    );
  } finally {
    fs.unlinkSync(file);
  }
}
try {
  const a = uuid.parse(args["--account-a"]).toLowerCase();
  const b = uuid.parse(args["--account-b"]).toLowerCase();
  if (a === b) fail("Two distinct account UUIDs are required.");
  const after = new Date(
    z.string().datetime({ offset: true }).parse(args["--after"]),
  ).toISOString();
  const phase = z.enum(["purchase", "restore"]).parse(args["--phase"]);
  const eventId = z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,100}$/)
    .parse(args["--webhook-event-id"]);
  const state = await query(`BEGIN; SELECT jsonb_build_object(
    'accounts_exist',(SELECT count(*)=2 FROM public.profiles WHERE user_id IN ('${a}','${b}')),
    'identity_exists',EXISTS(SELECT 1 FROM public.billing_accounts WHERE user_id='${a}' AND customer_id='${a}' AND provider='revenuecat' AND environment='live'),
    'snapshot',public.subscription_snapshot('${a}'),
    'receipts',(SELECT COALESCE(jsonb_agg(jsonb_build_object('receipt',subscription_id,'product',product_id)), '[]'::jsonb) FROM public.billing_subscriptions WHERE user_id='${a}' AND customer_id='${a}' AND provider='revenuecat' AND environment='live' AND status='active' AND paid_until>now()),
    'webhook_received',EXISTS(SELECT 1 FROM public.subscription_events s JOIN public.billing_events e ON e.event_id=s.metadata->>'event_id' AND e.provider=s.source AND e.environment=s.metadata->>'environment' WHERE s.user_id='${a}' AND s.source='revenuecat' AND s.product_id='questos_premium_monthly:monthly' AND s.metadata->>'environment'='live' AND s.metadata->>'event_id'='${eventId}:${a}:questos_premium_monthly:monthly' AND e.received_at>='${after}'::timestamptz)
  ) AS result; ROLLBACK;`);
  if (!state.accounts_exist || !state.identity_exists)
    fail("Existing paid UUID billing identity is not confirmed; provider lookup skipped.");
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) fail("Private subscriber verification key is unavailable.");
  const payload = await fetchRevenueCatSubscriber(a, key);
  if (payload?.subscriber?.original_app_user_id !== a)
    fail("RevenueCat original identity differs; investigate aliases/ownership privately.");
  const events = parseRevenueCatRecords(payload, {
    userId: a,
    eventId: "postpurchase-verification",
    eventAt: new Date().toISOString(),
    env: "live",
  });
  const active = events.find(
    (event) => event.productId === "questos_premium_monthly:monthly" && event.status === "active",
  );
  if (
    !active ||
    !state.receipts.some(
      (receipt) =>
        receipt.receipt === active.subscriptionId && receipt.product === active.productId,
    )
  )
    fail("Active monthly Premium provider receipt does not match backend ownership.");
  if (
    state.snapshot.tier !== "premium" ||
    state.snapshot.current_plan !== "premium_monthly" ||
    state.snapshot.billing_provider !== "revenuecat"
  )
    fail("Backend monthly Premium snapshot is not active.");
  if (phase === "restore" && Date.parse(state.snapshot.last_verification) < Date.parse(after))
    fail("Backend has not recorded verification after the requested restore time.");
  const checks = await query(`BEGIN;
    SELECT set_config('request.jwt.claim.sub','${b}',true);
    SET LOCAL ROLE authenticated;
    DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id='${a}') OR EXISTS(SELECT 1 FROM public.quests WHERE user_id='${a}') THEN
        RAISE EXCEPTION 'Account isolation failed';
      END IF;
    END $$;
    RESET ROLE;
    SET LOCAL ROLE service_role;
    SELECT jsonb_build_object('quota',public.reserve_ai_request('${a}','morning_brief',1,1,1),
      'receipt_isolated',NOT EXISTS(SELECT 1 FROM public.billing_subscriptions WHERE user_id='${b}' AND provider='revenuecat' AND environment='live' AND subscription_id='${active.subscriptionId}'),
      'other_account_snapshot',public.subscription_snapshot('${b}')) AS result;
    ROLLBACK;`);
  if (checks.quota?.limit !== 500)
    fail("Verified Premium quota is not 500/day; retry if concurrency prevents a quota probe.");
  if (!checks.receipt_isolated) fail("Receipt ownership is not isolated between accounts.");
  console.log("PASS Supabase UUID / RevenueCat identity / active monthly premium entitlement");
  console.log(
    "PASS backend receipt, Premium snapshot, 500/day quota (probe rolled back), and database account isolation",
  );
  if (!state.webhook_received)
    fail("The specified real RevenueCat webhook event is not recorded after the supplied time.");
  console.log("PASS specified provider webhook event ingestion");
  if (phase === "restore")
    console.log("PASS paid receipt preserved and backend verification recorded after restore");
  console.log(
    "Device unlock, restart, Restore UI and local account switching require owner observation. RTDN's provider hop is verified separately; database ingestion alone does not prove it.",
  );
} catch (error) {
  // Never display provider bodies, database output, receipt IDs or raw exception messages.
  if (error instanceof VerificationFailure) console.error(error.message);
  console.error(
    "POST-PURCHASE VERIFICATION INCOMPLETE. Check the supplied UUIDs, phase/time/event ID, private access and paid state. No entitlement was granted.",
  );
  process.exitCode = 1;
}
