import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { premiumWrite, coachTask, simulate, planDay } from "./contracts";
export const getPremiumData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { premiumData } = await import("./data.server");
    return premiumData(context.userId);
  });
export const savePremiumData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => premiumWrite.parse(input))
  .handler(async ({ context, data }) => {
    const { billingDb, requirePremium } = await import("../subscription/billing-db.server");
    await requirePremium(context.userId);
    const { error } = await billingDb.from("premium_documents").upsert(
      {
        user_id: context.userId,
        kind: data.kind,
        value: data.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,kind" },
    );
    if (error) throw new Error("Your changes could not be saved. Please retry.");
    return { ok: true };
  });
export const runPremiumCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => coachTask.parse(input))
  .handler(async ({ context, data }) => {
    const { premiumData } = await import("./data.server");
    const current = await premiumData(context.userId);
    const { runAi } = await import("../ai-service.server");
    let evidence: unknown;
    let proposalId: string | null = null;
    if (data.feature === "future_me")
      evidence = {
        goal: data.goal,
        years: data.years,
        weeklyHours: data.weeklyHours,
        practiceHours: [0.6, 0.8, 1].map((adherence) => ({
          adherence,
          hours: Math.round(data.years * 52 * data.weeklyHours * adherence),
        })),
        recent: current.metrics,
      };
    else if (data.feature === "goal_simulator")
      evidence = {
        goal: data.goal,
        effortHours: data.effortHours,
        scenarios: simulate(data.effortHours, data.weeklyHours),
        currentBacklogHours: Math.round(current.metrics.plannedMinutes / 60),
      };
    else {
      const actions = planDay(current.quests, data.date, data.startHour, data.availableMinutes);
      if (!actions.length)
        throw new Error(
          "No unscheduled quest fits this window. Increase the time available or add a smaller quest.",
        );
      evidence = { date: data.date, actions };
    }
    const response = await runAi(data.feature, { evidence: JSON.stringify(evidence) });
    if (!response.ok)
      throw new Error(
        "AI Coach could not complete this request. Please retry within your daily limit.",
      );
    if (data.feature === "executive_assistant") {
      const { billingDb, requirePremium } = await import("../subscription/billing-db.server");
      await requirePremium(context.userId);
      const { data: proposal, error } = await billingDb
        .from("assistant_proposals")
        .insert({ user_id: context.userId, actions: (evidence as { actions: unknown }).actions })
        .select("id")
        .single();
      if (error) throw new Error("Could not save the proposal. No quests were changed.");
      proposalId = proposal.id;
    }
    return {
      feature: data.feature,
      evidenceJson: JSON.stringify(evidence),
      narrative: response.value,
      proposalId,
    };
  });
export const confirmAssistantPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ proposalId: z.string().uuid(), confirm: z.literal(true) })
      .strict()
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { billingDb } = await import("../subscription/billing-db.server");
    const { error } = await billingDb.rpc("confirm_assistant_plan", {
      _user_id: context.userId,
      _proposal_id: data.proposalId,
    });
    if (error)
      throw new Error(
        "Plan was not applied. It may be stale or Premium may have expired. Refresh and create a new plan.",
      );
    return { ok: true };
  });
export const applyCalendarChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        confirm: z.literal(true),
        changes: z
          .array(
            z
              .object({
                id: z.string().uuid(),
                version: z.string().datetime({ offset: true }),
                title: z.string().min(1).max(240),
                date: z.string().date(),
                startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                minutes: z.number().int().min(1).max(1440),
              })
              .strict(),
          )
          .max(300),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { billingDb, requirePremium } = await import("../subscription/billing-db.server");
    await requirePremium(context.userId);
    const { data: proposal, error } = await billingDb
      .from("assistant_proposals")
      .insert({ user_id: context.userId, actions: data.changes })
      .select("id")
      .single();
    if (error) throw new Error("Calendar changes could not be prepared.");
    const { error: applyError } = await billingDb.rpc("confirm_assistant_plan", {
      _user_id: context.userId,
      _proposal_id: proposal.id,
    });
    if (applyError)
      throw new Error("Calendar changes were not applied. Refresh stale quests and retry.");
    return { ok: true };
  });
