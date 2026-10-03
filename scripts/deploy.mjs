import { validateRuntimeOrigin } from "./runtime-origin.mjs";
const config = JSON.parse(await Bun.file("wrangler.json").text());
const origin = validateRuntimeOrigin(config.vars?.APP_ORIGIN);
if (config.account_id !== "1fd92776e215b9d1950228ce21ed4d1c" || config.name !== "questos")
  throw new Error("Use the verified owner Cloudflare account and QuestOS Worker.");
if (config.vars.SUPABASE_URL !== "https://kqsoccbtookvwelctyhm.supabase.co")
  throw new Error("Use the owner-controlled QuestOS Supabase destination.");
async function run(args, capture = false) {
  const p = Bun.spawn(args, {
    stdin: "inherit",
    stdout: capture ? "pipe" : "inherit",
    stderr: "inherit",
  });
  const output = capture ? await new Response(p.stdout).text() : undefined;
  if (await p.exited) throw new Error("Deployment command failed; no success is claimed.");
  return output;
}
await run(["bun", "run", "build"]);
const existing = JSON.parse(
  await run(["bun", "x", "wrangler", "secret", "list", "--config", "wrangler.json"], true),
);
for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "DEEPSEEK_API_KEY", "INSTALL_FINGERPRINT_PEPPER"])
  if (!existing.some((entry) => entry.name === name))
    await run(["bun", "x", "wrangler", "secret", "put", name, "--config", "wrangler.json"]);
await run(["bun", "x", "wrangler", "deploy", "--config", ".output/server/wrangler.json"]);
const r = await fetch(origin + "/api/health", {
  redirect: "error",
  signal: AbortSignal.timeout(15000),
});
if (!r.ok || (await r.json()).status !== "ready")
  throw new Error("Production health check failed; Android sync remains blocked.");
console.log("QuestOS production runtime verified: " + origin);
