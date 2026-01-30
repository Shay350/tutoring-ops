"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { parsePercent } from "@/lib/progress";

export async function saveSessionLog(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
  const attendanceRateInput = String(
    formData.get("attendance_rate") ?? ""
  ).trim();
  const homeworkCompletionInput = String(
    formData.get("homework_completion") ?? ""
  ).trim();
  const progressNotes = String(formData.get("progress_notes") ?? "").trim();

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
    .select("id, student_id, session_date")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return toActionError("Session not found or unavailable.");
  }

  const attendanceRate = parsePercent(attendanceRateInput);
  if (attendanceRateInput && attendanceRate === null) {
    return toActionError("Attendance rate must be between 0 and 100.");
  }

  const homeworkCompletion = parsePercent(homeworkCompletionInput);
  if (homeworkCompletionInput && homeworkCompletion === null) {
    return toActionError("Homework completion must be between 0 and 100.");
  }

  const { data: existingLog } = await context.supabase
    .from("session_logs")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  const logTimestamp = new Date().toISOString();

  if (existingLog) {
    const { error } = await context.supabase
      .from("session_logs")
      .update({
        topics,
        homework,
        next_plan: nextPlan,
        customer_summary: customerSummary,
        private_notes: privateNotes,
        updated_at: logTimestamp,
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
      updated_at: logTimestamp,
    });

    if (error) {
      return toActionError("Unable to create session log.");
    }
  }

  const { error: snapshotError } = await context.supabase.rpc(
    "upsert_progress_snapshot",
    {
      p_student_id: session.student_id,
      p_attendance_rate: attendanceRate,
      p_homework_completion: homeworkCompletion,
      p_notes: progressNotes || null,
    }
  );

  if (snapshotError) {
    return toActionError("Unable to update progress snapshot.");
  }

  revalidatePath(`/tutor/sessions/${sessionId}/log`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/students");
  revalidatePath("/customer/history");

  return toActionSuccess("Session log saved.");
}
