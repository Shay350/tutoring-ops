"use server";

import { revalidatePath } from "next/cache";

import { getActionContext, toActionError, toActionSuccess } from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import type { OperatingHoursRow } from "@/lib/operating-hours";
import {
  isTimeRangeWithinOperatingHours,
  mapOperatingHoursByWeekday,
  weekdayFromDateKey,
} from "@/lib/operating-hours";
import { getDefaultLocationId } from "@/lib/locations";
import { addDaysUtc, formatDateKey, parseTimeToMinutes } from "@/lib/schedule";
import { generateUniqueShortCode } from "@/lib/short-codes";
import {
  generateSlottingSuggestions,
  type SlottingSuggestionReasonsV1,
} from "@/lib/vs9-slotting";

const DEFAULT_HORIZON_DAYS = 14;
const DEFAULT_LIMIT = 30;
const MAX_STUDENTS_PER_TUTOR_PER_HOUR = 4;

function parseOptionalBoundedInt(
  rawValue: string,
  min: number,
  max: number,
  fallback: number
): number {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return fallback;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(parsed, max));
}

function buildSuggestionKey(input: {
  tutorId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
}): string {
  return `${input.tutorId}|${input.sessionDate}|${input.startTime}|${input.endTime}`;
}

export async function generateSlottingSuggestionsForIntake(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const intakeId = String(formData.get("intake_id") ?? "").trim();
  const horizonDaysRaw = String(formData.get("horizon_days") ?? "").trim();
  const limitRaw = String(formData.get("limit") ?? "").trim();

  if (!intakeId) {
    return toActionError("Missing intake id.");
  }

  const horizonDays = parseOptionalBoundedInt(
    horizonDaysRaw,
    1,
    60,
    DEFAULT_HORIZON_DAYS
  );
  const limit = parseOptionalBoundedInt(limitRaw, 1, 200, DEFAULT_LIMIT);

  const [{ data: intake, error: intakeError }, { data: student, error: studentError }] =
    await Promise.all([
      context.supabase
        .from("intakes")
        .select("id, availability")
        .eq("id", intakeId)
        .maybeSingle(),
      context.supabase
        .from("students")
        .select("id")
        .eq("intake_id", intakeId)
        .maybeSingle(),
    ]);

  if (intakeError || !intake) {
    return toActionError("Intake not found.");
  }

  if (studentError) {
    return toActionError("Unable to load student for this intake.");
  }

  const studentId = student?.id ?? null;

  const assignedTutorId = studentId
    ? (
        await context.supabase
          .from("assignments")
          .select("tutor_id")
          .eq("student_id", studentId)
          .eq("status", "active")
          .maybeSingle()
      ).data?.tutor_id ?? null
    : null;

  const { data: tutors, error: tutorsError } = assignedTutorId
    ? { data: [{ id: assignedTutorId }], error: null }
    : await context.supabase
        .from("profiles")
        .select("id")
        .eq("role", "tutor")
        .eq("pending", false)
        .order("full_name", { ascending: true });

  if (tutorsError) {
    return toActionError("Unable to load tutors.");
  }

  const candidateTutorIds = (tutors ?? [])
    .map((row) => row.id)
    .filter((value): value is string => Boolean(value));

  if (candidateTutorIds.length === 0) {
    return toActionSuccess("No tutors available to generate suggestions.");
  }

  let defaultLocationId: string;
  try {
    defaultLocationId = await getDefaultLocationId(context.supabase);
  } catch (error) {
    return toActionError(
      error instanceof Error ? error.message : "Unable to load default location."
    );
  }

  const todayKey = formatDateKey(new Date());
  const endKey = formatDateKey(
    addDaysUtc(new Date(`${todayKey}T00:00:00Z`), horizonDays - 1)
  );

  const [operatingHoursResult, existingSessionsResult, lockedSuggestionsResult] =
    await Promise.all([
      context.supabase
        .from("operating_hours")
        .select("weekday, is_closed, open_time, close_time")
        .eq("location_id", defaultLocationId)
        .order("weekday", { ascending: true }),
      context.supabase
        .from("sessions")
        .select("tutor_id, session_date, start_time, end_time, status")
        .in("tutor_id", candidateTutorIds)
        .gte("session_date", todayKey)
        .lte("session_date", endKey),
      context.supabase
        .from("slotting_suggestions")
        .select("tutor_id, session_date, start_time, end_time, status")
        .eq("intake_id", intakeId)
        .neq("status", "new"),
    ]);

  if (operatingHoursResult.error) {
    return toActionError("Unable to load operating hours.");
  }

  if (existingSessionsResult.error) {
    return toActionError("Unable to load existing sessions for tutors.");
  }

  if (lockedSuggestionsResult.error) {
    return toActionError("Unable to load existing suggestions for this intake.");
  }

  const operatingHoursRows = (operatingHoursResult.data ?? []) as OperatingHoursRow[];
  const lockedKeys = new Set(
    (lockedSuggestionsResult.data ?? [])
      .map((row) => {
        if (!row.tutor_id || !row.session_date || !row.start_time || !row.end_time) {
          return null;
        }
        return buildSuggestionKey({
          tutorId: row.tutor_id,
          sessionDate: row.session_date,
          startTime: row.start_time,
          endTime: row.end_time,
        });
      })
      .filter((value): value is string => Boolean(value))
  );

  const candidates = generateSlottingSuggestions({
    intakeAvailabilityText: intake.availability ?? "",
    operatingHoursRows,
    candidateTutorIds,
    existingSessions: (existingSessionsResult.data ?? []).map((row) => ({
      tutorId: row.tutor_id,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
    })),
    horizonDays,
    capacityPerTutorHour: MAX_STUDENTS_PER_TUTOR_PER_HOUR,
    limit,
  }).filter(
    (candidate) =>
      !lockedKeys.has(
        buildSuggestionKey({
          tutorId: candidate.tutorId,
          sessionDate: candidate.sessionDate,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
        })
      )
  );

  const { error: deleteError } = await context.supabase
    .from("slotting_suggestions")
    .delete()
    .eq("intake_id", intakeId)
    .eq("status", "new");

  if (deleteError) {
    return toActionError("Unable to refresh existing suggestions.");
  }

  if (candidates.length === 0) {
    revalidatePath(`/manager/pipeline/${intakeId}`);
    return toActionSuccess("No suggestions available under current constraints.");
  }

  const payload = candidates.map((candidate) => ({
    intake_id: intakeId,
    student_id: studentId,
    tutor_id: candidate.tutorId,
    session_date: candidate.sessionDate,
    start_time: candidate.startTime,
    end_time: candidate.endTime,
    score: candidate.score,
    reasons: candidate.reasons,
    status: "new",
  }));

  const { error: insertError } = await context.supabase
    .from("slotting_suggestions")
    .insert(payload);

  if (insertError) {
    return toActionError("Unable to save slotting suggestions.");
  }

  revalidatePath(`/manager/pipeline/${intakeId}`);

  return toActionSuccess(`Generated ${payload.length} slotting suggestions.`);
}

