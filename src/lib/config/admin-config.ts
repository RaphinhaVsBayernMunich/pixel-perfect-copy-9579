/**
 * QuestOS Admin Configuration
 * ===========================
 *
 * Client-facing labels and default business rules. Server enforcement lives in
 * the reviewed database migrations and billing adapters. Changing a label here
 * does not change trial duration, quotas, limits or provider prices.
 * Coordinate approved changes with docs/subscription-setup.md.
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
   * `premium` may be `null`; the finite fair-use ceiling still applies.
   * The backend passes these limits to the service-only reservation RPC.
   */
  aiQuota: {
    free: 10,
    trial: 40,
    premium: null as number | null,
    /** Required positive fair-use ceiling, even for premium. Invalid values fail closed. */
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
