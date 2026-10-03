import "@tanstack/react-start/server-only";
import { AI_MODEL, requireDeepSeekKey } from "./ai-gateway.server";
export type AiReadiness = {
  ready: boolean;
  reason?: "authentication" | "model" | "balance" | "unavailable" | "network" | "timeout";
  providerStatus?: number;
};
export async function probeAiReadiness(request: typeof fetch = fetch): Promise<AiReadiness> {
  try {
    for (const path of ["/models", "/user/balance"]) {
      const response = await request("https://api.deepseek.com" + path, {
        headers: { authorization: "Bearer " + requireDeepSeekKey() },
        // workerd supports manual/follow only. Never follow redirects with credentials.
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return {
          ready: false,
          reason: [401, 403].includes(response.status)
            ? "authentication"
            : response.status === 402
              ? "balance"
              : "unavailable",
          providerStatus: response.status,
        };
      }
      const body = await response.text();
      if (body.length > 256_000) return { ready: false, reason: "unavailable" };
      const result: unknown = JSON.parse(body);
      if (!result || typeof result !== "object") return { ready: false, reason: "unavailable" };
      if (path === "/models") {
        const modelExists =
          "data" in result &&
          Array.isArray(result.data) &&
          result.data.some(
            (model: unknown) =>
              !!model && typeof model === "object" && "id" in model && model.id === AI_MODEL,
          );
        if (!modelExists) return { ready: false, reason: "model" };
      } else {
        // Only the provider's availability boolean is used. Never expose balance amounts.
        if (!("is_available" in result) || typeof result.is_available !== "boolean")
          return { ready: false, reason: "unavailable" };
        if (!result.is_available) return { ready: false, reason: "balance" };
      }
    }
    return { ready: true };
  } catch (error) {
    return {
      ready: false,
      reason:
        error instanceof SyntaxError
          ? "unavailable"
          : error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)
            ? "timeout"
            : "network",
    };
  }
}
// Cached read-only model/balance checks: no generations, prompts or quota mutations.
let check: Promise<AiReadiness> | undefined;
let expires = 0;
export function checkAiReadiness(): Promise<AiReadiness> {
  if (!check || Date.now() >= expires) {
    expires = Date.now() + 300_000;
    check = probeAiReadiness().then((result) => {
      expires = Date.now() + (result.ready ? 300_000 : 30_000);
      return result;
    });
  }
  return check;
}
