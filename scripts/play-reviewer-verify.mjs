import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Owner CLI only. Never imported into the app or bundled with store assets.
const credential = JSON.parse(
  fs.readFileSync("C:/QuestOS-Secrets/questos-play-reviewer.private.json", "utf8"),
);
const destination = "https://kqsoccbtookvwelctyhm.supabase.co";
if (credential.destination !== destination) throw new Error("Reviewer destination mismatch.");
const vars = JSON.parse(fs.readFileSync("wrangler.json", "utf8")).vars;
const client = createClient(destination, vars.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let loggedIn = false;
try {
  const { data, error } = await client.auth.signInWithPassword({
    email: credential.email,
    password: credential.password,
  });
  if (error || data.user?.id !== credential.userId)
    throw new Error("Reviewer password login failed.");
  loggedIn = true;
  const verified = await client.auth.getUser();
  if (verified.error || verified.data.user?.id !== credential.userId)
    throw new Error("Reviewer server user verification failed.");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("subscription_status,entitlement,trial_end")
    .eq("user_id", credential.userId)
    .single();
  if (
    profileError ||
    profile.subscription_status !== "trial" ||
    profile.entitlement !== "premium" ||
    Date.parse(profile.trial_end) <= Date.now()
  )
    throw new Error("Reviewer premium-feature trial is not active.");
  if (Date.parse(profile.trial_end) !== Date.parse(credential.reviewAccessExpiresAt))
    throw new Error("Reviewer original access expiry is not restored.");

  const source = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean);
  function walk(root) {
    return fs.existsSync(root)
      ? fs.readdirSync(root, { withFileTypes: true }).flatMap((item) => {
          const file = path.join(root, item.name);
          return item.isDirectory() ? walk(file) : [file];
        })
      : [];
  }
  let credentialLeaks = 0;
  for (const file of new Set([
    ...source,
    ...walk(".output/public"),
    ...walk("android/app/src/main/assets"),
  ])) {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
    const body = fs.readFileSync(file);
    if (
      body.includes(Buffer.from(credential.password)) ||
      body.includes(Buffer.from(credential.email))
    )
      credentialLeaks++;
  }
  if (credentialLeaks) throw new Error("Reviewer credentials found in source/assets.");
  console.log(
    JSON.stringify({
      passwordLogin: true,
      serverUserVerified: true,
      premiumTrialActive: true,
      originalReviewExpiryRestored: true,
      credentialLeaks: 0,
    }),
  );
} finally {
  // Default Supabase signOut revokes ALL of this account's sessions. End only this check's
  // session so browser/Android reviewers remain signed in and getUser continues to work.
  if (loggedIn) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw new Error("Reviewer verification session cleanup failed.");
  }
}
