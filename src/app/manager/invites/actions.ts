"use server";

import { revalidatePath } from "next/cache";

import { getActionContext } from "@/lib/actions";

export const MANAGER_INVITE_ROLE = "customer" as const;

export function isAllowedManagerInviteRole(role: string): role is typeof MANAGER_INVITE_ROLE {
  return role === MANAGER_INVITE_ROLE;
}

export async function createManagerInvite(formData: FormData): Promise<void> {
  const context = await getActionContext("manager");
  if ("error" in context) {
    return;
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "").trim().toLowerCase();

  if (!email || !isAllowedManagerInviteRole(role)) {
    return;
  }

  await context.supabase.from("invites").insert({
    email,
    role,
    created_by: context.user.id,
  });

  revalidatePath("/manager/invites");
}
