/** Owner CLI only. Never import into the app or print credential/provider response bodies. */
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const destination = "https://kqsoccbtookvwelctyhm.supabase.co";
const output = process.env.QUESTOS_REVIEWER_CREDENTIAL_FILE;
if (
  output &&
  (!path.isAbsolute(output) ||
    !path.resolve(output).toLowerCase().startsWith("c:\\questos-secrets\\"))
)
  throw new Error(
    "Reviewer credentials must remain in the private owner secrets directory outside the repository.",
  );
if (!output || !fs.existsSync(output))
  throw new Error(
    "Prepare the owner-only private credential file first and set QUESTOS_REVIEWER_CREDENTIAL_FILE.",
  );
const file = JSON.parse(fs.readFileSync(output, "utf8"));
if (Object.keys(file).length)
  throw new Error(
    "Private credential file must be empty JSON; existing credentials will not be replaced.",
  );
let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  const proc = Bun.spawn(
    [
      "bun",
      "x",
      "supabase",
      "projects",
      "api-keys",
      "--project-ref",
      "kqsoccbtookvwelctyhm",
      "--output",
      "json",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [body] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if (await proc.exited)
    throw new Error("Owner Supabase CLI authorization unavailable. No credentials printed.");
  const keys = JSON.parse(body);
  key = keys.find((item) => item.name === "service_role")?.api_key;
}
if (!key) throw new Error("Owner service-role access unavailable.");
const admin = createClient(destination, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `play-reviewer-${randomUUID()}@questos-review.invalid`;
const password = randomBytes(32).toString("base64url");
const expires = new Date(Date.now() + 365 * 86400000).toISOString();
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { purpose: "google-play-review", review_access_expires_at: expires },
});
if (error || !data.user)
  throw new Error("Reviewer account creation failed. No private response printed.");
// Save immediately so owner can recover/reset this account if a later operation fails.
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      email,
      password,
      userId: data.user.id,
      createdAt: new Date().toISOString(),
      reviewAccessExpiresAt: expires,
      purpose: "google-play-review",
      destination,
    },
    null,
    2,
  ),
);
// Existing backend-controlled trial grants premium features without fake receipts or paid access.
const { error: updateError } = await admin
  .from("profiles")
  .update({
    display_name: "Play reviewer",
    subscription_status: "trial",
    entitlement: "premium",
    current_plan: "trial",
    trial_start: new Date().toISOString(),
    trial_end: expires,
  })
  .eq("user_id", data.user.id);
if (updateError)
  throw new Error(
    "Reviewer credentials saved privately, but review access setup failed; contact owner support.",
  );
const { data: state, error: stateError } = await admin.rpc("subscription_snapshot", {
  _user_id: data.user.id,
});
if (stateError || state?.tier !== "trial" || state?.entitlement !== "premium")
  throw new Error(
    "Reviewer premium-feature access verification failed. Credentials remain private.",
  );
const publishable =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  JSON.parse(fs.readFileSync("wrangler.json", "utf8")).vars.SUPABASE_PUBLISHABLE_KEY;
const client = createClient(destination, publishable, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: login, error: loginError } = await client.auth.signInWithPassword({
  email,
  password,
});
if (loginError || login.user?.id !== data.user.id)
  throw new Error("Reviewer password login verification failed. No private response printed.");
await client.auth.signOut();
console.log(
  "Dedicated reviewer created. Password login verified. Server-controlled review trial grants premium features; no purchase or receipt fabricated. Credentials saved only in the owner-only private file.",
);
