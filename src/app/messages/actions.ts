"use server";

import { revalidatePath } from "next/cache";

import {
  getActionContext,
  toActionError,
  toActionSuccess,
} from "@/lib/actions";
import type { ActionState } from "@/lib/action-state";
import { markThreadRead, sendMessage } from "@/lib/messaging-server";

const allowedRoles = new Set(["customer", "manager"]);

export async function sendMessageAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext();
  if ("error" in context) {
    return toActionError(context.error);
  }

  if (!allowedRoles.has(context.profile.role ?? "")) {
    return toActionError("You do not have access to perform this action.");
  }

  const threadId = String(formData.get("thread_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!threadId) {
    return toActionError("Missing thread id.");
  }

  if (!body) {
    return toActionError("Message cannot be empty.");
  }

  const { error } = await sendMessage(
    context.supabase,
    context.user.id,
    threadId,
    body
  );

  if (error) {
    return toActionError(error);
  }

  revalidatePath("/customer/messages");
  revalidatePath("/manager/messages");

  return toActionSuccess("Message sent.");
}

export async function markThreadReadAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const context = await getActionContext();
  if ("error" in context) {
    return toActionError(context.error);
  }

  if (!allowedRoles.has(context.profile.role ?? "")) {
    return toActionError("You do not have access to perform this action.");
  }

  const threadId = String(formData.get("thread_id") ?? "").trim();

  if (!threadId) {
    return toActionError("Missing thread id.");
  }

  const { error } = await markThreadRead(
    context.supabase,
    context.user.id,
    threadId
  );

  if (error) {
    return toActionError(error);
  }

  revalidatePath("/customer/messages");
  revalidatePath("/manager/messages");

  return toActionSuccess("Thread marked as read.");
}
