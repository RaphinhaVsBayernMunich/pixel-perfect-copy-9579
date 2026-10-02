import { validAuthCallback } from "./auth-callback";
import { isNative } from "./platform";
import { supabase } from "@/integrations/supabase/client";
export const AUTH_REDIRECT = "app.questos.android://auth/callback";
const PENDING = "questos.native-auth-start";
export async function openExternal(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("Only secure links are supported.");
  if (isNative()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } else window.open(url, "_blank", "noopener,noreferrer");
}
export async function nativeGoogleSignIn() {
  localStorage.setItem(PENDING, String(Date.now()));
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error("Google sign-in is unavailable. Use email sign-in.");
    await openExternal(data.url);
  } catch (error) {
    localStorage.removeItem(PENDING);
    throw error;
  }
}
export async function acceptNativeAuth(url: string) {
  if (!validAuthCallback(url, Number(localStorage.getItem(PENDING)))) return false;
  localStorage.removeItem(PENDING);
  const { error } = await supabase.auth.exchangeCodeForSession(
    new URL(url).searchParams.get("code")!,
  );
  const { Browser } = await import("@capacitor/browser");
  await Browser.close().catch(() => {});
  if (error) throw new Error("Sign-in expired. Please start sign-in again.");
  return true;
}
