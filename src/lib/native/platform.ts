/**
 * Runtime platform detection.
 *
 * `@capacitor/core` is safe to import in both web and native builds — on the
 * web it degrades to a no-op shim, on native it wires into the JS bridge.
 * Business logic should call `isNative()` rather than checking `window` or
 * `navigator.userAgent`.
 */
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "android" | "ios" | "web" {
  try {
    const p = Capacitor.getPlatform();
    if (p === "android" || p === "ios") return p;
  } catch {
    /* noop */
  }
  return "web";
}
