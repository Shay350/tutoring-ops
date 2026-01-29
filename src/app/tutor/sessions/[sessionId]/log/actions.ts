"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import {
  calculateLastSessionDelta,
  countLoggedSessions,
  extractLoggedSessionDates,
  parsePercent,
} from "@/lib/progress";

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

  const { data: studentSessions, error: sessionsError } = await context.supabase
    .from("sessions")
    .select("session_date, session_logs(id)")
    .eq("student_id", session.student_id)
    .order("session_date", { ascending: false });

  if (sessionsError) {
    return toActionError("Unable to update progress snapshot.");
  }

  const loggedDates = extractLoggedSessionDates(studentSessions ?? []);
  const latestLoggedDate = loggedDates[0] ?? null;
  const previousLoggedDate =
    loggedDates.find((date) => date !== session.session_date) ?? null;
  const lastSessionDelta = calculateLastSessionDelta(
    session.session_date,
    previousLoggedDate
  );

  const sessionsCompleted = countLoggedSessions(studentSessions ?? []);
  const snapshotTimestamp = new Date().toISOString();

  const { data: existingSnapshot, error: snapshotError } =
    await context.supabase
      .from("progress_snapshots")
      .select("id")
      .eq("student_id", session.student_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (snapshotError) {
    return toActionError("Unable to update progress snapshot.");
  }

  const snapshotPayload = {
    student_id: session.student_id,
    sessions_completed: sessionsCompleted,
    last_session_at: latestLoggedDate ?? session.session_date,
    attendance_rate: attendanceRate,
    homework_completion: homeworkCompletion,
    last_session_delta: lastSessionDelta,
    notes: progressNotes || null,
    updated_at: snapshotTimestamp,
  };

  if (existingSnapshot) {
    const { error } = await context.supabase
      .from("progress_snapshots")
      .update(snapshotPayload)
      .eq("id", existingSnapshot.id);

    if (error) {
      return toActionError("Unable to update progress snapshot.");
    }
  } else {
    const { error } = await context.supabase
      .from("progress_snapshots")
      .insert(snapshotPayload);

    if (error) {
      return toActionError("Unable to update progress snapshot.");
    }
  }

  revalidatePath(`/tutor/sessions/${sessionId}/log`);
  revalidatePath("/tutor");
  revalidatePath("/tutor/students");
  revalidatePath("/customer/history");

  return toActionSuccess("Session log saved.");
}
