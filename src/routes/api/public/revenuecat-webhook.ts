/**
 * RevenueCat webhook — the authoritative purchase state feed.
 *
 * Handles INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE,
 * PRODUCT_CHANGE, NON_RENEWING_PURCHASE and TRANSFER events. See:
 * https://www.revenuecat.com/docs/webhooks
 *
 * SECURITY:
 *   RevenueCat sends the shared secret in the `Authorization` header
 *   (value = whatever we configured in the RevenueCat dashboard, prefixed
 *   with `Bearer `). We compare it with a timing-safe check against the
 *   REVENUECAT_WEBHOOK_AUTH secret before doing any writes.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/revenuecat-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
        const auth = request.headers.get("authorization") ?? "";
        if (!expected || !timingSafeEqual(auth, `Bearer ${expected}`)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event = payload?.event;
        if (!event) return new Response("Missing event", { status: 400 });

        // App User ID in RC == Supabase auth user id (we set it on init).
        const userId: string | undefined = event.app_user_id ?? event.original_app_user_id;
        if (!userId) return new Response("Missing app_user_id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const kind = String(event.type ?? "unknown");
        const entitlementIds: string[] = event.entitlement_ids ?? [];
        const isPremium = entitlementIds.includes("premium");
        const nowIso = new Date().toISOString();
        const expiration = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
        const productId: string | undefined = event.product_id;

        // Determine new subscription state.
        let update: Record<string, any> = { last_verification: nowIso };
        switch (kind) {
          case "INITIAL_PURCHASE":
          case "RENEWAL":
          case "PRODUCT_CHANGE":
          case "UNCANCELLATION":
          case "NON_RENEWING_PURCHASE":
            update = {
              ...update,
              subscription_status: isPremium ? "premium" : "free",
              entitlement: isPremium ? "premium" : "free",
              current_plan: productId ?? "premium_annual",
              premium_expiration: expiration,
              revenuecat_customer_id: userId,
            };
            break;
          case "CANCELLATION":
            // Keep entitlement active until the paid period ends.
            update = {
              ...update,
              current_plan: productId ?? undefined,
              premium_expiration: expiration,
            };
            break;
          case "EXPIRATION":
            update = {
              ...update,
              subscription_status: "free",
              entitlement: "free",
              current_plan: "free",
              premium_expiration: expiration,
            };
            break;
          case "BILLING_ISSUE":
            update = { ...update, subscription_status: "expired", entitlement: "free" };
            break;
          case "TRANSFER":
            update = { ...update, revenuecat_customer_id: userId };
            break;
          default:
            // Log unknown, no state change.
            break;
        }

        try {
          await supabaseAdmin.from("profiles").update(update as any).eq("user_id", userId);
          await supabaseAdmin.from("subscription_events").insert({
            user_id: userId,
            kind: kind.toLowerCase(),
            source: "revenuecat",
            product_id: productId ?? null,
            entitlement: isPremium ? "premium" : "free",
            metadata: {
              event_id: event.id,
              store: event.store,
              environment: event.environment,
              expiration_at_ms: event.expiration_at_ms,
            },
          });
        } catch (e) {
          console.error("RevenueCat webhook write failed", e);
          return new Response("Internal error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
