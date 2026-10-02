import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { configuredBillingEnvironment } =
          await import("@/lib/subscription/billing-db.server");
        const env = configuredBillingEnvironment();
        if (new URL(request.url).searchParams.get("env") !== env)
          return new Response("Wrong environment", { status: 400 });
        const { verifyWebhook } = await import("@/lib/stripe.server");
        let event;
        try {
          event = await verifyWebhook(request, env);
        } catch {
          return new Response("Invalid signature", { status: 400 });
        }
        try {
          const { handleStripeEvent } = await import("@/lib/subscription/stripe-billing.server");
          await handleStripeEvent(event);
          return Response.json({ received: true });
        } catch {
          return new Response("Billing processing failed; retry delivery", { status: 500 });
        }
      },
    },
  },
});
