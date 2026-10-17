import type { Offerings } from "./types";

/** Session-only display metadata. Never stores a native purchase package or entitlement. */
export function createOfferingsCache(now = Date.now) {
  let value: Offerings | undefined;
  let expires = 0;
  let retryAt = 0;
  let failures = 0;
  let pending: Promise<Offerings> | undefined;
  let generation = 0;
  return {
    load(fetcher: () => Promise<Offerings>, force = false): Promise<Offerings> {
      if (pending) return pending;
      if (!force && value && now() < expires) return Promise.resolve(value);
      if (now() < retryAt) return Promise.reject(new Error("Retry pricing shortly."));
      const current = generation;
      const request = Promise.resolve()
        .then(fetcher)
        .then((result) => {
          if (!result.current.length) throw new Error("No verified monthly plan available.");
          if (current === generation) {
            value = result;
            expires = now() + 5 * 60_000;
            failures = 0;
            retryAt = 0;
          }
          return result;
        })
        .catch((error: unknown) => {
          if (current === generation) {
            failures++;
            retryAt = now() + Math.min(30_000, 1000 * 2 ** failures);
          }
          throw error;
        })
        .finally(() => {
          if (pending === request) pending = undefined;
        });
      pending = request;
      return request;
    },
    reset() {
      generation++;
      value = undefined;
      expires = retryAt = failures = 0;
      pending = undefined;
    },
  };
}
