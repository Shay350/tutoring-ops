"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { validateMembershipAdjustment } from "@/lib/membership";

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

const membershipStatuses = new Set(["active", "paused", "cancelled", "trial"]);

export async function saveMembership(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const planType = String(formData.get("plan_type") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const hoursTotal = parseNumber(formData.get("hours_total"));
  const hoursRemainingInput = parseNumber(formData.get("hours_remaining"));
  const renewalDate = String(formData.get("renewal_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!studentId) {
    return toActionError("Missing student id.");
  }

  if (!planType) {
    return toActionError("Plan type is required.");
  }

  if (!membershipStatuses.has(status)) {
    return toActionError("Select a valid membership status.");
  }

  if (hoursTotal === null || hoursTotal < 0) {
    return toActionError("Total hours must be a positive number.");
  }

  if (!membershipId) {
    if (hoursRemainingInput === null || hoursRemainingInput < 0) {
      return toActionError("Starting hours remaining are required.");
    }

    if (hoursRemainingInput > hoursTotal) {
      return toActionError("Hours remaining cannot exceed total hours.");
    }
  }

  const payload: Record<string, unknown> = {
    student_id: studentId,
    plan_type: planType,
    status,
    hours_total: hoursTotal,
    renewal_date: renewalDate || null,
    notes: notes || null,
  };

  if (!membershipId) {
    payload.hours_remaining = hoursRemainingInput ?? 0;
  }

  if (membershipId) {
    const { error } = await context.supabase
      .from("memberships")
      .update(payload)
      .eq("id", membershipId);

    if (error) {
      return toActionError("Unable to update membership.");
    }
  } else {
    const { error } = await context.supabase
      .from("memberships")
      .insert(payload);

    if (error) {
      return toActionError("Unable to create membership.");
    }
  }

  revalidatePath("/manager/students");
  revalidatePath(`/manager/students/${studentId}`);
  revalidatePath("/customer/membership");
  revalidatePath(`/customer/students/${studentId}`);
  revalidatePath("/tutor/students");

  return toActionSuccess("Membership saved.");
}

export async function adjustMembershipHours(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const deltaHours = parseNumber(formData.get("delta_hours"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!membershipId) {
    return toActionError("Missing membership id.");
  }

  if (deltaHours === null) {
    return toActionError("Adjustment hours are required.");
  }

  const validationError = validateMembershipAdjustment({
    deltaHours,
    reason,
  });

  if (validationError) {
    return toActionError(validationError);
  }

  const { data: membership, error: membershipError } = await context.supabase
    .from("memberships")
    .select("id, hours_remaining")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipError || !membership) {
    return toActionError("Membership not found.");
  }

  const currentHours = membership.hours_remaining ?? 0;
  const nextHours = currentHours + deltaHours;

  if (nextHours < 0) {
    return toActionError("Hours remaining cannot go below 0.");
  }

  const { error: updateError } = await context.supabase
    .from("memberships")
    .update({ hours_remaining: nextHours })
    .eq("id", membershipId);

  if (updateError) {
    return toActionError("Unable to update membership hours.");
  }

  const { error: adjustmentError } = await context.supabase
    .from("membership_adjustments")
    .insert({
      membership_id: membershipId,
      actor_id: context.user.id,
      delta_hours: deltaHours,
      reason,
    });

  if (adjustmentError) {
    return toActionError("Hours updated, but audit log failed.");
  }

  revalidatePath("/manager/students");
  if (studentId) {
    revalidatePath(`/manager/students/${studentId}`);
    revalidatePath(`/customer/students/${studentId}`);
  }
  revalidatePath("/customer/membership");
  revalidatePath("/tutor/students");

  return toActionSuccess("Membership hours updated.");
}
