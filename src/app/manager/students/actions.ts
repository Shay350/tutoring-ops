"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

export async function updateAtRiskStatus(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  const atRiskValue = String(formData.get("at_risk") ?? "").trim();
  const reason = String(formData.get("at_risk_reason") ?? "").trim();

  if (!studentId) {
    return toActionError("Missing student id.");
  }

  if (atRiskValue !== "true" && atRiskValue !== "false") {
    return toActionError("Select a valid risk status.");
  }

  const atRisk = atRiskValue === "true";
  const payload = {
    at_risk: atRisk,
    at_risk_reason: atRisk ? reason || null : null,
  };

  const { error } = await context.supabase
    .from("students")
    .update(payload)
    .eq("id", studentId);

  if (error) {
    return toActionError("Unable to update student risk status.");
  }

  revalidatePath("/manager/students");
  revalidatePath("/manager");

  return toActionSuccess("Student risk status updated.");
}
