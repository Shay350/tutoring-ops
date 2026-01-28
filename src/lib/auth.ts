import "server-only";

import { redirect } from "next/navigation";

import { resolveRolePath, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type RoleLookupResult = {
  role: string | null;
};

async function fetchProfileRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<RoleLookupResult>();

  if (error) {
    return null;
  }

  return typeof data?.role === "string" ? data.role : null;
}

function extractMetadataRole(user: { user_metadata?: unknown; app_metadata?: unknown }) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = user.app_metadata as Record<string, unknown> | undefined;

  if (typeof metadata?.role === "string") {
    return metadata.role;
  }

  if (typeof appMetadata?.role === "string") {
    return appMetadata.role;
  }

  return null;
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

  const profileRole = await fetchProfileRole(supabase, user.id);
  const role = profileRole ?? extractMetadataRole(user);

  if (role !== requiredRole) {
    redirect(resolveRolePath(role ?? undefined));
  }
}
