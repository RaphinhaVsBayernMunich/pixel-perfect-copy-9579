/**
 * QuestOS Admin Configuration
 * ===========================
 *
 * Single source of truth for tunable business rules — plan pricing, trial
 * length, feature limits, AI quotas, and the list of premium features.
 *
 * Read from here everywhere; NEVER hard-code these values in components,
 * server functions, or migrations. To change pricing, trial length, or
 * limits without a code rewrite:
 *   1. Edit the constants below.
 *   2. If it's a paid-plan price change, also update the Stripe Dashboard
 *      and Google Play Console (see docs/BILLING.md).
 *
 * These values are shipped in the bundle — they are not secrets. Anything
 * server-authoritative (webhook secrets, service role key) lives in secrets.
 */

import type { PremiumFeature } from "@/lib/subscription/types";

export const APP_CONFIG = {
  /** App-managed free trial length in days. Server-authoritative. */
  trialDays: 7,

  /**
   * AI daily request quotas. Enforced server-side in ai.functions.ts.
   * `premium` may be `null` for effectively unlimited (still cost-capped
   * via Lovable AI Gateway credits).
   */
  aiQuota: {
    free: 10,
    trial: 40,
    premium: null as number | null,
    /** Fair-use hard ceiling even for premium (0 = disabled). */
    premiumHardCeiling: 500,
  },

  /**
   * Feature limits for the free tier. UI reads these to render limit
   * badges and gate quest creation. Set to `null` for unlimited.
   */
  freeLimits: {
    activeQuests: 25,
    projects: 3,
    legacyEventRetentionDays: null as number | null,
    achievementsVisible: null as number | null,
  },

  /** Grace period after a paid subscription expires before locking premium features. */
  billingGracePeriodDays: 3,

  /** Trial-ending notification thresholds (in days remaining). */
  trialWarnDaysRemaining: [3, 1] as const,

  /** How often (ms) the client refreshes subscription state from the backend. */
  subscriptionRefreshIntervalMs: 15 * 60 * 1000,

  /** How often (ms) the analytics buffer flushes to the backend. */
  analyticsFlushIntervalMs: 15 * 1000,

  /** Feature keys that trigger the premium paywall — mirrors PremiumFeature. */
  premiumFeatures: [
    "ai.unlimited",
    "ai.memory",
    "ai.future_me",
    "ai.goal_simulator",
    "ai.executive_assistant",
    "analytics.advanced",
    "themes.premium",
    "sounds.premium",
    "widgets.premium",
    "widgets.dashboard_advanced",
    "integrations.calendar",
    "integrations.health",
    "features.experimental",
  ] as const satisfies readonly PremiumFeature[],

  legal: {
    privacyUrl: "/legal/privacy",
    termsUrl: "/legal/terms",
    supportEmail: "support@questos.app",
    companyName: "QuestOS",
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
