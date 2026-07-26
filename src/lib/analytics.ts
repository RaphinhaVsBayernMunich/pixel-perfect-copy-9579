/**
 * QuestOS Analytics — centralized event bus.
 *
 * Every event in the app funnels through `track(event, properties)`.
 * Callers never write to Supabase, `window`, or a third-party SDK
 * directly — this keeps swapping providers (PostHog, Amplitude, custom)
 * a one-file change.
 *
 * Events are buffered client-side and flushed to `analytics_events`
 * server-side on an interval, on page hide, and immediately for the
 * `critical` bucket (purchases, sign-ups).
 */
import { APP_CONFIG } from "@/lib/config/admin-config";
import { recordAnalyticsBatch } from "@/lib/analytics.functions";
import { nativePlatform } from "@/lib/native/platform";

export type AnalyticsEvent =
  // Auth / onboarding
  | "signup"
  | "signin"
  | "signout"
  | "onboarding_started"
  | "onboarding_completed"
  // Subscription
  | "trial_started"
  | "trial_expired"
  | "paywall_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "purchase"
  | "renewal"
  | "cancellation"
  | "subscription_restored"
  | "subscription_refreshed"
  | "billing_failed"
  | "portal_opened"
  // Feature usage
  | "feature_used"
  | "premium_feature_used"
  | "premium_feature_blocked"
  | "quest_created"
  | "quest_completed"
  | "quest_scheduled"
  | "xp_earned"
  | "level_up"
  | "legacy_created"
  | "journal_saved"
  | "project_created"
  | "dashboard_opened"
  | "calendar_opened"
  | "calendar_view_changed"
  // AI
  | "ai_conversation_started"
  | "ai_conversation_completed"
  | "ai_quota_exceeded"
  // Settings
  | "settings_changed"
  | "data_exported"
  | "account_deleted";

type EventPayload = {
  event: AnalyticsEvent;
  properties: Record<string, unknown>;
  session_id: string;
  platform: string;
  occurred_at: string;
};

const CRITICAL = new Set<AnalyticsEvent>([
  "signup",
  "purchase",
  "checkout_completed",
  "cancellation",
  "billing_failed",
  "trial_started",
  "account_deleted",
]);

let sessionId: string | null = null;
function getSessionId(): string {
  if (sessionId) return sessionId;
  if (typeof sessionStorage !== "undefined") {
    const existing = sessionStorage.getItem("questos.session_id");
    if (existing) return (sessionId = existing);
    const fresh = crypto.randomUUID?.() ?? `s_${Date.now()}_${Math.random()}`;
    sessionStorage.setItem("questos.session_id", fresh);
    return (sessionId = fresh);
  }
  return (sessionId = crypto.randomUUID?.() ?? `s_${Date.now()}`);
}

let buffer: EventPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await recordAnalyticsBatch({ data: { events: batch } });
  } catch (e) {
    // On failure, re-queue up to a soft cap so we don't grow unboundedly.
    if (buffer.length < 200) buffer.unshift(...batch);
    console.warn("analytics flush failed", e);
  }
}

function ensureTimer() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = setInterval(flush, APP_CONFIG.analyticsFlushIntervalMs);
  window.addEventListener("pagehide", () => void flush());
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}

/** Fire-and-forget analytics event. */
export function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  try {
    ensureTimer();
    const payload: EventPayload = {
      event,
      properties,
      session_id: getSessionId(),
      platform: typeof window === "undefined" ? "ssr" : nativePlatform(),
      occurred_at: new Date().toISOString(),
    };
    buffer.push(payload);
    if (CRITICAL.has(event)) void flush();
  } catch (e) {
    console.warn("analytics track failed", e);
  }
}

/** Flush pending events immediately (e.g. before sign-out). */
export async function flushAnalytics(): Promise<void> {
  await flush();
}
