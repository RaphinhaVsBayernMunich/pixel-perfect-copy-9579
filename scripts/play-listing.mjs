import fs from "node:fs";
import { googlePlayAccessToken } from "./google-play-auth.mjs";

const apply = process.argv.includes("--apply");
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
async function call(url, method = "GET", body) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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
  for (const kind of [
    "icon",
    "featureGraphic",
    "phoneScreenshots",
    "sevenInchScreenshots",
    "tenInchScreenshots",
  ])
    images[kind] = (await call(`${base}/listings/en-US/${kind}`)).images?.length ?? 0;
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
    const current = listings.listings?.find((item) => item.language === "en-US") ?? {};
    await call(`${base}/listings/en-US`, "PUT", { ...current, ...listing });
    await call(`${base}/details`, "PUT", {
      ...details,
      contactEmail: "founder@questos.net",
      contactWebsite: "https://questos.questos-1fd92776.workers.dev",
    });
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