export async function rejectSlottingSuggestion(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const suggestionId = String(formData.get("suggestion_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!suggestionId) {
    return toActionError("Missing suggestion id.");
  }

  const { data: suggestion, error: suggestionError } = await context.supabase
    .from("slotting_suggestions")
    .select("id, intake_id, status, reasons")
    .eq("id", suggestionId)
    .maybeSingle();

  if (suggestionError || !suggestion) {
    return toActionError("Suggestion not found.");
  }

  if (suggestion.status === "rejected") {
    if (intakeId) {
      revalidatePath(`/manager/pipeline/${intakeId}`);
    }
    return toActionSuccess("Suggestion already rejected.");
  }

  if (suggestion.status === "approved") {
    return toActionError("Approved suggestions cannot be rejected.");
  }

  const priorReasons = suggestion.reasons as SlottingSuggestionReasonsV1 | null;
  const nextReasons: SlottingSuggestionReasonsV1 =
    priorReasons && typeof priorReasons === "object" && "version" in priorReasons
      ? {
          ...(priorReasons as SlottingSuggestionReasonsV1),
          manager: {
            ...(priorReasons.manager ?? {}),
            decision: {
              kind: "reject",
              note: note || null,
              at: new Date().toISOString(),
            },
          },
        }
      : {
          version: 1,
          generated: {
            intakeAvailability: {
              source: "none",
              allowedWeekdays: null,
              preferredWindows: [],
            },
            rules: { horizonDays: 0, durationMinutes: 60, capacityPerTutorHour: 0 },
            ranking: {
              dayOffset: 0,
              weekday: 0,
              startMinutes: 0,
              overlapCount: 0,
              preferenceBonus: 0,
              score: 0,
            },
          },
          manager: {
            decision: {
              kind: "reject",
              note: note || null,
              at: new Date().toISOString(),
            },
          },
        };

  const { data: rejectedSuggestion, error: updateError } = await context.supabase
    .from("slotting_suggestions")
    .update({
      status: "rejected",
      approved_by: null,
      approved_at: null,
      reasons: nextReasons,
    })
    .eq("id", suggestionId)
    .eq("status", "new")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return toActionError("Unable to reject suggestion.");
  }

  if (!rejectedSuggestion) {
    return toActionError("Unable to reject suggestion (may already be taken).");
  }

  if (intakeId) {
    revalidatePath(`/manager/pipeline/${intakeId}`);
  }

  return toActionSuccess("Suggestion rejected.");
}

