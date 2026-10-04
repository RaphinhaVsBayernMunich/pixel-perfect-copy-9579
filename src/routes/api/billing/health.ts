import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/billing/health")({
  server: {
    handlers: {
      GET: async () => {
        const configured = [
          "REVENUECAT_SECRET_API_KEY",
          "REVENUECAT_APP_ID",
          "REVENUECAT_WEBHOOK_AUTH",
        ].every((name) => !!process.env[name]?.trim());
        return Response.json(
          {
            service: "QuestOS billing",
            status: configured ? "configured" : "configuration-required",
          },
          { status: configured ? 200 : 503, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
