import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRole, roleToPath, type Role } from "@/lib/roles";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !isRole(data.role)) {
    return { user, profile: null };
  }

  return {
    user,
    profile: {
      id: data.id,
      role: data.role,
      full_name: data.full_name,
    },
  };
}

export async function requireRole(expectedRole: Role) {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile) {
    redirect("/login");
  }

  if (profile.role !== expectedRole) {
    redirect(roleToPath(profile.role));
  }

  return { user, profile };
}
