import { validateRuntimeOrigin } from "./runtime-origin.mjs";
const names = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "DEEPSEEK_API_KEY",
  "INSTALL_FINGERPRINT_PEPPER",
  "APP_ORIGIN",
];
const secrets = {};
for (const name of names) {
  if (!process.env[name])
    throw new Error(name + " is required in your private deployment environment.");
  secrets[name] = process.env[name];
}
validateRuntimeOrigin(secrets.APP_ORIGIN);
for (const name of [
  "STRIPE_LIVE_SECRET_KEY",
  "STRIPE_SANDBOX_SECRET_KEY",
  "PAYMENTS_LIVE_WEBHOOK_SECRET",
  "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
  "REVENUECAT_SECRET_API_KEY",
  "REVENUECAT_APP_ID",
  "REVENUECAT_WEBHOOK_AUTH",
])
  if (process.env[name]) secrets[name] = process.env[name];
if (secrets.INSTALL_FINGERPRINT_PEPPER.length < 32)
  throw new Error("Trial pepper requires at least 32 characters. Preserve an existing pepper.");
async function run(args, input) {
  const p = Bun.spawn(args, {
    stdin: input ? new Blob([input]) : "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await p.exited;
  if (status) throw new Error("Deployment command failed; no success is claimed.");
}
await run(["bun", "run", "build"]);
await run(
  ["bun", "x", "wrangler", "secret", "bulk", "--config", ".output/server/wrangler.json"],
  JSON.stringify(secrets),
);
await run(["bun", "x", "wrangler", "deploy", "--config", ".output/server/wrangler.json"]);
console.log(
  "Check " +
    secrets.APP_ORIGIN +
    "/api/health, then use that origin with bun run android:sync:prod.",
);
