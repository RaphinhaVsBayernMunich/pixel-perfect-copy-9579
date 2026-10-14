import { expect, test } from "bun:test";
import { authErrorMessage, signupFeedback } from "../src/lib/auth-feedback";

test("authentication errors are useful without exposing raw provider data", () => {
  const privateMessage = "SMTP password/private-token/raw-server-detail";
  for (const error of [
    new Error(privateMessage),
    { status: 500, message: privateMessage },
    { code: "email_address_not_authorized", message: privateMessage },
    { status: 429, message: privateMessage },
    { code: "weak_password", message: privateMessage },
    { code: "user_already_exists", message: privateMessage },
  ]) {
    for (const mode of ["signup", "signin"] as const)
      expect(authErrorMessage(error, mode)).not.toContain(privateMessage);
  }
  expect(authErrorMessage({ status: 429 }, "signup")).toContain("wait");
  expect(authErrorMessage({ code: "over_email_send_rate_limit" }, "signup")).toContain("wait");
  expect(authErrorMessage({ code: "email_address_not_authorized" }, "signup")).toContain(
    "founder@oryxion.net",
  );
  expect(authErrorMessage({ status: 500 }, "signup")).toContain("temporarily unavailable");
  expect(authErrorMessage({ code: "email_not_confirmed" }, "signin")).toContain(
    "Confirm your email",
  );
});

test("sessionless or obfuscated signup success never guarantees an email was sent", () => {
  const pending = signupFeedback(false);
  expect(pending.title).toBe("Signup request received");
  expect(pending.description).toContain("If a confirmation email is sent");
  expect(pending.description).toContain("Delivery is not confirmed");
  expect(signupFeedback(true).title).toBe("You're signed in");
});
