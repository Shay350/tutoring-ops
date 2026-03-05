"use server";

import { revalidatePath } from "next/cache";

import { getActionContext } from "@/lib/actions";
import {
  ADMIN_GOVERNANCE_ERROR,
  canAssignLocationRole,
  type GovernanceErrorCode,
  validateRoleChangeSafeguards,
} from "@/lib/admin-governance";
import type { Role } from "@/lib/roles";

type GovernanceActionState = {
  status: "idle" | "success" | "error";
  code: GovernanceErrorCode | "";
  message: string;
};

export const initialGovernanceActionState: GovernanceActionState = {
  status: "idle",
  code: "",
  message: "",
};

function ok(message: string): GovernanceActionState {
  return { status: "success", code: "", message };
}

function fail(code: GovernanceErrorCode, message: string): GovernanceActionState {
  return { status: "error", code, message };
}

const inviteRoles: Role[] = ["admin", "manager", "tutor", "customer"];
const assignableRoles: Role[] = ["manager", "tutor"];

export async function createAdminInvite(
  _prev: GovernanceActionState,
  formData: FormData
): Promise<GovernanceActionState> {
  const context = await getActionContext({ anyOfRoles: ["admin"] });
  if ("error" in context) {
    return fail("AUTH_ERROR", context.error);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;

  if (!email || !inviteRoles.includes(role)) {
    return fail("VALIDATION_ERROR", "Invite email and role are required.");
  }

  const { error } = await context.supabase.from("invites").upsert(
    {
      email,
      role,
      created_by: context.user.id,
      used_at: null,
      used_by: null,
    },
    { onConflict: "email" }
  );

  if (error) {
    return fail("DB_ERROR", "Unable to create invite.");
  }

  revalidatePath("/admin/invites");
  return ok("Invite created.");
}

export async function updateProfileRole(
  _prev: GovernanceActionState,
  formData: FormData
): Promise<GovernanceActionState> {
  const context = await getActionContext({ anyOfRoles: ["admin"] });
  if ("error" in context) {
    return fail("AUTH_ERROR", context.error);
  }

  const targetId = String(formData.get("profile_id") ?? "").trim();
  const nextRole = String(formData.get("next_role") ?? "").trim() as Role;
  const confirmValue = String(formData.get("confirm_role_change") ?? "").trim();

  if (!targetId || !inviteRoles.includes(nextRole)) {
    return fail("VALIDATION_ERROR", "Profile and role are required.");
  }

  const { data: target, error: targetError } = await context.supabase
    .from("profiles")
    .select("id, role, pending")
    .eq("id", targetId)
    .maybeSingle<{ id: string; role: Role; pending: boolean | null }>();

  if (targetError) {
    return fail("DB_ERROR", "Unable to load selected profile.");
  }

  if (!target || target.pending) {
    return fail("VALIDATION_ERROR", "Selected profile is not eligible for role updates.");
  }

  if (!inviteRoles.includes(target.role)) {
    return fail("VALIDATION_ERROR", "Current role is not supported for admin governance.");
  }

  if (target.role === nextRole) {
    return ok("Role unchanged.");
  }

  const { count, error: adminCountError } = await context.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("pending", false);

  if (adminCountError) {
    return fail("DB_ERROR", "Unable to validate admin safeguards.");
  }

  const safeguard = validateRoleChangeSafeguards({
    actorId: context.user.id,
    targetId,
    currentRole: target.role,
    nextRole,
    confirmed: confirmValue === "confirm",
    activeAdminCount: count ?? 0,
  });

  if (!safeguard.ok) {
    return fail(safeguard.code, safeguard.message);
  }

  const { error: updateError } = await context.supabase.rpc("admin_change_user_role", {
    p_profile_id: targetId,
    p_new_role: nextRole,
    p_reason: null,
  });

  if (updateError) {
    return fail("DB_ERROR", "Unable to update role.");
  }

  revalidatePath("/admin/access");
  return ok("Role updated.");
}

export async function assignLocationMembership(
  _prev: GovernanceActionState,
  formData: FormData
): Promise<GovernanceActionState> {
  const context = await getActionContext({ anyOfRoles: ["admin"] });
  if ("error" in context) {
    return fail("AUTH_ERROR", context.error);
  }

  const profileId = String(formData.get("profile_id") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "").trim();

  if (!profileId || !locationId) {
    return fail("VALIDATION_ERROR", "Profile and location are required.");
  }

  const { data: profile, error: profileError } = await context.supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle<{ role: Role }>();

  if (profileError || !profile) {
    return fail("DB_ERROR", "Unable to load profile for location assignment.");
  }

  if (!canAssignLocationRole(profile.role)) {
    return fail(
      ADMIN_GOVERNANCE_ERROR.invalidRoleAssignment.code,
      ADMIN_GOVERNANCE_ERROR.invalidRoleAssignment.message
    );
  }

  const { error } = await context.supabase.from("profile_locations").upsert(
    {
      profile_id: profileId,
      location_id: locationId,
    },
    { onConflict: "profile_id,location_id" }
  );

  if (error) {
    return fail("DB_ERROR", "Unable to assign location membership.");
  }

  revalidatePath("/admin/access");
  revalidatePath("/admin/locations");
  return ok("Location membership assigned.");
}

export async function unassignLocationMembership(
  _prev: GovernanceActionState,
  formData: FormData
): Promise<GovernanceActionState> {
  const context = await getActionContext({ anyOfRoles: ["admin"] });
  if ("error" in context) {
    return fail("AUTH_ERROR", context.error);
  }

  const profileId = String(formData.get("profile_id") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "").trim();

  if (!profileId || !locationId) {
    return fail("VALIDATION_ERROR", "Profile and location are required.");
  }

  const { data: profile, error: profileError } = await context.supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle<{ role: Role }>();

  if (profileError || !profile) {
    return fail("DB_ERROR", "Unable to load profile for location unassignment.");
  }

  if (!canAssignLocationRole(profile.role)) {
    return fail(
      ADMIN_GOVERNANCE_ERROR.invalidRoleAssignment.code,
      ADMIN_GOVERNANCE_ERROR.invalidRoleAssignment.message
    );
  }

  const { error } = await context.supabase
    .from("profile_locations")
    .delete()
    .eq("profile_id", profileId)
    .eq("location_id", locationId);

  if (error) {
    return fail("DB_ERROR", "Unable to remove location membership.");
  }

  revalidatePath("/admin/access");
  revalidatePath("/admin/locations");
  return ok("Location membership removed.");
}

export type { GovernanceActionState };
export { assignableRoles, inviteRoles };
