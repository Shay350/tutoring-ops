"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import type { SessionTimeSlot } from "@/lib/schedule";
import {
  expandWeeklyRecurrence,
  normalizeWeekdays,
  formatDateKey,
  parseDateKey,
  validateTimeRange,
  findOverlap,
} from "@/lib/schedule";
import { generateUniqueShortCode } from "@/lib/short-codes";

function parseAssignmentPair(pair: string): { studentId: string; tutorId: string } {
  const [studentId, tutorId] = pair.split("|");
  return { studentId: studentId?.trim() ?? "", tutorId: tutorId?.trim() ?? "" };
}

export async function createRecurringSessions(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const pair = String(formData.get("assignment_pair") ?? "").trim();
  const { studentId, tutorId } = parseAssignmentPair(pair);
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const status = String(formData.get("status") ?? "scheduled").trim();
  const weekdaysRaw = formData.getAll("weekdays").map((value) => String(value));
  const allowOverbook = Boolean(formData.get("allow_overbook"));

  if (!studentId || !tutorId) {
    return toActionError("Select a valid assignment.");
  }

  if (!startDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(startDate)) {
    return toActionError("Provide a valid start date.");
  }

  if (!endDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(endDate)) {
    return toActionError("Provide a valid end date.");
  }

  const parsedStart = parseDateKey(startDate);
  const parsedEnd = parseDateKey(endDate);

  if (!parsedStart || !parsedEnd) {
    return toActionError("Provide valid start and end dates.");
  }

  if (parsedStart.getTime() > parsedEnd.getTime()) {
    return toActionError("End date must be on or after the start date.");
  }

  const timeError = validateTimeRange(startTime, endTime);
  if (timeError) {
    return toActionError(timeError);
  }

  const weekdays = normalizeWeekdays(weekdaysRaw);
  if (weekdays.length === 0) {
    return toActionError("Select at least one weekday.");
  }

  const { data: assignment, error: assignmentError } = await context.supabase
    .from("assignments")
    .select("id")
    .eq("student_id", studentId)
    .eq("tutor_id", tutorId)
    .eq("status", "active")
    .maybeSingle();

  if (assignmentError) {
    return toActionError("Unable to verify assignment.");
  }

  if (!assignment) {
    return toActionError("Tutor is not assigned to this student.");
  }

  const sessionDates = expandWeeklyRecurrence({
    startDate,
    endDate,
    weekdays,
  });

  if (sessionDates.length === 0) {
    return toActionError("No sessions fall within that date range.");
  }

  const { data: existingSessions, error: existingError } = await context.supabase
    .from("sessions")
    .select("session_date, start_time, end_time")
    .eq("tutor_id", tutorId)
    .gte("session_date", sessionDates[0])
    .lte("session_date", sessionDates[sessionDates.length - 1]);

  if (existingError) {
    return toActionError("Unable to verify tutor availability.");
  }

  const incomingSessions = sessionDates.map(
    (date) =>
      ({
        session_date: date,
        start_time: startTime,
        end_time: endTime,
      }) satisfies SessionTimeSlot
  );

  const overlapMessage = findOverlap(existingSessions ?? [], incomingSessions);
  if (overlapMessage) {
    return toActionError(overlapMessage);
  }

  const recurrenceRule = `weekly:${weekdays.join(",")}`;

  const todayKey = formatDateKey(new Date());
  const incomingUpcomingCount = sessionDates.filter((dateKey) => dateKey >= todayKey).length;

  if (incomingUpcomingCount > 0 && !allowOverbook) {
    const [{ data: membership }, { data: existingUpcomingSessions }] =
      await Promise.all([
        context.supabase
          .from("memberships")
          .select("hours_remaining")
          .eq("student_id", studentId)
          .maybeSingle(),
        context.supabase
          .from("sessions")
          .select("id")
          .eq("student_id", studentId)
          .eq("status", "scheduled")
          .gte("session_date", todayKey),
      ]);

    const hoursRemaining = membership?.hours_remaining;
    const remaining = Number.isFinite(hoursRemaining ?? NaN)
      ? Number(hoursRemaining)
      : null;

    if (remaining !== null) {
      const reserved = (existingUpcomingSessions ?? []).length;
      const projected = reserved + incomingUpcomingCount;
      if (projected > remaining) {
        return toActionError(
          `Upcoming sessions (${projected}) exceed membership hours remaining (${remaining}). Check “Allow scheduling beyond prepaid hours” to override.`
        );
      }
    }
  }

  const payload = [];
  for (const date of sessionDates) {
    const shortCode = await generateUniqueShortCode(
      context.supabase,
      "sessions",
      "SES"
    );

    payload.push({
      student_id: studentId,
      tutor_id: tutorId,
      created_by: context.user.id,
      status: status || "scheduled",
      session_date: date,
      start_time: startTime,
      end_time: endTime,
      recurrence_rule: recurrenceRule,
      short_code: shortCode,
    });
  }

  const { error } = await context.supabase.from("sessions").insert(payload);

  if (error) {
    return toActionError("Unable to create recurring sessions.");
  }

  revalidatePath("/manager/schedule");
  revalidatePath("/manager");

  return toActionSuccess(`Created ${payload.length} sessions.`);
}
