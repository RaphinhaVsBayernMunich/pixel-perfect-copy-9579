import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const ready = [
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "SUPABASE_PUBLISHABLE_KEY",
          "DEEPSEEK_API_KEY",
          "APP_ORIGIN",
        ].every((key) => !!process.env[key]);
        return Response.json(
          { service: "QuestOS", status: ready ? "ready" : "configuration-required" },
          { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
