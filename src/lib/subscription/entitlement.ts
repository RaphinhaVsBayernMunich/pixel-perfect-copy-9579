type ProfileEntitlement = {
  entitlement: string;
  subscription_status: string;
  trial_end: string | null;
  premium_expiration: string | null;
};

/** Backend calls must pass database state, never client-supplied entitlement. */
export function effectiveTier(
  profile: ProfileEntitlement | null,
  now = Date.now(),
): "free" | "trial" | "premium" {
  if (!profile || profile.entitlement !== "premium") return "free";
  if (profile.subscription_status === "trial") {
    return profile.trial_end && Date.parse(profile.trial_end) > now ? "trial" : "free";
  }
  if (profile.subscription_status === "premium") {
    return profile.premium_expiration === null || Date.parse(profile.premium_expiration) > now
      ? "premium"
      : "free";
  }
  return "free";
}
