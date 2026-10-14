import fs from "node:fs";
import { createHash } from "node:crypto";
import { googlePlayAccessToken } from "./google-play-auth.mjs";

const apply = process.argv.includes("--apply");
const assetGroups = {
  icon: ["docs/store/questos-icon-512.png"],
  featureGraphic: ["docs/store/questos-feature-graphic.png"],
  phoneScreenshots: [
    "docs/store/screenshots/01-dashboard.png",
    "docs/store/screenshots/02-quest-board.png",
    "docs/store/screenshots/03-advanced-analytics.png",
    "docs/store/screenshots/04-premium-memory.png",
    "docs/store/screenshots/05-ai-coach.png",
  ],
};
const assetBytes = new Map();
if (apply) {
  const manifest = JSON.parse(fs.readFileSync("docs/store/store-assets-manifest.json", "utf8"));
  for (const file of Object.values(assetGroups).flat()) {
    const bytes = fs.readFileSync(file);
    const expected = manifest.find((item) => item.file === file);
    if (expected && createHash("sha256").update(bytes).digest("hex") !== expected.sha256)
      throw new Error("Prepared store asset differs from its verified manifest; no edit created.");
    assetBytes.set(file, bytes);
  }
}
const listing = JSON.parse(fs.readFileSync("docs/store/play-listing.en-US.json", "utf8"));
if (
  listing.title.length > 30 ||
  listing.shortDescription.length > 80 ||
  listing.fullDescription.length > 4000
)
  throw new Error("Store listing exceeds Play field limits");
const headers = {
  Authorization: `Bearer ${await googlePlayAccessToken()}`,
  "Content-Type": "application/json",
};
const root =
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/app.questos.android/edits";
async function call(url, method = "GET", body, media = false) {
  const response = await fetch(url, {
    method,
    headers: media ? { ...headers, "Content-Type": "image/png" } : headers,
    body: body === undefined ? undefined : media ? body : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    // Emit only structured Google error reasons; never headers, auth tokens or raw bodies.
    const reasons =
      failure?.error?.errors
        ?.map((item) => item.reason)
        .filter((item) => /^[a-zA-Z]+$/.test(item)) ?? [];
    const message = failure?.error?.message ?? "";
    const known = [
      "changesNotSentForReview",
      "draft",
      "review",
      "feature graphic",
      "screenshots",
      "icon",
    ].filter((word) => message.toLowerCase().includes(word.toLowerCase()));
    throw new Error(
      `Play ${method} request failed (HTTP ${response.status}; reasons=${reasons.join(",")}; hints=${known.join(",")}); no success claimed`,
    );
  }
  return response.status === 204 ? null : response.json();
}
const edit = await call(root, "POST", {});
let committed = false;
try {
  const base = `${root}/${edit.id}`;
  const details = await call(`${base}/details`);
  const listings = await call(`${base}/listings`);
  const tracks = await call(`${base}/tracks`);
  const images = {};
  const currentImages = {};
  for (const kind of [
    "icon",
    "featureGraphic",
    "phoneScreenshots",
    "sevenInchScreenshots",
    "tenInchScreenshots",
  ]) {
    currentImages[kind] = (await call(`${base}/listings/en-US/${kind}`)).images ?? [];
    images[kind] = currentImages[kind].length;
  }
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "audit",
      details,
      listings: listings.listings,
      images,
      tracks: tracks.tracks?.map((t) => ({
        track: t.track,
        releases: t.releases?.map((r) => ({ versionCodes: r.versionCodes, status: r.status })),
      })),
    }),
  );
  if (apply) {
    // Never delete owner assets or append duplicates. Preserve existing exact sets; otherwise
    // stop for Console reconciliation. All staging is discarded if the guarded commit fails.
    for (const [kind, files] of Object.entries(assetGroups)) {
      const existing = currentImages[kind];
      if (
        existing.length &&
        (existing.length !== files.length ||
          existing.some(
            (image, index) =>
              image.sha256 !==
              createHash("sha256").update(assetBytes.get(files[index])).digest("hex"),
          ))
      )
        throw new Error(
          "Existing store graphics differ; reconcile in Console without deleting owner assets.",
        );
    }
    const current = listings.listings?.find((item) => item.language === "en-US") ?? {};
    await call(`${base}/listings/en-US`, "PUT", { ...current, ...listing });
    await call(`${base}/details`, "PUT", {
      ...details,
      contactEmail: "founder@oryxion.net",
      contactWebsite: "https://questos.questos-1fd92776.workers.dev",
    });
    for (const [kind, files] of Object.entries(assetGroups)) {
      if (currentImages[kind].length) continue;
      for (const file of files)
        await call(
          `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/app.questos.android/edits/${edit.id}/listings/en-US/${kind}?uploadType=media`,
          "POST",
          assetBytes.get(file),
          true,
        );
      const uploaded = (await call(`${base}/listings/en-US/${kind}`)).images ?? [];
      if (
        uploaded.length !== files.length ||
        uploaded.some(
          (image, index) =>
            image.sha256 !==
            createHash("sha256").update(assetBytes.get(files[index])).digest("hex"),
        )
      )
        throw new Error(
          "Staged store asset hashes/order could not be verified; no commit attempted.",
        );
      console.log(`Verified staged ${kind}: ${uploaded.length} assets; not yet committed.`);
    }
    await call(`${base}:validate`, "POST");
    await call(`${base}:commit?changesNotSentForReview=true`, "POST");
    committed = true;
    console.log(
      "Listing/contact metadata edit committed without sending changes for review. No tracks or policy forms changed.",
    );
  }
} finally {
  if (!committed) await call(`${root}/${edit.id}`, "DELETE");
}
