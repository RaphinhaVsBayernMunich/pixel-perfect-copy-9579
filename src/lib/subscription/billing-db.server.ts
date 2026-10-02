import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  billingEnvironment,
  subscriptionSnapshot,
  billingEvent,
  type BillingEvent,
} from "./billing-contracts";
// New migration tables are parsed at boundaries until generated Supabase types are refreshed.
export const billingDb = supabaseAdmin as SupabaseClient;
export function configuredBillingEnvironment() {
  return billingEnvironment.parse(process.env.BILLING_ENVIRONMENT ?? "live");
}
export async function getBillingSnapshot(userId: string) {
  const { data, error } = await billingDb
    .rpc("subscription_snapshot", { _user_id: userId })
    .abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("Subscription status is unavailable. Please retry.");
  const result = subscriptionSnapshot.parse(data);
  if (result.environment !== configuredBillingEnvironment())
    throw new Error("Billing environment is not configured consistently. Contact support.");
  return result;
}
export async function requirePremium(userId: string) {
  const state = await getBillingSnapshot(userId);
  if (state.tier === "free")
    throw new Error("Premium or an active trial is required for this feature.");
  return state;
}
export async function applyBillingEvent(input: BillingEvent) {
  const event = billingEvent.parse(input);
  if (event.environment !== configuredBillingEnvironment())
    throw new Error("Wrong billing environment");
  const { error } = await billingDb
    .rpc("apply_billing_event", { _event: event })
    .abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("Billing event persistence failed");
}

export async function takeBillingRequest(userId: string) {
  const { error } = await billingDb
    .rpc("take_billing_request", { _user_id: userId })
    .abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("Billing refresh is temporarily unavailable. Retry in a minute.");
}
