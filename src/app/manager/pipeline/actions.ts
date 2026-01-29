"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

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

  const { error: studentError } = await context.supabase
    .from("students")
    .insert({
      intake_id: intakeResult.data.id,
      customer_id: intakeResult.data.customer_id,
      full_name: intakeResult.data.student_name,
      status: "active",
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
  const status = String(formData.get("status") ?? "scheduled").trim();
  const intakeId = String(formData.get("intake_id") ?? "").trim();

  if (!studentId || !tutorId) {
    return toActionError("Student and tutor are required.");
  }

  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return toActionError("Provide a valid session date.");
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

  const { error } = await context.supabase.from("sessions").insert({
    student_id: studentId,
    tutor_id: tutorId,
    created_by: context.user.id,
    status: status || "scheduled",
    session_date: sessionDate,
  });

  if (error) {
    return toActionError("Unable to create session.");
  }

  revalidatePath("/manager");
  revalidatePath("/manager/pipeline");
  if (intakeId) {
    revalidatePath(`/manager/pipeline/${intakeId}`);
  }

  return toActionSuccess("Session created.");
}
