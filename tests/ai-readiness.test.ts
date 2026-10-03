import { expect, test } from "bun:test";
import { probeAiReadiness } from "../src/lib/ai-readiness.server";
test("readiness verifies the configured model without generating content", async () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only";
  try {
    let calls = 0;
    const result = await probeAiReadiness((async (url, options) => {
      calls++;
      expect(url).toBe("https://api.deepseek.com/models");
      expect(options?.redirect).toBe("error");
      expect(options?.body).toBeUndefined();
      return Response.json({ data: [{ id: "deepseek-flash" }] });
    }) as typeof fetch);
    expect(result).toEqual({ ready: true });
    expect(calls).toBe(1);
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
