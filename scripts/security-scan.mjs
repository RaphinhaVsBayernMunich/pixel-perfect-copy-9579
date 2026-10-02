import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const source = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walk(path.join(root, d.name)) : [path.join(root, d.name)]));
}
const built = [...walk("dist"), ...walk(".output"), ...walk("android/app/src/main/assets")];
const findings = [];
let count = 0;
const patterns = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "private-provider-key",
    /\b(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9]{24,}|sb_secret_[A-Za-z0-9_-]{16,}|rk_live_[A-Za-z0-9]{16,})\b/,
  ],
];
const extensions =
  /\.(?:[cm]?[jt]sx?|json|html|css|sql|md|xml|gradle|properties|toml|yml|yaml|txt|env|example|template|map)$/;
for (const file of new Set([...source, ...built])) {
  if (!fs.existsSync(file) || !extensions.test(file) || fs.statSync(file).size > 30000000) continue;
  const content = fs.readFileSync(file, "utf8");
  count++;
  for (const [kind, pattern] of patterns) if (pattern.test(content)) findings.push({ file, kind });
  for (const match of content.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g))
    try {
      if (
        JSON.parse(Buffer.from(match[0].split(".")[1], "base64url").toString()).role ===
        "service_role"
      )
        findings.push({ file, kind: "service-role-jwt" });
    } catch {}
  if (
    (file.replaceAll("\\", "/").startsWith("dist/client/") ||
      file.includes("assets/public") ||
      file.replaceAll("\\", "/").startsWith(".output/public/")) &&
    /DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY|REVENUECAT_SECRET_API_KEY|PAYMENTS_LIVE_WEBHOOK_SECRET/.test(
      content,
    )
  )
    findings.push({ file, kind: "server-secret-reference-in-client" });
}
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
for (const file of tracked)
  if (/(?:^|\/)\.env(?:\.|$)/.test(file) && !/(?:example|template)$/.test(file))
    findings.push({ file, kind: "tracked-environment-file" });
console.log(JSON.stringify({ filesScanned: count, findings }, null, 2));
if (findings.length) process.exitCode = 1;
