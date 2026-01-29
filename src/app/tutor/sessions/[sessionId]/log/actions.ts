import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

export async function saveSessionLog(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";

  const context = await getActionContext("tutor");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const topics = String(formData.get("topics") ?? "").trim();
  const homework = String(formData.get("homework") ?? "").trim();
  const nextPlan = String(formData.get("next_plan") ?? "").trim();
  const customerSummary = String(formData.get("customer_summary") ?? "").trim();
  const privateNotes = String(formData.get("private_notes") ?? "").trim();

  if (!sessionId) {
    return toActionError("Missing session id.");
  }

  if (!topics) {
    return toActionError("Topics covered are required.");
  }

  if (!customerSummary) {
    return toActionError("Customer summary is required.");
  }

  const { data: session } = await context.supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return toActionError("Session not found or unavailable.");
  }

  const { data: existingLog } = await context.supabase
    .from("session_logs")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existingLog) {
    const { error } = await context.supabase
      .from("session_logs")
      .update({
        topics,
        homework,
        next_plan: nextPlan,
        customer_summary: customerSummary,
        private_notes: privateNotes,
        updated_at: now,
      })
      .eq("session_id", sessionId);

    if (error) {
      return toActionError("Unable to update session log.");
    }
  } else {
    const { error } = await context.supabase.from("session_logs").insert({
      session_id: sessionId,
      topics,
      homework,
      next_plan: nextPlan,
      customer_summary: customerSummary,
      private_notes: privateNotes,
      updated_at: now,
    });

    if (error) {
      return toActionError("Unable to create session log.");
    }
  }

  revalidatePath(`/tutor/sessions/${sessionId}/log`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/students");

  return toActionSuccess("Session log saved.");
}
