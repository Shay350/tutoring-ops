import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

export async function submitIntake(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";

  const context = await getActionContext("customer");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const studentName = String(formData.get("student_name") ?? "").trim();
  const studentGrade = String(formData.get("student_grade") ?? "").trim();
  const subjectsRaw = String(formData.get("subjects") ?? "");
  const availability = String(formData.get("availability") ?? "").trim();
  const goals = String(formData.get("goals") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!studentName) {
    return toActionError("Student name is required.");
  }

  if (!studentGrade) {
    return toActionError("Student grade is required.");
  }

  const subjects = subjectsRaw
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);

  if (subjects.length === 0) {
    return toActionError("Add at least one subject.");
  }

  if (!availability) {
    return toActionError("Availability is required.");
  }

  if (!goals) {
    return toActionError("Goals are required.");
  }

  if (!location) {
    return toActionError("Location is required.");
  }

  const { error } = await context.supabase.from("intakes").insert({
    customer_id: context.user.id,
    status: "submitted",
    student_name: studentName,
    student_grade: studentGrade,
    subjects,
    availability,
    goals,
    location,
  });

  if (error) {
    return toActionError("Unable to submit intake. Please try again.");
  }

  revalidatePath("/customer");
  revalidatePath("/customer/intake");

  return toActionSuccess(
    "Intake submitted. A manager will review it shortly."
  );
}
