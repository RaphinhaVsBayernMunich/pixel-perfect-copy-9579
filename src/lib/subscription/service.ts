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
  },

  async refreshFromBackend() {
    try {
      const data = await getSubscription();
      if (!data) {
        set({ loaded: true });
        return;
      }
      set({
        status: (data.subscription_status as any) ?? "free",
        entitlement: (data.entitlement as Entitlement) ?? "free",
        currentPlan: (data.current_plan as PlanId | null) ?? null,
        trialStart: data.trial_start ?? null,
        trialEnd: data.trial_end ?? null,
        premiumExpiration: data.premium_expiration ?? null,
        revenueCatCustomerId: data.revenuecat_customer_id ?? null,
        lastVerification: data.last_verification ?? null,
        loaded: true,
      });
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
    try {
      const result = await getProvider().purchase(planId);
      // Web: the provider returned a Stripe Embedded Checkout client secret.
      // Hand it to the Paywall to mount the form; entitlement flips server-side
      // when the webhook fires, then refreshFromBackend picks it up.
      const clientSecret = (result as { clientSecret?: string }).clientSecret;
      if (clientSecret) {
        useUI.getState().setCheckoutClientSecret(clientSecret);
        return true;
      }
      if (result.ok) {
        toast.success("Welcome to QuestOS Premium.");
        await get().refreshFromBackend();
        return true;
      }
      if (result.error && result.error !== "cancelled") toast.error(result.error);
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
      if (result.ok && result.entitlement === "premium") {
        toast.success("Premium restored.");
        return true;
      }
      toast.message("No prior purchase found on this account.");
      return false;
    } finally {
      set({ pending: false });
    }
  },

  reset() {
    set({ ...initial, offerings: null, events: [] });
  },
}));

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
