/**
 * SubscriptionService — the singleton the app talks to.
 *
 * It picks the right provider (web / native) at runtime, mirrors the
 * backend-authoritative subscription state into a Zustand store, and
 * exposes a tiny surface to the UI:
 *
 *   const state = useSubscription();
 *   const canUse = usePremium("ai.unlimited");
 *
 * The provider objects encapsulate billing-SDK details so no component
 * imports RevenueCat or Stripe directly.
 */
import { create } from "zustand";
import { useUI } from "@/lib/ui-store";
import { isNative, nativePlatform } from "@/lib/native/platform";
import { createNativeProvider } from "./provider-native";
import { createWebProvider } from "./provider-web";
import {
  getSubscription,
  startTrial,
  listSubscriptionEvents,
} from "./subscription.functions";
import { createStripePortal } from "./stripe-checkout.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { getInstallFingerprint } from "./install-id";
import type {
  Entitlement,
  Offerings,
  PlanId,
  PremiumFeature,
  SubscriptionProvider,
  SubscriptionState,
} from "./types";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { notify } from "@/lib/notifications";
import { APP_CONFIG } from "@/lib/config/admin-config";

// ---- store ----------------------------------------------------------------

interface Store extends SubscriptionState {
  offerings: Offerings | null;
  events: any[];
  init: (userId: string) => Promise<void>;
  refreshFromBackend: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  purchase: (planId: PlanId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  openBillingPortal: () => Promise<void>;
  reset: () => void;
}

let provider: SubscriptionProvider | null = null;

function getProvider(): SubscriptionProvider {
  if (provider) return provider;
  provider = isNative()
    ? createNativeProvider(() => import.meta.env.VITE_REVENUECAT_ANDROID_KEY)
    : createWebProvider();
  return provider;
}

const initial: SubscriptionState = {
  status: "trial",
  entitlement: "free",
  currentPlan: null,
  trialStart: null,
  trialEnd: null,
  premiumExpiration: null,
  revenueCatCustomerId: null,
  lastVerification: null,
  loaded: false,
  pending: false,
};

export const useSubscription = create<Store>((set, get) => ({
  ...initial,
  offerings: null,
  events: [],

  async init(userId: string) {
    const p = getProvider();
    try {
      await p.init(userId);
    } catch (e) {
      console.warn("Subscription provider init failed", e);
    }

    // Ensure trial exists (idempotent, backend-authoritative).
    try {
      const { fingerprint, platform } = await getInstallFingerprint();
      await startTrial({ data: { fingerprint, platform } });
    } catch (e) {
      console.warn("startTrial failed", e);
    }

    await get().refreshFromBackend();
    void get().refreshOfferings();

    // Wire entitlement change → server truth refresh.
    p.onEntitlementChange(() => {
      void get().refreshFromBackend();
    });

    // Periodic silent refresh (offline-safe: silent on failure).
    if (typeof window !== "undefined" && !refreshIntervalStarted) {
      refreshIntervalStarted = true;
      setInterval(() => {
        void get().refreshFromBackend();
      }, APP_CONFIG.subscriptionRefreshIntervalMs);
      // Refresh whenever the tab regains focus / connectivity returns.
      window.addEventListener("focus", () => void get().refreshFromBackend());
      window.addEventListener("online", () => void get().refreshFromBackend());
    }
  },

  async refreshFromBackend() {
    try {
      const prev = get();
      const data = await getSubscription();
      if (!data) {
        set({ loaded: true });
        return;
      }
      const next = {
        status: (data.subscription_status as any) ?? "free",
        entitlement: (data.entitlement as Entitlement) ?? "free",
        currentPlan: (data.current_plan as PlanId | null) ?? null,
        trialStart: data.trial_start ?? null,
        trialEnd: data.trial_end ?? null,
        premiumExpiration: data.premium_expiration ?? null,
        revenueCatCustomerId: data.revenuecat_customer_id ?? null,
        lastVerification: data.last_verification ?? null,
        loaded: true,
      };
      set(next);
      dispatchLifecycleNotifications(prev, next);
      // Emit trial-ending nudges (once per threshold per user).
      const daysLeft = trialDaysLeftFor(next.status, next.trialEnd);
      if (daysLeft !== null) {
        if (daysLeft === 1) notify("trial_ending_1d", { once: true, key: next.trialEnd ?? "" });
        else if (daysLeft <= 3) notify("trial_ending_3d", { once: true, key: next.trialEnd ?? "" });
      }
    } catch (e) {
      console.warn("refreshFromBackend failed", e);
      set({ loaded: true });
    }
  },

  async refreshOfferings() {
    try {
      const offerings = await getProvider().getOfferings();
      set({ offerings });
    } catch (e) {
      console.warn("refreshOfferings failed", e);
    }
  },

  async refreshEvents() {
    try {
      const events = await listSubscriptionEvents();
      set({ events });
    } catch {
      /* noop */
    }
  },

  async purchase(planId: PlanId) {
    set({ pending: true });
    track("checkout_started", { plan: planId });
    try {
      const result = await getProvider().purchase(planId);
      const clientSecret = (result as { clientSecret?: string }).clientSecret;
      if (clientSecret) {
        useUI.getState().setCheckoutClientSecret(clientSecret);
        return true;
      }
      if (result.ok) {
        track("checkout_completed", { plan: planId });
        track("purchase", { plan: planId });
        notify("purchase_success");
        await get().refreshFromBackend();
        return true;
      }
      if (result.error && result.error !== "cancelled") {
        toast.error(result.error);
      }
      return false;
    } finally {
      set({ pending: false });
    }
  },

  async restore() {
    set({ pending: true });
    try {
      const result = await getProvider().restore();
      await get().refreshFromBackend();
      track("subscription_restored", { ok: result.ok, entitlement: result.entitlement });
      if (result.ok && result.entitlement === "premium") {
        notify("restore_success");
        return true;
      }
      toast.message("No prior purchase found on this account.");
      return false;
    } finally {
      set({ pending: false });
    }
  },

  async openBillingPortal() {
    track("portal_opened", { platform: nativePlatform() });
    // Native: send to Google Play subscriptions surface.
    if (isNative()) {
      const url =
        nativePlatform() === "android"
          ? "https://play.google.com/store/account/subscriptions"
          : "https://apps.apple.com/account/subscriptions";
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    // Web: Stripe Billing Portal — MUST open in a new tab (cannot iframe).
    if (!paymentsConfigured()) {
      toast.error("Billing portal is not configured for this build.");
      return;
    }
    try {
      const res = await createStripePortal({
        data: {
          returnUrl: `${window.location.origin}/profile`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open billing portal");
    }
  },

  reset() {
    set({ ...initial, offerings: null, events: [] });
  },
}));

let refreshIntervalStarted = false;

/**
 * Fire notifications for status transitions the user should know about.
 * Called from `refreshFromBackend` after every successful refresh.
 */
function dispatchLifecycleNotifications(prev: SubscriptionState, next: Pick<SubscriptionState, "status" | "premiumExpiration">) {
  if (!prev.loaded) return; // Skip the very first hydration.
  const wasPremium = prev.status === "premium";
  const nowPremium = next.status === "premium";
  const wasExpired = prev.status === "expired";
  const nowExpired = next.status === "expired";

  if (!wasPremium && nowPremium) notify("premium_unlocked");
  if (wasPremium && nowExpired) notify("subscription_expired");
  if (wasPremium && nowPremium && prev.premiumExpiration !== next.premiumExpiration) {
    notify("subscription_renewed", { once: true, key: next.premiumExpiration ?? "" });
    track("renewal");
  }
  if (wasPremium && !nowPremium) track("cancellation");
  if (!wasExpired && nowExpired && prev.status === "trial") track("trial_expired");
}


// ---- selectors ------------------------------------------------------------

export function hasPremiumEntitlement(state: SubscriptionState): boolean {
  return state.entitlement === "premium";
}

export function trialDaysLeft(state: SubscriptionState): number | null {
  if (state.status !== "trial" || !state.trialEnd) return null;
  const ms = new Date(state.trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Feature-level gate.
 *
 * Every premium feature is enforced through this hook rather than a
 * `if (isPremium)` check. Adding a new feature is a one-line change in
 * types.ts.
 */
export function usePremium(_feature: PremiumFeature): boolean {
  const state = useSubscription();
  return state.entitlement === "premium";
}