export async function approveSlottingSuggestion(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const suggestionId = String(formData.get("suggestion_id") ?? "").trim();
  const allowOverbook = Boolean(formData.get("allow_overbook"));
  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!suggestionId) {
    return toActionError("Missing suggestion id.");
  }

  const { data: suggestion, error: suggestionError } = await context.supabase
    .from("slotting_suggestions")
    .select(
      "id, intake_id, student_id, tutor_id, session_date, start_time, end_time, score, reasons, status"
    )
    .eq("id", suggestionId)
    .maybeSingle();

  if (suggestionError || !suggestion) {
    return toActionError("Suggestion not found.");
  }

  const resolvedIntakeId = intakeId || suggestion.intake_id;
  const alreadyApproved = suggestion.status === "approved";

  if (suggestion.status === "rejected") {
    return toActionError("Rejected suggestions cannot be approved.");
  }

  const { data: student, error: studentError } = await context.supabase
    .from("students")
    .select("id")
    .eq("intake_id", suggestion.intake_id)
    .maybeSingle();

  if (studentError || !student) {
    return toActionError("Student not found for this intake. Approve the intake first.");
  }

  const studentId = student.id;
  if (!alreadyApproved) {
    const { data: assignment, error: assignmentError } = await context.supabase
      .from("assignments")
      .select("id, tutor_id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();

    if (assignmentError) {
      return toActionError("Unable to verify assignment.");
    }

    if (assignment && assignment.tutor_id !== suggestion.tutor_id) {
      return toActionError("Student is already assigned to a different tutor.");
    }

    let defaultLocationId: string;
    try {
      defaultLocationId = await getDefaultLocationId(context.supabase);
    } catch (error) {
      return toActionError(
        error instanceof Error ? error.message : "Unable to load default location."
      );
    }

    const { data: operatingHoursRows, error: operatingHoursError } =
      await context.supabase
        .from("operating_hours")
        .select("weekday, is_closed, open_time, close_time")
        .eq("location_id", defaultLocationId);

    if (operatingHoursError) {
      return toActionError("Unable to validate operating hours.");
    }

    const weekday = weekdayFromDateKey(suggestion.session_date);
    if (weekday === null) {
      return toActionError("Suggestion has an invalid session date.");
    }

    const operatingHoursByWeekday = mapOperatingHoursByWeekday(
      (operatingHoursRows ?? []) as OperatingHoursRow[]
    );
    if (
      !isTimeRangeWithinOperatingHours(
        operatingHoursByWeekday[weekday],
        suggestion.start_time,
        suggestion.end_time
      )
    ) {
      return toActionError("Suggestion is outside operating hours.");
    }

    const { data: existingSessions, error: existingError } = await context.supabase
      .from("sessions")
      .select("id, student_id, start_time, end_time, status")
      .eq("tutor_id", suggestion.tutor_id)
      .neq("status", "canceled")
      .eq("session_date", suggestion.session_date);

    if (existingError) {
      return toActionError("Unable to verify tutor capacity for this slot.");
    }

    const incomingStart = parseTimeToMinutes(suggestion.start_time);
    const incomingEnd = parseTimeToMinutes(suggestion.end_time);
    if (incomingStart === null || incomingEnd === null) {
      return toActionError("Suggestion has invalid start/end times.");
    }

    const overlapCount = (existingSessions ?? []).filter((row) => {
      const startMinutes = row.start_time ? parseTimeToMinutes(row.start_time) : null;
      const endMinutes = row.end_time ? parseTimeToMinutes(row.end_time) : null;
      if (startMinutes === null || endMinutes === null) {
        return false;
      }
      return incomingStart < endMinutes && incomingEnd > startMinutes;
    }).length;

    if (overlapCount >= MAX_STUDENTS_PER_TUTOR_PER_HOUR) {
      return toActionError("Tutor is at capacity for this hour.");
    }

    if (!allowOverbook) {
      const todayKey = formatDateKey(new Date());
      if (suggestion.session_date >= todayKey) {
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
          const projected = reserved + 1;
          if (projected > remaining) {
            return toActionError(
              `Upcoming sessions (${projected}) exceed membership hours remaining (${remaining}). Check “Allow scheduling beyond prepaid hours” to override.`
            );
          }
        }
      }
    }

    if (!assignment) {
      const { error: createAssignmentError } = await context.supabase
        .from("assignments")
        .insert({
          student_id: studentId,
          tutor_id: suggestion.tutor_id,
          assigned_by: context.user.id,
          status: "active",
        });

      if (createAssignmentError) {
        const { data: fallbackAssignment, error: fallbackAssignmentError } =
          await context.supabase
            .from("assignments")
            .select("id")
            .eq("student_id", studentId)
            .eq("tutor_id", suggestion.tutor_id)
            .eq("status", "active")
            .maybeSingle();

        if (fallbackAssignmentError || !fallbackAssignment) {
          return toActionError("Unable to assign tutor for this suggestion.");
        }
      }
    }

    if (!assignment) {
      const { error: createAssignmentError } = await context.supabase
        .from("assignments")
        .insert({
          student_id: studentId,
          tutor_id: suggestion.tutor_id,
          assigned_by: context.user.id,
          status: "active",
        });

      if (createAssignmentError) {
        const { data: fallbackAssignment, error: fallbackAssignmentError } =
          await context.supabase
            .from("assignments")
            .select("id")
            .eq("student_id", studentId)
            .eq("tutor_id", suggestion.tutor_id)
            .eq("status", "active")
            .maybeSingle();

        if (fallbackAssignmentError || !fallbackAssignment) {
          return toActionError("Unable to assign tutor for this suggestion.");
        }
      }
    }
  }
  if (!alreadyApproved) {
    const priorReasons = suggestion.reasons as SlottingSuggestionReasonsV1 | null;
    const nextReasons: SlottingSuggestionReasonsV1 =
      priorReasons && typeof priorReasons === "object" && "version" in priorReasons
        ? {
            ...(priorReasons as SlottingSuggestionReasonsV1),
            manager: {
              ...(priorReasons.manager ?? {}),
              decision: { kind: "approve", note: null, at: new Date().toISOString() },
            },
          }
        : {
            version: 1,
            generated: {
              intakeAvailability: {
                source: "none",
                allowedWeekdays: null,
                preferredWindows: [],
              },
              rules: { horizonDays: 0, durationMinutes: 60, capacityPerTutorHour: 0 },
              ranking: {
                dayOffset: 0,
                weekday: 0,
                startMinutes: 0,
                overlapCount: 0,
                preferenceBonus: 0,
                score: 0,
              },
            },
            manager: { decision: { kind: "approve", note: null, at: new Date().toISOString() } },
          };

    const { data: approvedSuggestion, error: approveError } = await context.supabase
      .from("slotting_suggestions")
      .update({
        status: "approved",
        student_id: studentId,
        approved_by: context.user.id,
        approved_at: new Date().toISOString(),
        reasons: nextReasons,
      })
      .eq("id", suggestionId)
      .eq("status", "new")
      .select("id")
      .maybeSingle();

    if (approveError) {
      return toActionError("Unable to approve suggestion (may already be taken).");
    }

    if (!approvedSuggestion) {
      return toActionError("Unable to approve suggestion (may already be taken).");
    }
  }

  const { data: existingStudentSession, error: existingStudentSessionError } =
    await context.supabase
      .from("sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("tutor_id", suggestion.tutor_id)
      .eq("session_date", suggestion.session_date)
      .eq("start_time", suggestion.start_time)
      .eq("end_time", suggestion.end_time)
      .neq("status", "canceled")
      .maybeSingle();

  if (existingStudentSessionError) {
    return toActionError("Unable to verify existing scheduled session.");
  }

  if (!existingStudentSession) {
    const sessionShortCode = await generateUniqueShortCode(
      context.supabase,
      "sessions",
      "SES"
    );
    const { error: sessionInsertError } = await context.supabase.from("sessions").insert({
      student_id: studentId,
      tutor_id: suggestion.tutor_id,
      created_by: context.user.id,
      status: "scheduled",
      session_date: suggestion.session_date,
      start_time: suggestion.start_time,
      end_time: suggestion.end_time,
      recurrence_rule: null,
      short_code: sessionShortCode,
    });

    if (sessionInsertError) {
      return toActionError("Suggestion approved, but unable to create session.");
    }
  }

  revalidatePath(`/manager/pipeline/${resolvedIntakeId}`);
  revalidatePath("/manager/schedule");

  return toActionSuccess("Suggestion approved and scheduled.");
}
