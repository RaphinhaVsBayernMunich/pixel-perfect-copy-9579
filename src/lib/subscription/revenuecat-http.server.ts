/** Server caller supplies the private key; never import this helper from client code. */
export async function fetchRevenueCatSubscriber(userId: string, key: string, request = fetch) {
  const response = await request(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
      // Cloudflare workerd supports manual/follow; reject redirects through the status check.
      redirect: "manual",
    },
  );
  if (!response.ok) throw new Error("Native subscription verification failed");
  const text = await response.text();
  if (text.length > 262144) throw new Error("Invalid native subscription response");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid native subscription response");
  }
}
