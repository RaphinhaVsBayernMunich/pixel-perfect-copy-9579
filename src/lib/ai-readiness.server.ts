import "@tanstack/react-start/server-only";
import { AI_MODEL, requireDeepSeekKey } from "./ai-gateway.server";
export type AiReadiness = {
  ready: boolean;
  reason?: "authentication" | "model" | "unavailable" | "network" | "timeout";
  providerStatus?: number;
};
export async function probeAiReadiness(request: typeof fetch = fetch): Promise<AiReadiness> {
  try {
    const response = await request("https://api.deepseek.com/models", {
      headers: { authorization: "Bearer " + requireDeepSeekKey() },
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      return {
        ready: false,
        reason: [401, 403].includes(response.status) ? "authentication" : "unavailable",
        providerStatus: response.status,
      };
    const body = await response.text();
    if (body.length > 256_000) return { ready: false, reason: "unavailable" };
    const result: unknown = JSON.parse(body);
    const ready =
      !!result &&
      typeof result === "object" &&
      "data" in result &&
      Array.isArray(result.data) &&
      result.data.some(
        (model: unknown) =>
          !!model && typeof model === "object" && "id" in model && model.id === AI_MODEL,
      );
    return ready ? { ready } : { ready, reason: "model" };
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
// Cached, read-only check: no prompts, generations or quota mutations.
let check: Promise<AiReadiness> | undefined;
let expires = 0;
export function checkAiReadiness(): Promise<AiReadiness> {
  if (!check || Date.now() >= expires) {
    expires = Date.now() + 300_000;
    check = probeAiReadiness();
  }
  return check;
}
