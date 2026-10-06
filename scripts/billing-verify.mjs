import fs from "node:fs";
import { googlePlayAccessToken } from "./google-play-auth.mjs";
import path from "node:path";
import { mapping, verifyPlayProduct, verifyRevenueCatMapping } from "./billing-contract-checks.mjs";
import {
  PLAY_PRODUCT,
  PLAY_BASE_PLAN,
  RC_ENTITLEMENT,
  RC_OFFERING,
  RC_PACKAGE,
} from "../src/lib/subscription/billing-contracts.ts";
import { validateRuntimeOrigin } from "./runtime-origin.mjs";

// Read-only: no purchase, customer mutation, receipt grant, credential creation or configuration change.
const failures = [];
async function check(name, action) {
  try {
    await action();
    console.log(`PASS ${name}`);
  } catch (error) {
    // Only messages authored here are safe. Never print provider bodies, command output or credentials.
    const message =
      error instanceof CheckError
        ? error.message
        : "Verification failed; inspect access/configuration privately.";
    failures.push(name);
    console.log(`FAIL ${name}: ${message}`);
  }
}
class CheckError extends Error {}
const requireValue = (name) => {
  const value = process.env[name];
  if (!value) throw new CheckError(`${name} is required in the local private environment.`);
  return value;
};
async function command(args) {
  const child = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  const [output] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (await child.exited)
    throw new CheckError("CLI authentication, access or verification is unavailable.");
  return output;
}
async function json(url, headers = {}, allowEmpty = false) {
  const response = await fetch(url, {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new CheckError(`Read-only provider check returned HTTP ${response.status}.`);
  // Google returns 204 when the subscription has no offers (and therefore no store trial).
  if (allowEmpty && response.status === 204) return {};
  const body = await response.text();
  if (body.length > 1048576)
    throw new CheckError("Provider response exceeded the safe size limit.");
  return JSON.parse(body);
}
async function rcList(route) {
  const root = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(requireValue("REVENUECAT_PROJECT_ID"))}`;
  // Probe suitability of the one existing backend key; do not presume a second key exists.
  const headers = { Authorization: `Bearer ${requireValue("REVENUECAT_SECRET_API_KEY")}` };
  let url = root + route;
  const items = [];
  for (let pages = 0; pages < 20; pages++) {
    const result = await json(url, headers);
    items.push(...(result.items ?? []));
    if (!result.next_page) return items;
    url = new URL(result.next_page, "https://api.revenuecat.com").href;
    if (!url.startsWith(root + "/")) throw new CheckError("Unsafe provider pagination URL.");
  }
  throw new CheckError("Provider pagination limit exceeded.");
}
const config = JSON.parse(fs.readFileSync("wrangler.json", "utf8"));
const origin = validateRuntimeOrigin(config.vars.APP_ORIGIN);
const gcloud =
  process.env.QUESTOS_GCLOUD_PATH ||
  (process.platform === "win32" &&
  fs.existsSync("supabase/.temp/google-cli/google-cloud-sdk/bin/gcloud.cmd")
    ? path.resolve("supabase/.temp/google-cli/google-cloud-sdk/bin/gcloud.cmd")
    : "gcloud");
const googleCommand = (args) =>
  command(
    process.platform === "win32" && gcloud.endsWith(".cmd")
      ? ["cmd.exe", "/d", "/c", gcloud, ...args]
      : [gcloud, ...args],
  );

await check("canonical IDs and Android runtime", async () => {
  if (
    PLAY_PRODUCT !== mapping.playProduct ||
    PLAY_BASE_PLAN !== mapping.basePlan ||
    RC_ENTITLEMENT !== mapping.entitlement ||
    RC_OFFERING !== mapping.offering ||
    RC_PACKAGE !== mapping.package
  )
    throw new CheckError("Canonical source mappings differ.");
  const native = JSON.parse(
    fs.readFileSync("android/app/src/main/assets/capacitor.config.json", "utf8"),
  );
  if (
    native.appId !== mapping.packageId ||
    native.server?.url !== origin ||
    native.server.cleartext !== false
  )
    throw new CheckError("Native application ID or production runtime is incorrect.");
  if (
    !/^goog_[A-Za-z0-9]+$/.test(native.plugins?.QuestOSNative?.revenueCatAndroidKey ?? "") ||
    native.plugins.QuestOSNative.revenueCatAndroidKey !==
      requireValue("VITE_REVENUECAT_ANDROID_KEY")
  )
    throw new CheckError(
      "Packaged Android public billing key does not match the production client.",
    );
});
await check("source and generated secret scan", () =>
  command([process.execPath, "run", "security:scan"]),
);
await check("live Supabase schema, RLS and billing authority (rollback only)", () =>
  command([
    process.execPath,
    "x",
    "supabase",
    "db",
    "query",
    "--linked",
    "--project-ref",
    "kqsoccbtookvwelctyhm",
    "--file",
    "scripts/verify-destination.sql",
  ]),
);
await check("production backend health", async () => {
  if ((await json(origin + "/api/health")).status !== "ready")
    throw new CheckError("Production runtime is not ready.");
});
await check("production billing server configuration", async () => {
  if ((await json(origin + "/api/billing/health")).status !== "configured")
    throw new CheckError("Production RevenueCat server configuration is incomplete.");
});
await check("Cloudflare billing secrets", async () => {
  const secrets = JSON.parse(
    await command([
      process.execPath,
      "x",
      "wrangler",
      "secret",
      "list",
      "--config",
      "wrangler.json",
    ]),
  );
  for (const name of ["REVENUECAT_SECRET_API_KEY", "REVENUECAT_APP_ID", "REVENUECAT_WEBHOOK_AUTH"])
    if (!secrets.some((s) => s.name === name))
      throw new CheckError(`${name} is missing from the Worker secret manager.`);
});
await check("Google APIs and dedicated service account", async () => {
  const project = "questos-510417";
  const enabled = await googleCommand([
    "services",
    "list",
    "--enabled",
    `--project=${project}`,
    "--format=value(config.name)",
  ]);
  for (const api of [
    "androidpublisher.googleapis.com",
    "playdeveloperreporting.googleapis.com",
    "pubsub.googleapis.com",
  ])
    if (!enabled.split(/\s+/).includes(api)) throw new CheckError(`${api} is not enabled.`);
  await googleCommand([
    "iam",
    "service-accounts",
    "describe",
    `questos-revenuecat@${project}.iam.gserviceaccount.com`,
    `--project=${project}`,
    "--format=value(email)",
  ]);
});
await check("Google RTDN topic and publisher permission", async () => {
  const topic = "projects/questos-510417/topics/questos-revenuecat";
  await googleCommand(["pubsub", "topics", "describe", topic, "--format=value(name)"]);
  const policy = JSON.parse(
    await googleCommand(["pubsub", "topics", "get-iam-policy", topic, "--format=json"]),
  );
  if (
    !policy.bindings?.some(
      (b) =>
        b.role === "roles/pubsub.publisher" &&
        !b.condition &&
        b.members?.includes(
          "serviceAccount:google-play-developer-notifications@system.gserviceaccount.com",
        ),
    )
  )
    throw new CheckError("Google Play RTDN publisher permission is missing.");
});
await check("Google Play monthly product and no stacked store trial", async () => {
  const token = await googlePlayAccessToken();
  const root = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${mapping.packageId}/subscriptions/${mapping.playProduct}`;
  const headers = { Authorization: `Bearer ${token}` };
  const product = await json(root, headers);
  const offers = await json(root + `/basePlans/${mapping.basePlan}/offers`, headers, true);
  const annual = await json(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${mapping.packageId}/subscriptions/questos_premium_annual`,
    headers,
  );
  if (!annual.basePlans?.some((plan) => plan.basePlanId === "annual" && plan.state === "INACTIVE"))
    throw new CheckError("Historical annual base plan must remain inactive for new purchases.");
  if (offers.nextPageToken)
    throw new CheckError("Multiple offer pages require review; readiness cannot be assumed.");
  try {
    verifyPlayProduct(product, offers.subscriptionOffers ?? []);
  } catch (e) {
    throw new CheckError(e.message);
  }
});
await check("RevenueCat app, product, entitlement, offering and package", async () => {
  const appId = requireValue("REVENUECAT_APP_ID");
  const [apps, products, entitlements, offerings] = await Promise.all([
    rcList("/apps"),
    rcList("/products"),
    rcList("/entitlements"),
    rcList("/offerings"),
  ]);
  const app = apps.find((a) => a.id === appId);
  const product = products.find(
    (p) => p.app_id === appId && p.store_identifier === mapping.rcProduct,
  );
  const entitlement = entitlements.find((e) => e.lookup_key === mapping.entitlement);
  const offering = offerings.find((o) => o.lookup_key === mapping.offering);
  if (!app || !product || !entitlement || !offering)
    throw new CheckError("Canonical RevenueCat catalog resources are missing.");
  const packages = await rcList(`/offerings/${encodeURIComponent(offering.id)}/packages`);
  const monthly = packages.find((p) => p.lookup_key === mapping.package);
  if (!monthly) throw new CheckError("$rc_monthly package is missing.");
  const [entitlementProducts, packageProducts] = await Promise.all([
    rcList(`/entitlements/${encodeURIComponent(entitlement.id)}/products`),
    rcList(`/packages/${encodeURIComponent(monthly.id)}/products`),
  ]);
  try {
    verifyRevenueCatMapping(app, product, entitlementProducts, offering, packageProducts, appId);
  } catch (e) {
    throw new CheckError(e.message);
  }
  const publicKey = requireValue("VITE_REVENUECAT_ANDROID_KEY");
  if (!publicKey.startsWith("goog_"))
    throw new CheckError("The public Android SDK key must use the goog_ prefix.");
  const keys = await rcList(`/apps/${encodeURIComponent(appId)}/public_api_keys`);
  if (
    !keys.some((k) => k.key === publicKey && k.app_id === appId && k.environment === "production")
  )
    throw new CheckError("Public SDK key is not verified against the selected RevenueCat app.");
  function clientFiles(root) {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(root, entry.name);
      return entry.isDirectory() ? clientFiles(file) : file.endsWith(".js") ? [file] : [];
    });
  }
  if (
    !clientFiles(".output/public").some((file) => fs.readFileSync(file, "utf8").includes(publicKey))
  )
    throw new CheckError(
      "The verified public SDK key is not embedded in the current production client build.",
    );
});
console.log(
  failures.length
    ? `EXTERNAL OWNER ACTION REQUIRED: ${failures.length} check(s) failed. No purchase attempted.`
    : "CONFIG READY. Device purchase/restore and RTDN delivery still require store testing.",
);
process.exitCode = failures.length ? 1 : 0;
