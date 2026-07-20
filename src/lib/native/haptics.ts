import { isNative } from "./platform";

/**
 * Thin wrapper around `@capacitor/haptics` that no-ops on web.
 * Import from anywhere — this keeps components framework-agnostic.
 */
export async function hapticTap() {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable */
  }
}

export async function hapticSuccess() {
  if (!isNative()) return;
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* noop */
  }
}
