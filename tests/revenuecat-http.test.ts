import { expect, test } from "bun:test";
import { fetchRevenueCatSubscriber } from "../src/lib/subscription/revenuecat-http.server";
test("RevenueCat request works with Cloudflare redirect modes and does not follow redirects", async () => {
  let calls = 0;
  const request = (async (_url: unknown, options: RequestInit) => {
    calls++;
    expect(options.redirect).toBe("manual");
    return new Response(null, { status: 302, headers: { location: "https://untrusted.example" } });
  }) as typeof fetch;
  await expect(fetchRevenueCatSubscriber("account", "test-only", request)).rejects.toThrow(
    "verification failed",
  );
  expect(calls).toBe(1);
});
test("RevenueCat HTTP failures cannot expose provider response or grant access", async () => {
  const request = (async () =>
    new Response("sensitive-provider-error", { status: 401 })) as typeof fetch;
  await expect(fetchRevenueCatSubscriber("account", "test-only", request)).rejects.toThrow(
    "Native subscription verification failed",
  );
});
test("RevenueCat accepts bounded successful JSON and rejects malformed or oversized data", async () => {
  const response = (text: string) => (async () => new Response(text)) as typeof fetch;
  expect(
    await fetchRevenueCatSubscriber("account", "test-only", response('{"subscriber":{}}')),
  ).toEqual({ subscriber: {} });
  await expect(
    fetchRevenueCatSubscriber("account", "test-only", response("invalid")),
  ).rejects.toThrow();
  await expect(
    fetchRevenueCatSubscriber("account", "test-only", response(" ".repeat(262145))),
  ).rejects.toThrow("Invalid native");
});
