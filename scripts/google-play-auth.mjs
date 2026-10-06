import fs from "node:fs";
import { createSign } from "node:crypto";
let cached;
const defaultCredential = "C:/QuestOS-Secrets/questos-revenuecat.service-account.json";
export async function googlePlayAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires > now + 60) return cached.token;
  const c = JSON.parse(
    fs.readFileSync(process.env.QUESTOS_PLAY_CREDENTIAL_FILE || defaultCredential, "utf8"),
  );
  if (
    c.project_id !== "questos-510417" ||
    c.client_email !== "questos-revenuecat@questos-510417.iam.gserviceaccount.com" ||
    typeof c.private_key !== "string"
  )
    throw new Error("Unexpected Play service-account identity");
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: c.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  const assertion = `${data}.${signer.sign(c.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Play service-account authentication failed (HTTP ${response.status})`);
  const body = await response.json();
  if (typeof body.access_token !== "string" || !body.access_token)
    throw new Error("Google did not return an access token");
  cached = {
    token: body.access_token,
    expires: now + Math.min(Number(body.expires_in) || 3600, 3600),
  };
  return cached.token;
}
