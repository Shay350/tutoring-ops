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

/**
 * Contract surface (VS11.1): role authorization options for server actions.
 *
 * - `requiredRole`: exact role match.
 * - `anyOfRoles`: any role from this set.
 * - When both are provided, both checks must pass.
 */
type ActionContextRoleOptions = {
  requiredRole?: Role;
  anyOfRoles?: Role[];
};

function resolveRoleOptions(
  optionsOrRequiredRole?: Role | ActionContextRoleOptions
): ActionContextRoleOptions {
  if (!optionsOrRequiredRole) {
    return {};
  }

  if (typeof optionsOrRequiredRole === "string") {
    return { requiredRole: optionsOrRequiredRole };
  }

  return optionsOrRequiredRole;
}

export async function getActionContext(
  optionsOrRequiredRole?: Role | ActionContextRoleOptions
): Promise<ActionContext | ActionContextError> {
  const { requiredRole, anyOfRoles } = resolveRoleOptions(optionsOrRequiredRole);

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

  if (anyOfRoles && !anyOfRoles.includes(profile.role as Role)) {
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
