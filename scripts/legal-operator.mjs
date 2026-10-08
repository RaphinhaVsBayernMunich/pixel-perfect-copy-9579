import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function validateLegalOperator(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200)
    throw new Error(
      "LEGAL_OPERATOR_NAME must contain the owner's actual legal name (1–200 characters).",
    );
  if (/[\p{Cc}\p{Cf}]/u.test(value))
    throw new Error("LEGAL_OPERATOR_NAME must be a single line without control characters.");
  return value.trim();
}

export function listingCopyReady(listing) {
  const fence = "`".repeat(
    Math.max(
      3,
      ...Array.from(listing.fullDescription.matchAll(/`+/g), (match) => match[0].length + 1),
    ),
  );
  return `# QuestOS — copy-ready English store listing\n\nApp name: **${listing.title}**\n\nCategory: **Productivity**; app type: **App**.\n\nContact email: founder@questos.net\nWebsite: https://questos.questos-1fd92776.workers.dev\nPrivacy: https://questos.questos-1fd92776.workers.dev/legal/privacy\nDeletion: https://questos.questos-1fd92776.workers.dev/legal/delete-account\n\n## Short description\n\n${listing.shortDescription}\n\n## Full description\n\n${fence}text\n${listing.fullDescription}\n${fence}\n\nSource: play-listing.en-US.json. Use the legal-operator.md process to insert the owner-supplied name consistently. Prepared locally; no review submission or Production publication.\n`;
}

export function legalOperatorUpdates(value, root) {
  const name = validateLegalOperator(value);
  const listing = JSON.parse(
    fs.readFileSync(path.join(root, "docs/store/play-listing.en-US.json"), "utf8"),
  );
  // The title remains the product brand. The public description gets a separate operator line.
  listing.fullDescription =
    listing.fullDescription.replace(/\n\nOperator: [^\n]*$/, "") + `\n\nOperator: ${name}`;
  if (listing.fullDescription.length > 4000)
    throw new Error("Updated Play description exceeds 4000 characters.");
  const metadata = JSON.parse(
    fs.readFileSync(path.join(root, "docs/store/play-console-values.json"), "utf8"),
  );
  metadata.legalOperatorName = name;
  return {
    "src/lib/config/legal-operator.json":
      JSON.stringify({ legalOperatorName: name }, null, 2) + "\n",
    "docs/store/play-listing.en-US.json": JSON.stringify(listing, null, 2) + "\n",
    "docs/store/play-listing-copy-ready.md": listingCopyReady(listing),
    "docs/store/play-console-values.json": JSON.stringify(metadata, null, 2) + "\n",
    "docs/store/legal-operator.md": `# QuestOS legal operator\n\nLegal operator: ${name.replace(/[\\`*_{}\[\]<>#|]/g, "\\$&")}\n\nThis owner-supplied public identity is shared by the privacy, terms and deletion pages, compliance identity record and prepared JSON/copy-ready Play description.\nSupport/privacy: founder@questos.net. Product brand: QuestOS.\n\n## Update process\n\n\`\`\`powershell\n$env:LEGAL_OPERATOR_NAME = Read-Host 'Exact legal operator name'\nbun scripts/legal-operator.mjs\nRemove-Item Env:LEGAL_OPERATOR_NAME\n\`\`\`\n\nPlay developer/payment identity must be entered and verified privately in Console; this command does not modify an account or make an attestation. Re-run with the corrected LEGAL_OPERATOR_NAME if needed.\n\nAfter reviewing the diff, run the checks, deploy the existing Worker, and commit/push the public changes. No AAB rebuild is needed for these remote legal pages.\n`,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const updates = legalOperatorUpdates(process.env.LEGAL_OPERATOR_NAME, root);
  const originals = Object.fromEntries(
    Object.keys(updates).map((file) => [file, fs.readFileSync(path.join(root, file))]),
  );
  const written = [];
  try {
    for (const [file, body] of Object.entries(updates)) {
      fs.writeFileSync(path.join(root, file), body);
      written.push(file);
    }
  } catch {
    for (const file of written) fs.writeFileSync(path.join(root, file), originals[file]);
    throw new Error("Legal operator update failed; original files restored.");
  }
  console.log(
    "Public legal identity, legal-page source, compliance identity and Play metadata updated. Review, test and deploy before submitting policy forms.",
  );
}
