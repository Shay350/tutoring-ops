import "server-only";

import { redirect } from "next/navigation";

import { isProfileBlocked } from "@/lib/auth-utils";
import { resolveRolePath, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type RoleLookupResult = {
  role: string | null;
  pending: boolean | null;
};

type ProfileRecord = RoleLookupResult | null;

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<ProfileRecord> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, pending")
    .eq("id", userId)
    .maybeSingle<RoleLookupResult>();

  if (error) {
    return null;
  }

  return data ?? null;
}

export async function requireRole(requiredRole: Role): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/login");
  }

  const profile = await fetchProfile(supabase, user.id);

  if (!profile) {
    redirect("/login");
  }

  if (isProfileBlocked(profile)) {
    redirect("/no-access");
  }

  const role = typeof profile.role === "string" ? profile.role : null;

  if (role !== requiredRole) {
    redirect(resolveRolePath(role ?? undefined));
  }
}
