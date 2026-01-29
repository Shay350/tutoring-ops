import "server-only";

import { isProfileBlocked } from "@/lib/auth-utils";
import type { ActionState } from "@/lib/action-state";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ActionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string };
  profile: { role: string | null; pending: boolean | null; full_name?: string | null };
};

type ActionContextError = { error: string };

export async function getActionContext(
  requiredRole?: Role
): Promise<ActionContext | ActionContextError> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return { error: "You must be signed in to continue." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, pending, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Your account is missing a profile. Contact a manager." };
  }

  if (isProfileBlocked(profile)) {
    return { error: "Your access is pending approval." };
  }

  if (requiredRole && profile.role !== requiredRole) {
    return { error: "You do not have access to perform this action." };
  }

  return {
    supabase,
    user: { id: user.id },
    profile,
  };
}

export function toActionError(message: string): ActionState {
  return { status: "error", message };
}

export function toActionSuccess(message: string): ActionState {
  return { status: "success", message };
}
