type AuthMode = "signin" | "signup";

/** Never display provider messages: they may include credentials or internal configuration. */
export function authErrorMessage(error: unknown, mode: AuthMode): string {
  const value = error && typeof error === "object" ? error : {};
  const code = "code" in value ? value.code : undefined;
  const status = "status" in value ? value.status : undefined;
  if (status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit")
    return "Too many attempts. Please wait before trying again.";
  if (code === "email_address_not_authorized")
    return "Email confirmation is unavailable for this address. Contact founder@oryxion.net for help.";
  if (code === "unexpected_failure" || (typeof status === "number" && status >= 500))
    return "Authentication is temporarily unavailable. Please retry later or contact founder@oryxion.net.";
  if (code === "signup_disabled" || code === "email_provider_disabled")
    return "Email signup is currently unavailable. Contact founder@oryxion.net for help.";
  if (code === "email_address_invalid" || code === "validation_failed")
    return "Check your email address and the required fields, then try again.";
  if (code === "weak_password") return "Choose a stronger password and try again.";
  if (mode === "signin" && code === "email_not_confirmed")
    return "Confirm your email before signing in. If no message arrived, contact founder@oryxion.net.";
  if (mode === "signin")
    return "Sign-in could not be completed. Check your details and connection, then retry.";
  return "Signup could not be completed. Try signing in, or retry later. Contact founder@oryxion.net if this continues.";
}

export function signupFeedback(hasSession: boolean) {
  return hasSession
    ? { title: "You're signed in", description: "Your account is ready to use." }
    : {
        title: "Signup request received",
        description:
          "If a confirmation email is sent for this address, follow its link before signing in. Check your inbox and spam. Delivery is not confirmed; if nothing arrives, contact founder@oryxion.net.",
      };
}
