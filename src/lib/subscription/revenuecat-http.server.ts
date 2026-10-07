/** Server caller supplies the private key; never import this helper from client code. */
export async function deleteRevenueCatCustomer(userId: string, key: string, request = fetch) {
  let response: Response;
  try {
    response = await request(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
        redirect: "manual",
      },
    );
  } catch {
    throw new Error(
      "Billing data deletion could not be requested. Your account remains available; retry or contact support.",
    );
  }
  // RevenueCat queues deletion asynchronously. Its documented retry completion is 200/404.
  if (response.status !== 200 && response.status !== 404)
    throw new Error(
      "Billing data deletion could not be requested. Your account remains available; retry or contact support.",
    );
}

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
