"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { computeBillingDecision } from "@/lib/membership";
import type { SessionTimeSlot } from "@/lib/schedule";
import { findOverlap, validateTimeRange } from "@/lib/schedule";
import { generateUniqueShortCode } from "@/lib/short-codes";
import type { SupabaseClient } from "@supabase/supabase-js";

type SessionBillingRow = {
  id: string;
  student_id: string;
  status: string | null;
  billed_to_membership: boolean | null;
};

async function applySessionBilling({
  supabase,
  session,
  actorId,
}: {
  supabase: SupabaseClient;
  session: SessionBillingRow;
  actorId: string;
}): Promise<string | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, hours_remaining")
    .eq("student_id", session.student_id)
    .maybeSingle();

  if (membershipError || !membership) {
    return "Membership not found for this student.";
  }

  const decision = computeBillingDecision({
    sessionStatus: session.status,
    billedToMembership: session.billed_to_membership,
    hoursRemaining: membership.hours_remaining,
  });

  if (decision.error) {
    return decision.error;
  }

  if (!decision.shouldBill) {
    return null;
  }

  const { error: updateError } = await supabase
    .from("memberships")
    .update({ hours_remaining: decision.nextHoursRemaining })
    .eq("id", membership.id);

  if (updateError) {
    return "Unable to update membership hours.";
  }

  const { error: adjustmentError } = await supabase
    .from("membership_adjustments")
    .insert({
      membership_id: membership.id,
      actor_id: actorId,
      delta_hours: -1,
      reason: `Session ${session.id} completed`,
    });

  if (adjustmentError) {
    return "Membership hours updated, but audit log failed.";
  }

  const { error: sessionUpdateError } = await supabase
    .from("sessions")
    .update({ billed_to_membership: true })
    .eq("id", session.id);

  if (sessionUpdateError) {
    return "Membership billed, but session billing flag failed.";
  }

  return null;
}

export async function approveIntake(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!intakeId) {
    return toActionError("Missing intake id.");
  }

  const [intakeResult, studentResult] = await Promise.all([
    context.supabase
      .from("intakes")
      .select("id, customer_id, student_name, status")
      .eq("id", intakeId)
      .maybeSingle(),
    context.supabase
      .from("students")
      .select("id")
      .eq("intake_id", intakeId)
      .maybeSingle(),
  ]);

  if (intakeResult.error || !intakeResult.data) {
    return toActionError("Intake not found.");
  }

  if (studentResult.error) {
    return toActionError("Unable to verify existing student.");
  }

  if (studentResult.data) {
    return toActionError("Student already created for this intake.");
  }

  if (intakeResult.data.status === "approved") {
    return toActionError("This intake has already been approved.");
  }

  const studentShortCode = await generateUniqueShortCode(
    context.supabase,
    "students",
    "STU"
  );

  const { error: studentError } = await context.supabase
    .from("students")
    .insert({
      intake_id: intakeResult.data.id,
      customer_id: intakeResult.data.customer_id,
      full_name: intakeResult.data.student_name,
      status: "active",
      short_code: studentShortCode,
    });

  if (studentError) {
    return toActionError("Unable to create student from intake.");
  }

  const { error: intakeError } = await context.supabase
    .from("intakes")
    .update({ status: "approved" })
    .eq("id", intakeId);

  if (intakeError) {
    return toActionError(
      "Student created, but intake status failed to update."
    );
  }

  revalidatePath("/manager");
  revalidatePath("/manager/pipeline");
  revalidatePath(`/manager/pipeline/${intakeId}`);

  return toActionSuccess("Intake approved and student created.");
}

export async function assignTutor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  const tutorId = String(formData.get("tutor_id") ?? "").trim();
  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!studentId || !tutorId) {
    return toActionError("Student and tutor are required.");
  }

  const [assignmentResult, tutorResult] = await Promise.all([
    context.supabase
      .from("assignments")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle(),
    context.supabase
      .from("profiles")
      .select("id, role")
      .eq("id", tutorId)
      .maybeSingle(),
  ]);

  if (assignmentResult.error || tutorResult.error) {
    return toActionError("Unable to validate assignment details.");
  }

  if (assignmentResult.data) {
    return toActionError("This student already has an active tutor.");
  }

  if (!tutorResult.data || tutorResult.data.role !== "tutor") {
    return toActionError("Select a valid tutor.");
  }

  const { error } = await context.supabase.from("assignments").insert({
    student_id: studentId,
    tutor_id: tutorId,
    assigned_by: context.user.id,
    status: "active",
  });

  if (error) {
    return toActionError("Unable to assign tutor. Please try again.");
  }

  revalidatePath("/manager");
  revalidatePath("/manager/pipeline");
  revalidatePath("/manager/schedule");
  if (intakeId) {
    revalidatePath(`/manager/pipeline/${intakeId}`);
  }

  return toActionSuccess("Tutor assigned successfully.");
}

