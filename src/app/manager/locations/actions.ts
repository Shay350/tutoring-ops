"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";

export async function createLocation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const active = formData.get("active") !== null;

  if (!name) {
    return toActionError("Location name is required.");
  }

  const { error } = await context.supabase.from("locations").insert({
    name,
    notes: notes || null,
    active,
  });

  if (error) {
    return toActionError("Unable to create location.");
  }

  revalidatePath("/manager/locations");
  return toActionSuccess("Location created.");
}

export async function updateLocation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return toActionError(context.error);
  }

  const locationId = String(formData.get("location_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const active = formData.get("active") !== null;

  if (!locationId) {
    return toActionError("Missing location id.");
  }

  if (!name) {
    return toActionError("Location name is required.");
  }

  const { data, error } = await context.supabase
    .from("locations")
    .update({
      name,
      notes: notes || null,
      active,
    })
    .eq("id", locationId)
    .select("id")
    .maybeSingle();

  if (error) {
    return toActionError("Unable to save location.");
  }

  if (!data) {
    return toActionError("Location not found or no access.");
  }

  revalidatePath("/manager/locations");
  return toActionSuccess("Location updated.");
}
