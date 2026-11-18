/** Only fixed messages leave the billing boundary; never display raw SDK errors. */
export function pricingErrorMessage(error: unknown, stage: "identity" | "catalog"): string {
  if (error instanceof Error && error.message === "Pricing timed out.")
    return stage === "identity"
      ? "The billing connection did not finish starting. Restart QuestOS and retry."
      : "The store did not return pricing in time. Check your connection and retry.";
  if (error instanceof Error && error.message === "No verified monthly plan available.")
    return "The store has no verified monthly plan available for this account. Retry or contact support.";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "23")
    return "The store could not load this app's subscription configuration. Contact support.";
  if (code === "2" || code === "3")
    return "Purchases are unavailable for this store account or device. Check Google Play and retry.";
  return "Pricing is unavailable right now. Check your connection and try again.";
}