export async function createSession(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  const tutorId = String(formData.get("tutor_id") ?? "").trim();
  const sessionDate = String(formData.get("session_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const status = String(formData.get("status") ?? "scheduled").trim();
  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!studentId || !tutorId) {
    return toActionError("Student and tutor are required.");
  }

  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return toActionError("Provide a valid session date.");
  }

  const timeError = validateTimeRange(startTime, endTime);
  if (timeError) {
    return toActionError(timeError);
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

  const { data: existingSessions, error: existingError } = await context.supabase
    .from("sessions")
    .select("session_date, start_time, end_time")
    .eq("tutor_id", tutorId)
    .eq("session_date", sessionDate);

  if (existingError) {
    return toActionError("Unable to verify tutor availability.");
  }

  const overlapMessage = findOverlap(existingSessions ?? [], [
    {
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
    } satisfies SessionTimeSlot,
  ]);

  if (overlapMessage) {
    return toActionError(overlapMessage);
  }

  const sessionShortCode = await generateUniqueShortCode(
    context.supabase,
    "sessions",
    "SES"
  );

  const { data: sessionRow, error } = await context.supabase
    .from("sessions")
    .insert({
      student_id: studentId,
      tutor_id: tutorId,
      created_by: context.user.id,
      status: status || "scheduled",
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      short_code: sessionShortCode,
    })
    .select("id, student_id, status, billed_to_membership")
    .maybeSingle();

  if (error || !sessionRow) {
    return toActionError("Unable to create session.");
  }

  if (status === "completed") {
    const billingError = await applySessionBilling({
      supabase: context.supabase,
      session: sessionRow,
      actorId: context.user.id,
    });

    if (billingError) {
      return toActionError(`Session created, but ${billingError}`);
    }
  }

  revalidatePath("/manager");
  revalidatePath("/manager/pipeline");
  if (intakeId) {
    revalidatePath(`/manager/pipeline/${intakeId}`);
  }
  if (status === "completed") {
    revalidatePath("/manager/students");
    revalidatePath("/customer/membership");
    revalidatePath("/tutor/students");
  }

  return toActionSuccess("Session created.");
}

export async function completeSession(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const sessionId = String(formData.get("session_id") ?? "").trim();
  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!sessionId) {
    return toActionError("Missing session id.");
  }

  const { data: session, error: sessionError } = await context.supabase
    .from("sessions")
    .select("id, student_id, status, billed_to_membership")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return toActionError("Session not found.");
  }

  let sessionForBilling: SessionBillingRow = session;

  if (session.status !== "completed") {
    const { data: updatedSession, error: updateError } = await context.supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", sessionId)
      .select("id, student_id, status, billed_to_membership")
      .maybeSingle();

    if (updateError || !updatedSession) {
      return toActionError("Unable to complete session.");
    }

    sessionForBilling = updatedSession;
  }

  if (sessionForBilling.billed_to_membership) {
    revalidatePath("/manager");
    revalidatePath("/manager/pipeline");
    if (intakeId) {
      revalidatePath(`/manager/pipeline/${intakeId}`);
    }
    revalidatePath(`/manager/students/${sessionForBilling.student_id}`);
    revalidatePath("/tutor/students");
    return toActionSuccess("Session already billed.");
  }

  const billingError = await applySessionBilling({
    supabase: context.supabase,
    session: sessionForBilling,
    actorId: context.user.id,
  });

  if (billingError) {
    return toActionError(billingError);
  }

  revalidatePath("/manager");
  revalidatePath("/manager/pipeline");
  if (intakeId) {
    revalidatePath(`/manager/pipeline/${intakeId}`);
  }
  revalidatePath(`/manager/students/${sessionForBilling.student_id}`);
  revalidatePath("/customer/membership");
  revalidatePath("/tutor/students");

  return toActionSuccess("Session completed and billed.");
}
