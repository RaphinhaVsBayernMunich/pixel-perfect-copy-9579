import { expect, test } from "bun:test";
import { probeAiReadiness } from "../src/lib/ai-readiness.server";
test("readiness verifies the configured model without generating content", async () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    let calls = 0;
    const result = await probeAiReadiness((async (url, options) => {
      calls++;
      expect([
        "https://api.deepseek.com/models",
        "https://api.deepseek.com/user/balance",
      ]).toContain(String(url));
      expect(options?.redirect).toBe("manual");
      expect(options?.body).toBeUndefined();
      return String(url).endsWith("/models")
        ? Response.json({ data: [{ id: "deepseek-flash" }] })
        : Response.json({ is_available: true });
    }) as typeof fetch);
    expect(result).toEqual({ ready: true });
    expect(calls).toBe(2);
  } finally {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  }
});
test("provider failures expose only a safe readiness category", async () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    for (const response of [
      new Response("private provider details", { status: 401 }),
      new Response("private provider details", { status: 500 }),
      new Response("invalid json"),
      new Response("x".repeat(256001)),
      Response.json({ data: [{ id: "another-model" }] }),
    ]) {
      const result = await probeAiReadiness((async () => response) as typeof fetch);
      expect(result.ready).toBe(false);
      expect(JSON.stringify(result)).not.toContain("private");
    }
  } finally {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  }
});

test("readiness rejects redirects and sanitizes network and timeout failures", async () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    for (const status of [301, 302, 303, 307, 308]) {
      let calls = 0;
      const result = await probeAiReadiness((async (_url, options) => {
        calls++;
        expect(options?.redirect).toBe("manual");
        return new Response("private redirect details", {
          status,
          headers: { location: "https://example.invalid/" },
        });
      }) as typeof fetch);
      expect(result).toEqual({ ready: false, reason: "unavailable", providerStatus: status });
      expect(calls).toBe(1);
    }
    for (const [error, reason] of [
      [new TypeError("private network details"), "network"],
      [new DOMException("private timeout details", "TimeoutError"), "timeout"],
    ] as const) {
      expect(
        await probeAiReadiness((async () => {
          throw error;
        }) as typeof fetch),
      ).toEqual({ ready: false, reason });
    }
  } finally {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  }
});

test("readiness fails closed on insufficient or malformed balance without exposing amounts", async () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    for (const [balance, reason] of [
      [{ is_available: false, balance_infos: [{ total_balance: "private-amount" }] }, "balance"],
      [{ is_available: "true" }, "unavailable"],
      [{}, "unavailable"],
    ] as const) {
      const result = await probeAiReadiness((async (url) =>
        String(url).endsWith("/models")
          ? Response.json({ data: [{ id: "deepseek-flash" }] })
          : Response.json(balance)) as typeof fetch);
      expect(result).toEqual({ ready: false, reason });
      expect(JSON.stringify(result)).not.toContain("private-amount");
    }
  } finally {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  }
});
