/**
 * QuestOS subscription types.
 *
 * The rest of the app must only depend on this file — never import from
 * `@revenuecat/purchases-capacitor` or a billing provider SDK directly.
 * That keeps feature gates portable between web and native.
 */

export type SubscriptionStatus = "trial" | "free" | "premium" | "grace" | "expired";
export type Entitlement = "free" | "premium";

export type PlanId = "trial" | "premium_annual";

export interface SubscriptionState {
  status: SubscriptionStatus;
  entitlement: Entitlement;
  currentPlan: PlanId | null;
  trialStart: string | null;
  trialEnd: string | null;
  premiumExpiration: string | null;
  revenueCatCustomerId: string | null;
  lastVerification: string | null;
  graceEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  billingProvider?: string | null;
  error?: string | null;
  /** True when we've hydrated from the backend at least once this session. */
  loaded: boolean;
  /** True while a purchase or restore is in flight. */
  pending: boolean;
}

export interface OfferingPackage {
  identifier: PlanId;
  displayName: string;
  priceString: string; // e.g. "$19.99" — localized where possible
  period: "annual" | "monthly" | "lifetime";
  featured?: boolean;
}

export interface Offerings {
  current: OfferingPackage[];
}

export interface PurchaseResult {
  ok: boolean;
  entitlement: Entitlement;
  error?: string;
}

/**
 * SubscriptionProvider — the abstraction every billing backend implements.
 * Business logic should never branch on which provider is active.
 */
export interface SubscriptionProvider {
  readonly kind: "web" | "native";
  init(userId: string | null): Promise<void>;
  identify(userId: string): Promise<void>;
  reset?(): Promise<void>;
  getOfferings(): Promise<Offerings>;
  purchase(planId: PlanId): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
  /** Return the entitlement as reported by the provider (native) or backend (web). */
  refreshEntitlement(): Promise<Entitlement>;
  /** Subscribe to entitlement changes. Returns an unsubscribe fn. */
  onEntitlementChange(cb: (entitlement: Entitlement) => void): () => void;
}

/**
 * Feature keys enforced by `usePremium(feature)` / `<PremiumGate>`.
 * Adding a new premium capability = adding a member here and referencing it
 * from the UI. No billing-provider changes required.
 */
export type PremiumFeature =
  | "ai.unlimited"
  | "ai.memory"
  | "ai.future_me"
  | "ai.goal_simulator"
  | "ai.executive_assistant"
  | "analytics.advanced"
  | "themes.premium"
  | "sounds.premium"
  | "widgets.premium"
  | "widgets.dashboard_advanced"
  | "integrations.calendar"
  | "integrations.health"
  | "features.experimental";

export const PREMIUM_FEATURES: Record<PremiumFeature, { label: string; description: string }> = {
  "ai.unlimited": {
    label: "Expanded AI",
    description: "500 shared AI requests per UTC day on paid Premium; 40 during trial.",
  },
  "ai.memory": { label: "AI Memory", description: "Coach remembers your patterns and history." },
  "ai.future_me": {
    label: "Future Me",
    description: "Simulate the version of you in 1, 5, 10 years.",
  },
  "ai.goal_simulator": {
    label: "Goal Simulator",
    description: "Model tradeoffs before committing.",
  },
  "ai.executive_assistant": {
    label: "AI Executive Assistant",
    description: "Review and confirm a schedule built from your actual quests.",
  },
  "analytics.advanced": {
    label: "Advanced Analytics",
    description: "Deep insight into every category.",
  },
  "themes.premium": { label: "Premium Themes", description: "Curated visual worlds." },
  "sounds.premium": { label: "Premium Sound Packs", description: "Ambient audio for focus." },
  "widgets.premium": { label: "Premium Widgets", description: "Beautiful home-screen widgets." },
  "widgets.dashboard_advanced": {
    label: "Advanced Dashboard",
    description: "Custom panels on your home.",
  },
  "integrations.calendar": {
    label: "Calendar Integrations",
    description: "Import/export events and sync Android device calendars.",
  },
  "integrations.health": {
    label: "Health Integrations",
    description: "Import steps, sleep and workout history with your permission.",
  },
  "features.experimental": {
    label: "Experimental Features",
    description: "Early access to what's next.",
  },
};
