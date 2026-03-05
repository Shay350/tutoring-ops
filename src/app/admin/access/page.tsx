import { assignableRoles, inviteRoles } from "@/app/admin/actions";
import {
  AdminMembershipAssignForm,
  AdminMembershipRemoveButton,
  AdminRoleForm,
} from "@/app/admin/governance-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canAssignLocationRole } from "@/lib/admin-governance";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAccessPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: locations }, { data: profileLocations }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, pending")
      .eq("pending", false)
      .order("created_at", { ascending: true }),
    supabase.from("locations").select("id, name").eq("active", true).order("name", { ascending: true }),
    supabase.from("profile_locations").select("profile_id, location_id, locations(id, name)"),
  ]);

  const membershipsByProfile = new Map<string, Array<{ id: string; name: string }>>();

  for (const row of profileLocations ?? []) {
    const location = Array.isArray(row.locations) ? row.locations[0] : row.locations;
    if (!location) {
      continue;
    }

    const existing = membershipsByProfile.get(row.profile_id) ?? [];
    existing.push({ id: location.id, name: location.name });
    membershipsByProfile.set(row.profile_id, existing);
  }

  return (
    <div className="space-y-6" data-testid="admin-access-page">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Access governance</h1>
        <p className="text-sm text-muted-foreground">
          Role updates require confirmation and include safeguards for admin continuity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(profiles ?? []).map((profile) => (
            <AdminRoleForm
              key={profile.id}
              profile={{
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role as Role,
              }}
              roles={inviteRoles}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location memberships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(profiles ?? []).map((profile) => {
            const currentMemberships = membershipsByProfile.get(profile.id) ?? [];
            const roleAssignable = canAssignLocationRole(profile.role);

            return (
              <div key={profile.id} className="rounded-md border p-3" data-testid={`admin-membership-row-${profile.id}`}>
                <p className="text-sm font-medium text-slate-900">
                  {profile.full_name ?? profile.email ?? profile.id} <span className="text-xs text-muted-foreground">({profile.role})</span>
                </p>
                {roleAssignable ? (
                  <>
                    {locations && locations.length > 0 ? (
                      <AdminMembershipAssignForm profileId={profile.id} locations={locations} />
                    ) : (
                      <p className="text-xs text-muted-foreground">No locations available.</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentMemberships.length > 0 ? (
                        currentMemberships.map((location) => (
                          <AdminMembershipRemoveButton
                            key={`${profile.id}-${location.id}`}
                            profileId={profile.id}
                            location={location}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No assigned locations.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground" data-testid={`admin-membership-readonly-${profile.id}`}>
                    Location assignment is only available for {assignableRoles.join(" and ")} roles.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
