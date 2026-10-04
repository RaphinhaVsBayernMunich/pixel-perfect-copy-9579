import { openExternal } from "../native/auth";
import { reconcileUntilVerified } from "./reconcile";
import { create } from "zustand";
import { toast } from "sonner";
import { useUI } from "../ui-store";
import { useAuth } from "../auth-store";
import { isNative } from "../native/platform";
import { createNativeProvider } from "./provider-native";
import { createWebProvider } from "./provider-web";
import { getSubscription, startTrial, listSubscriptionEvents } from "./subscription.functions";
import { createStripePortal, reconcileBilling } from "./stripe-checkout.functions";
import { getStripeEnvironment } from "../stripe";
import { getInstallFingerprint } from "./install-id";
import { accessTier, PLAY_PRODUCT } from "./billing-contracts";
import type {
  Offerings,
  PlanId,
  PremiumFeature,
  SubscriptionProvider,
  SubscriptionState,
} from "./types";
interface Store extends SubscriptionState {
  offerings: Offerings | null;
  events: Awaited<ReturnType<typeof listSubscriptionEvents>>;
  init: (userId: string) => Promise<void>;
  refreshFromBackend: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  purchase: (plan: PlanId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  reconcile: () => Promise<boolean>;
  openBillingPortal: () => Promise<void>;
  reset: () => void;
}
let reconciliation: { version: number; promise: Promise<boolean> } | null = null;
let provider: SubscriptionProvider | null = null;
let identityVersion = 0;
let owner: string | null = null;
let queue = Promise.resolve();
let unsubscribe: (() => void) | undefined;
let interval: ReturnType<typeof setInterval> | undefined;
const getProvider = () =>
  provider ??
  (provider = isNative()
    ? createNativeProvider(() => import.meta.env.VITE_REVENUECAT_ANDROID_KEY)
    : createWebProvider());
const initial: SubscriptionState = {
  status: "free",
  entitlement: "free",
  currentPlan: null,
  trialStart: null,
  trialEnd: null,
  premiumExpiration: null,
  revenueCatCustomerId: null,
  lastVerification: null,
  loaded: false,
  pending: false,
  error: null,
  graceEnd: null,
  cancelAtPeriodEnd: false,
  billingProvider: null,
};
export const useSubscription = create<Store>((set, get) => ({
  ...initial,
  offerings: null,
  events: [],
  async init(userId) {
    const version = identityVersion;
    const p = getProvider();
    try {
      queue = queue
        .catch(() => {})
        .then(async () => {
          if (version !== identityVersion) return;
          await p.init(userId);
          await p.identify(userId);
          if (version === identityVersion) owner = userId;
        });
      await queue;
    } catch {
      if (version === identityVersion)
        set({ error: "Billing could not initialize. Please retry or sign in again." });
    }
    if (version !== identityVersion) return;
    try {
      const fingerprint = await getInstallFingerprint();
      if (version !== identityVersion) return;
      await startTrial({ data: fingerprint });
    } catch {
      /* Existing server trial remains authoritative; refresh reports failures. */
    }
    if (version !== identityVersion) return;
    await get().refreshFromBackend();
    if (version !== identityVersion) return;
    void get().refreshOfferings();
    unsubscribe?.();
    unsubscribe = p.onEntitlementChange(() => {
      if (version === identityVersion) void get().reconcile();
    });
    if (interval) clearInterval(interval);
    interval = setInterval(() => void get().refreshFromBackend(), 60000);
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("checkout") === "success"
    )
      void get().reconcile();
  },
  async refreshFromBackend() {
    const version = identityVersion;
    if (!useAuth.getState().user) return;
    try {
      const data = await getSubscription();
      if (version !== identityVersion) return;
      set({
        status: data.subscription_status,
        entitlement: data.entitlement,
        currentPlan: data.current_plan,
        trialStart: data.trial_start,
        trialEnd: data.trial_end,
        premiumExpiration: data.premium_expiration,
        revenueCatCustomerId: data.revenuecat_customer_id,
        lastVerification: data.last_verification,
        graceEnd: data.grace_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        billingProvider: data.billing_provider,
        loaded: true,
        error: null,
      });
    } catch {
      if (version === identityVersion)
        set({
          entitlement: "free",
          loaded: true,
          error: "Subscription status could not be verified. Retry when connected.",
        });
    }
  },
  async refreshOfferings() {
    const version = identityVersion;
    try {
      const offerings = await getProvider().getOfferings();
      if (version === identityVersion)
        set({
          offerings,
          error: offerings.current.length
            ? null
            : "No verified annual plan is available. Retry or contact support.",
        });
    } catch {
      if (version === identityVersion)
        set({
          offerings: { current: [] },
          error: "Annual pricing could not be loaded. Retry or contact support.",
        });
    }
  },
  async refreshEvents() {
    const version = identityVersion;
    try {
      const events = await listSubscriptionEvents();
      if (version === identityVersion) set({ events });
    } catch {
      if (version === identityVersion) set({ error: "Billing history could not be loaded." });
    }
  },
  async purchase(plan) {
    const version = identityVersion;
    if (plan !== "premium_annual" || owner !== useAuth.getState().user?.id) {
      set({ error: "Billing is not ready for this account. Sign in again." });
      return false;
    }
    set({ pending: true, error: null });
    try {
      const result = await getProvider().purchase(plan);
      if (version !== identityVersion) return false;
      const clientSecret = (result as { clientSecret?: string }).clientSecret;
      if (clientSecret) {
        useUI.getState().setCheckoutClientSecret(clientSecret);
        return true;
      }
      if (result.ok) return await get().reconcile();
      if (result.error !== "cancelled")
        set({ error: result.error ?? "Purchase failed. Please retry." });
      return false;
    } catch {
      if (version === identityVersion)
        set({ error: "Purchase could not complete. Check the store before retrying." });
      return false;
    } finally {
      if (version === identityVersion) set({ pending: false });
    }
  },
  reconcile() {
    const version = identityVersion;
    if (reconciliation?.version === version) return reconciliation.promise;
    const promise = (async () => {
      set({ pending: true, error: null });
      try {
        const result = await reconcileUntilVerified({
          isCurrent: () => version === identityVersion,
          reconcile: () =>
            reconcileBilling({ data: { provider: isNative() ? "revenuecat" : "stripe" } }),
          refresh: () => get().refreshFromBackend(),
          hasPaidAccess: () => accessTier(get()) === "premium",
          wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        });
        if (result === "paid") return true;
        if (result === "account-changed") return false;
        set({
          error: "Verification is pending. No new charge was made. Use Refresh or Restore shortly.",
        });
        return false;
      } finally {
        if (version === identityVersion) set({ pending: false });
      }
    })();
    reconciliation = { version, promise };
    void promise
      .finally(() => {
        if (reconciliation?.promise === promise) reconciliation = null;
      })
      .catch(() => {});
    return promise;
  },
  async restore() {
    const version = identityVersion;
    if (owner !== useAuth.getState().user?.id) return false;
    set({ pending: true, error: null });
    try {
      const result = await getProvider().restore();
      if (version !== identityVersion) return false;
      if (!result.ok) {
        set({ error: result.error ?? "Restore failed. Please retry." });
        return false;
      }
      const restored = await get().reconcile();
      if (version !== identityVersion) return false;
      if (restored) toast.success("Your paid subscription is restored.");
      else
        set({
          error:
            "No verified paid subscription found yet. Confirm the store account or retry shortly.",
        });
      return restored;
    } catch {
      if (version === identityVersion)
        set({ error: "Restore could not verify billing. Please retry." });
      return false;
    } finally {
      if (version === identityVersion) set({ pending: false });
    }
  },
  async openBillingPortal() {
    const version = identityVersion;
    if (get().billingProvider === "revenuecat") {
      await openExternal(
        `https://play.google.com/store/account/subscriptions?sku=${PLAY_PRODUCT}&package=app.questos.android`,
      );
      return;
    }
    try {
      const result = await createStripePortal({
        data: {
          returnUrl: `${window.location.origin}/profile`,
          environment: getStripeEnvironment(),
        },
      });
      if (version !== identityVersion) return;
      if ("error" in result) {
        set({ error: result.error });
        return;
      }
      await openExternal(result.url);
    } catch {
      if (version === identityVersion)
        set({ error: "Billing management could not open. Please retry." });
    }
  },
  reset() {
    identityVersion++;
    owner = null;
    const p = provider;
    queue = queue
      .catch(() => {})
      .then(async () => {
        await p?.reset?.();
      })
      .catch(() => {});
    unsubscribe?.();
    unsubscribe = undefined;
    if (interval) clearInterval(interval);
    interval = undefined;
    useUI.getState().setCheckoutClientSecret(null);
    set({ ...initial, offerings: null, events: [] });
  },
}));
export function hasPremiumEntitlement(state: SubscriptionState) {
  return accessTier(state) !== "free";
}
export function trialDaysLeft(state: SubscriptionState) {
  return state.status === "trial" && state.trialEnd
    ? Math.max(0, Math.ceil((Date.parse(state.trialEnd) - Date.now()) / 86400000))
    : null;
}
export function usePremium(_feature: PremiumFeature) {
  return hasPremiumEntitlement(useSubscription());
}
