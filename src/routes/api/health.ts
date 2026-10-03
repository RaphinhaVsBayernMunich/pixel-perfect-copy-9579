import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const ready =
          [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_PUBLISHABLE_KEY",
            "DEEPSEEK_API_KEY",
            "APP_ORIGIN",
            "INSTALL_FINGERPRINT_PEPPER",
          ].every((key) => !!process.env[key]) &&
          (process.env.INSTALL_FINGERPRINT_PEPPER?.trim().length ?? 0) >= 32;
        let connected = false;
        let providerReady = false;
        let providerReason: string | undefined;
        let providerStatus: number | undefined;
        if (ready) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data, error } = await supabaseAdmin
              .from("billing_configuration")
              .select("environment")
              .eq("id", true)
              .abortSignal(AbortSignal.timeout(5000))
              .single();
            connected = !error && data?.environment === process.env.BILLING_ENVIRONMENT;
            if (connected) {
              const { checkAiReadiness } = await import("@/lib/ai-readiness.server");
              const provider = await checkAiReadiness();
              providerReady = provider.ready;
              providerReason = provider.reason;
              providerStatus = provider.providerStatus;
            }
          } catch {
            connected = false;
          }
        }
        return Response.json(
          {
            service: "QuestOS",
            status: !ready
              ? "configuration-required"
              : !connected
                ? "database-unavailable"
                : providerReady
                  ? "ready"
                  : "provider-unavailable",
            ...(!providerReady && connected ? { reason: providerReason } : {}),
            ...(providerStatus ? { providerStatus } : {}),
          },
          {
            status: ready && connected && providerReady ? 200 : 503,
            headers: { "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
