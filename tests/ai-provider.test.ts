import { test, expect } from "bun:test";
import { generateDeepSeek, requireDeepSeekKey, ProviderError } from "../src/lib/ai-gateway.server";
import { aiInputs, aiOutputs, AiError, aiFailure, unwrapAi } from "../src/lib/ai-contracts";
import { runAi, featureSettings } from "../src/lib/ai-service.server";
const payload = {
  instruction: 'Return JSON {"brief":"text"}',
  input: { name: "Player" },
  maxTokens: 512,
};
const completion = (content = '{"brief":"Ready."}', finish_reason = "stop") =>
  new Response(
    JSON.stringify({
      choices: [{ finish_reason, message: { content } }],
      usage: { prompt_tokens: 24, completion_tokens: 10 },
    }),
  );
const fetcher = (fn: () => Response | Promise<Response>) => fn as typeof fetch;
test("official server request uses JSON mode, disabled thinking and a bounded model budget", async () => {
  let calls = 0;
  const result = await generateDeepSeek("test-only-not-a-credential", payload, {
    fetch: (async (url, options) => {
      calls++;
      expect(url).toBe("https://api.deepseek.com/chat/completions");
      const body = JSON.parse(String(options?.body));
      expect(body.model).toBe("deepseek-flash");
      expect(body.max_tokens).toBe(512);
      expect(body.thinking).toEqual({ type: "disabled" });
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(options?.redirect).toBe("manual");
      return completion();
    }) as typeof fetch,
  });
  expect(calls).toBe(1);
  expect(result.usage).toEqual({ inputTokens: 24, outputTokens: 10 });
});
for (const [status, code] of [
  [400, "AI_PROVIDER_REQUEST"],
  [401, "AI_PROVIDER_AUTH"],
  [402, "AI_BALANCE"],
  [403, "AI_PROVIDER_AUTH"],
  [422, "AI_PROVIDER_REQUEST"],
  [429, "AI_BUSY"],
  [500, "AI_UNAVAILABLE"],
  [502, "AI_UNAVAILABLE"],
  [503, "AI_BUSY"],
  [504, "AI_UNAVAILABLE"],
] as const) {
  test(`provider ${status} is sanitized and retries are bounded`, async () => {
    let calls = 0;
    const delays: number[] = [];
    try {
      await generateDeepSeek("test-only", payload, {
        fetch: fetcher(() => {
          calls++;
          return new Response("SENSITIVE PROVIDER ERROR", { status });
        }),
        sleep: async (ms) => {
          delays.push(ms);
        },
      });
      throw new Error("Expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AiError);
      expect((error as AiError).code).toBe(code);
      expect(String(error)).not.toContain("SENSITIVE");
    }
    const retry = [429, 500, 502, 503, 504].includes(status);
    expect(calls).toBe(retry ? 2 : 1);
    expect(delays.length).toBe(retry ? 1 : 0);
    expect(delays.every((ms) => ms >= 500 && ms <= 2000)).toBe(true);
  });
}
test("transient retry succeeds; long Retry-After prevents early retry", async () => {
  let calls = 0;
  const result = await generateDeepSeek("test-only", payload, {
    fetch: fetcher(() => (++calls === 1 ? new Response("", { status: 503 }) : completion())),
    sleep: async () => {},
  });
  expect(result.content).toContain("Ready");
  expect(calls).toBe(2);
  calls = 0;
  await expect(
    generateDeepSeek("test-only", payload, {
      fetch: fetcher(() => {
        calls++;
        return new Response("", { status: 429, headers: { "retry-after": "60" } });
      }),
    }),
  ).rejects.toMatchObject({ code: "AI_BUSY" });
  expect(calls).toBe(1);
});
test("network failures and abort timeouts do not retry", async () => {
  let calls = 0;
  await expect(
    generateDeepSeek("test-only", payload, {
      fetch: fetcher(() => {
        calls++;
        throw new Error("secret network details");
      }),
    }),
  ).rejects.toMatchObject({ code: "AI_NETWORK" });
  expect(calls).toBe(1);
  await expect(
    generateDeepSeek("test-only", payload, {
      timeoutMs: 5,
      fetch: ((_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
        )) as typeof fetch,
    }),
  ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
});
test("malformed, empty, truncated and oversized provider responses fail safely", async () => {
  for (const response of [
    new Response("not json"),
    new Response("{}"),
    completion(""),
    completion("partial", "length"),
    completion(" ", "stop"),
    new Response("x".repeat(256001)),
  ]) {
    await expect(
      generateDeepSeek("test-only", payload, { fetch: fetcher(() => response) }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  }
  try {
    await generateDeepSeek("test-only", payload, {
      fetch: fetcher(() => completion("partial", "length")),
    });
  } catch (error) {
    expect((error as ProviderError).usage).toEqual({ inputTokens: 24, outputTokens: 10 });
  }
});
test("missing server key is safe", () => {
  const saved = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  try {
    expect(requireDeepSeekKey).toThrow("AI Coach is temporarily unavailable");
  } finally {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  }
});
const goal = { goal: "Learn TypeScript", horizon: "month" as const };
const quest = {
  title: "Practice TypeScript",
  description: "Complete one exercise.",
  type: "main",
  category: "coding",
  priority: "medium",
  difficulty: "easy",
  estimatedMinutes: 30,
};
test("input and quest schemas reject oversized/spoofed/malformed values", () => {
  expect(
    aiInputs.goal_to_quests.safeParse({ ...goal, userId: "attacker", entitlement: "premium" })
      .success,
  ).toBe(false);
  expect(aiInputs.goal_to_quests.safeParse({ ...goal, goal: "x".repeat(8001) }).success).toBe(
    false,
  );
  expect(
    aiInputs.reflection_prompt.safeParse({
      recentCompletions: Array(101).fill("x"),
      streakDays: 0,
      totalXp: 0,
    }).success,
  ).toBe(false);
  expect(aiOutputs.goal_to_quests.safeParse({ quests: Array(4).fill(quest) }).success).toBe(true);
  for (const bad of [
    { quests: [] },
    { quests: Array(8).fill(quest) },
    { quests: Array(4).fill({ ...quest, estimatedMinutes: -1 }) },
    { quests: Array(4).fill({ ...quest, category: "invalid" }) },
  ])
    expect(aiOutputs.goal_to_quests.safeParse(bad).success).toBe(false);
});
function dependencies() {
  const events: string[] = [];
  return {
    events,
    impl: {
      getRequest: () =>
        new Request("https://questos.invalid", {
          headers: { authorization: "Bearer verified-token" },
        }),
      authenticate: async (token: string) => {
        expect(token).toBe("verified-token");
        events.push("auth");
        return "validated-user";
      },
      getKey: () => "test-only",
      reserve: async (user: string) => {
        expect(user).toBe("validated-user");
        events.push("reserve");
        return "request-id";
      },
      generate: async () => {
        events.push("provider");
        return {
          content: JSON.stringify({ quests: Array(4).fill(quest) }),
          usage: { inputTokens: 24, outputTokens: 10 },
        };
      },
      finish: async () => {
        events.push("finish");
      },
    },
  };
}

for (const [feature, input, output] of [
  [
    "morning_brief",
    { characterName: "Player", level: 1, streakDays: 0, momentum: 0, todayQuests: [] },
    { brief: "Start with one achievable quest." },
  ],
  ["goal_to_quests", goal, { quests: Array(4).fill(quest) }],
  [
    "reflection_prompt",
    { recentCompletions: [], streakDays: 0, totalXp: 0 },
    { prompt: "What helped you make progress today?" },
  ],
  [
    "starter_quests",
    { preferredName: "Player", interests: ["coding"] },
    {
      mainQuest: quest,
      starters: Array(5).fill({ ...quest, type: "side" }),
      welcome: "Welcome to QuestOS.",
    },
  ],
] as const) {
  test(`${feature} validates its real contract and finishes exactly once`, async () => {
    const { events, impl } = dependencies();
    impl.generate = async () => {
      events.push("provider");
      return { content: JSON.stringify(output), usage: { inputTokens: 24, outputTokens: 10 } };
    };
    const result = await runAi(feature, input, impl);
    expect(result).toEqual({ ok: true, value: output });
    expect(events).toEqual(["auth", "reserve", "provider", "finish"]);
  });
}
test("orchestration authenticates, reserves, validates and records before returning existing API", async () => {
  const { events, impl } = dependencies();
  const result = await runAi("goal_to_quests", goal, impl);
  expect(result.ok).toBe(true);
  expect(events).toEqual(["auth", "reserve", "provider", "finish"]);
  const value = await unwrapAi(async () => result);
  expect(value.quests).toHaveLength(4);
});
test("auth, quota database errors, missing keys, and forged identities never call provider", async () => {
  for (const step of ["authenticate", "reserve", "getKey"] as const) {
    const { events, impl } = dependencies();
    impl[step] = () => {
      throw new Error("SECRET infrastructure details");
    };
    const result = await runAi("goal_to_quests", goal, impl);
    expect(result).toEqual({ ok: false, code: "AI_UNAVAILABLE" });
    expect(events).not.toContain("provider");
    expect(JSON.stringify(result)).not.toContain("SECRET");
  }
  const { events, impl } = dependencies();
  expect((await runAi("goal_to_quests", { ...goal, userId: "forged" }, impl)).ok).toBe(false);
  expect(events).toEqual([]);
});
test("malformed output is not a fake success; failed metadata writes fail closed", async () => {
  for (const content of ["invalid json", "{}", '{"quests":[]}']) {
    const { events, impl } = dependencies();
    impl.generate = async () => ({ content, usage: { inputTokens: 24, outputTokens: 10 } });
    expect(await runAi("goal_to_quests", goal, impl)).toEqual({
      ok: false,
      code: "AI_INVALID_RESPONSE",
    });
    expect(events).toContain("finish");
  }
  const { impl } = dependencies();
  impl.finish = async () => {
    throw new Error("SQL failed");
  };
  expect(await runAi("goal_to_quests", goal, impl)).toEqual({ ok: false, code: "AI_UNAVAILABLE" });
});
test("safe envelopes contain no raw errors or stacks and all features have finite budgets", async () => {
  expect(aiFailure(new Error("raw secret"))).toEqual({ ok: false, code: "AI_UNAVAILABLE" });
  for (const feature of Object.values(featureSettings)) {
    expect(feature.maxTokens).toBeGreaterThan(0);
    expect(feature.maxTokens).toBeLessThanOrEqual(4096);
    expect(feature.instruction).toContain("JSON");
  }
  await expect(
    unwrapAi(async () => {
      throw new Error("raw server stack");
    }),
  ).rejects.toMatchObject({ code: "AI_NETWORK" });
});

test("redirect responses fail closed without following credentials or retrying", async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    let calls = 0;
    await expect(
      generateDeepSeek("test-only", payload, {
        fetch: (async (_url, options) => {
          calls++;
          expect(options?.redirect).toBe("manual");
          return new Response("private redirect details", {
            status,
            headers: { location: "https://example.invalid/" },
          });
        }) as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(calls).toBe(1);
  }
});
