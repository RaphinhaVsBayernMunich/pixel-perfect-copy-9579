import { createFileRoute } from "@tanstack/react-router";
async function equalSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const xx = new Uint8Array(x),
    yy = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xx.length; i++) diff |= xx[i] ^ yy[i];
  return diff === 0;
}
export const Route = createFileRoute("/api/public/revenuecat-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
        if (
          !secret ||
          !(await equalSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`))
        )
          return new Response("Unauthorized", { status: 401 });
        if (Number(request.headers.get("content-length")) > 262144)
          return new Response("Too large", { status: 413 });
        let payload: unknown;
        try {
          const body = await request.text();
          if (body.length > 262144) return new Response("Too large", { status: 413 });
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        try {
          const { handleRevenueCatEvent } =
            await import("@/lib/subscription/revenuecat-billing.server");
          await handleRevenueCatEvent(payload);
          return Response.json({ received: true });
        } catch {
          return new Response("Billing processing failed; retry delivery", { status: 500 });
        }
      },
    },
  },
});
