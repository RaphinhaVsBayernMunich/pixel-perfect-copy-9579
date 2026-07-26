/**
 * Subscription-lifecycle notifications.
 *
 * A single dispatcher so subscription events surface consistently across
 * toast (web) + native push. All events flow through here — never call
 * `toast.*` from billing code directly.
 */
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { isNative } from "@/lib/native/platform";

type NotifKind =
  | "purchase_success"
  | "trial_ending_3d"
  | "trial_ending_1d"
  | "subscription_expired"
  | "payment_failed"
  | "subscription_renewed"
  | "restore_success"
  | "premium_unlocked";

const COPY: Record<NotifKind, { title: string; body?: string; tone: "success" | "warning" | "info" | "error" }> = {
  purchase_success: {
    title: "Welcome to QuestOS Premium",
    body: "Every AI, theme, and integration is now unlocked.",
    tone: "success",
  },
  premium_unlocked: {
    title: "Premium unlocked",
    body: "Enjoy unlimited AI and advanced features.",
    tone: "success",
  },
  trial_ending_3d: {
    title: "3 days left of Premium",
    body: "Your trial ends soon. Continue with Premium to keep unlimited AI.",
    tone: "info",
  },
  trial_ending_1d: {
    title: "Your trial ends tomorrow",
    body: "Upgrade now to keep your streak alive.",
    tone: "warning",
  },
  subscription_expired: {
    title: "Subscription expired",
    body: "You're back on Free. Your data, quests, and Legacy are untouched.",
    tone: "info",
  },
  payment_failed: {
    title: "Payment failed",
    body: "We couldn't process your renewal. Update your payment method.",
    tone: "error",
  },
  subscription_renewed: {
    title: "Subscription renewed",
    body: "Thanks for continuing with QuestOS Premium.",
    tone: "success",
  },
  restore_success: {
    title: "Purchases restored",
    tone: "success",
  },
};

const SEEN_KEY = "questos.notif_seen";
function seenKey(kind: NotifKind, key?: string): string {
  return `${kind}${key ? `:${key}` : ""}`;
}
function hasSeen(kind: NotifKind, key?: string): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(SEEN_KEY);
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as string[]).includes(seenKey(kind, key));
  } catch {
    return false;
  }
}
function markSeen(kind: NotifKind, key?: string) {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(SEEN_KEY);
  const list = raw ? (JSON.parse(raw) as string[]) : [];
  list.push(seenKey(kind, key));
  localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-100)));
}

export function notify(kind: NotifKind, opts: { key?: string; once?: boolean } = {}) {
  const copy = COPY[kind];
  if (opts.once && hasSeen(kind, opts.key)) return;
  if (opts.once) markSeen(kind, opts.key);

  const fn =
    copy.tone === "success"
      ? toast.success
      : copy.tone === "error"
        ? toast.error
        : copy.tone === "warning"
          ? toast.warning
          : toast.info;
  fn(copy.title, { description: copy.body });

  track("feature_used", { kind: "notification", notification: kind });

  // Native push notification (silent fallback if plugin missing).
  if (isNative()) void sendNativePush(copy.title, copy.body);
}

async function sendNativePush(title: string, body?: string) {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title,
          body: body ?? "",
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
  } catch {
    /* plugin not installed / permission denied — silent */
  }
}
