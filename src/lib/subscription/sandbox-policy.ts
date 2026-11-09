/** Environments come from the server-only database lookup, never client metadata. */
export function verifyWebhookEnvironments(
  environments: Array<"live" | "sandbox">,
  event: { type: string; environment?: "SANDBOX" | "PRODUCTION" },
) {
  if (!environments.length || new Set(environments).size !== 1)
    throw new Error("Cross-environment billing transfer rejected");
  // RevenueCat TRANSFER events may omit environment; subscriber records are still
  // independently fetched and filtered for each verified account before a batch.
  if (!event.environment && event.type === "TRANSFER") return;
  if (event.environment !== (environments[0] === "live" ? "PRODUCTION" : "SANDBOX"))
    throw new Error("Wrong RevenueCat account environment");
}
