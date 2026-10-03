import { validateRuntimeOrigin } from "./runtime-origin.mjs";
const saved = Bun.file(".questos-runtime-origin");
const deployment = JSON.parse(await Bun.file("wrangler.json").text());
const origin = validateRuntimeOrigin(
  process.env.CAPACITOR_SERVER_URL ||
    ((await saved.exists()) ? (await saved.text()).trim() : deployment.vars.APP_ORIGIN),
);
const response = await fetch(origin + "/api/health", {
  signal: AbortSignal.timeout(15000),
  redirect: "error",
});
if (!response.ok || (await response.json()).status !== "ready")
  throw new Error(
    "Independent QuestOS backend is not ready. Resolve the production health failure before syncing Android.",
  );
const proc = Bun.spawn(["bun", "x", "cap", "sync", "android"], {
  env: { ...process.env, CAPACITOR_SERVER_URL: origin },
  stdout: "inherit",
  stderr: "inherit",
});
const status = await proc.exited;
if (status) process.exit(status);
await Bun.write(".questos-runtime-origin", origin + "\n");
console.log(
  "Android now uses the verified independent QuestOS runtime. Open the android folder in Android Studio.",
);
