/**
 * Installation identifier used for trial-abuse prevention.
 *
 * Policy-compliance notes:
 *  - We do NOT read persistent hardware identifiers on Android (IMEI,
 *    Advertising ID for non-ads use, MAC). Doing so violates Google Play
 *    User Data policy.
 *  - On Android we use `@capacitor/device` `identifier` which returns the
 *    per-app-signing-key SSAID — this is Play-policy-safe and rotates on
 *    factory reset (accepted trade-off; 100% prevention is impossible
 *    without a payment method on file).
 *  - On the web we generate a random UUID and persist it in Capacitor
 *    Preferences (native) or `localStorage` (web).
 *  - The raw value is hashed with a per-server-run pepper before being
 *    stored server-side, so the DB never holds a value that can be
 *    correlated back to a device by anyone but the server.
 */
import { isNative, nativePlatform } from "@/lib/native/platform";

const STORAGE_KEY = "questos.install_id";

async function getStore() {
  if (isNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    return {
      get: async () => (await Preferences.get({ key: STORAGE_KEY })).value,
      set: async (value: string) => Preferences.set({ key: STORAGE_KEY, value }),
    };
  }
  return {
    get: async () => (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null),
    set: async (value: string) => {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, value);
    },
  };
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `q_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

/**
 * Returns a stable-per-install fingerprint. On native we prefer the SSAID
 * so the identifier is consistent for the same device+app-signing-key even
 * after the app is reinstalled without a factory reset.
 */
export async function getInstallFingerprint(): Promise<{ fingerprint: string; platform: string }> {
  const store = await getStore();
  const platform = nativePlatform();

  let cached = await store.get();
  if (cached && cached.length >= 12) return { fingerprint: cached, platform };

  let raw: string | null = null;
  if (isNative()) {
    try {
      const { Device } = await import("@capacitor/device");
      const info = await Device.getId();
      raw = info?.identifier ?? null;
    } catch {
      /* fall through to random */
    }
  }
  const fingerprint = raw && raw.length >= 8 ? `${platform}:${raw}` : `${platform}:${randomId()}`;
  await store.set(fingerprint);
  return { fingerprint, platform };
}
