"use client";

import { useFormState } from "react-dom";

import {
  assignLocationMembership,
  createAdminInvite,
  initialGovernanceActionState,
  unassignLocationMembership,
  updateProfileRole,
  type GovernanceActionState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/roles";

function FormMessage({ state, testId }: { state: GovernanceActionState; testId: string }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      data-testid={testId}
      className={state.status === "error" ? "text-xs text-red-600" : "text-xs text-emerald-600"}
    >
      {state.status === "error" && state.code ? `[${state.code}] ` : ""}
      {state.message}
    </p>
  );
}

export function AdminInviteForm({ roles }: { roles: Role[] }) {
  const [state, formAction] = useFormState(createAdminInvite, initialGovernanceActionState);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-3" data-testid="admin-invite-form">
      <div className="space-y-2">
        <Label htmlFor="admin-invite-email">Email</Label>
        <Input id="admin-invite-email" name="email" type="email" required data-testid="admin-invite-email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-invite-role">Role</Label>
        <select
          id="admin-invite-role"
          name="role"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="customer"
          data-testid="admin-invite-role"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-3">
        <Button type="submit" data-testid="admin-invite-submit">Create invite</Button>
        <FormMessage state={state} testId="admin-invite-message" />
      </div>
    </form>
  );
}

export function AdminRoleForm({
  profile,
  roles,
}: {
  profile: { id: string; full_name: string | null; email: string | null; role: Role };
  roles: Role[];
}) {
  const [state, formAction] = useFormState(updateProfileRole, initialGovernanceActionState);

  return (
    <form action={formAction} className="grid gap-3 border rounded-md p-3" data-testid={`admin-access-row-${profile.id}`}>
      <input type="hidden" name="profile_id" value={profile.id} />
      <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{profile.full_name ?? "Unnamed user"}</p>
          <p className="text-xs text-muted-foreground">{profile.email ?? profile.id}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`admin-role-select-${profile.id}`}>Role</Label>
          <select
            id={`admin-role-select-${profile.id}`}
            name="next_role"
            defaultValue={profile.role}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            data-testid={`admin-role-select-${profile.id}`}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" data-testid={`admin-role-submit-${profile.id}`}>Save role</Button>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-slate-700" data-testid={`admin-role-confirm-wrapper-${profile.id}`}>
        <input type="checkbox" name="confirm_role_change" value="confirm" data-testid={`admin-role-confirm-${profile.id}`} />
        I understand this can change access immediately.
      </label>

      <FormMessage state={state} testId={`admin-role-message-${profile.id}`} />
    </form>
  );
}

export function AdminMembershipAssignForm({
  profileId,
  locations,
}: {
  profileId: string;
  locations: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useFormState(assignLocationMembership, initialGovernanceActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2" data-testid={`admin-membership-assign-${profileId}`}>
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="space-y-1">
        <Label htmlFor={`assign-location-${profileId}`}>Add location</Label>
        <select
          id={`assign-location-${profileId}`}
          name="location_id"
          className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
          data-testid={`admin-membership-location-${profileId}`}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" data-testid={`admin-membership-assign-submit-${profileId}`}>
        Assign
      </Button>
      <FormMessage state={state} testId={`admin-membership-assign-message-${profileId}`} />
    </form>
  );
}

export function AdminMembershipRemoveButton({
  profileId,
  location,
}: {
  profileId: string;
  location: { id: string; name: string };
}) {
  const [state, formAction] = useFormState(unassignLocationMembership, initialGovernanceActionState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2" data-testid={`admin-membership-chip-${profileId}-${location.id}`}>
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="location_id" value={location.id} />
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{location.name}</span>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        data-testid={`admin-membership-remove-${profileId}-${location.id}`}
      >
        Remove
      </Button>
      <FormMessage state={state} testId={`admin-membership-remove-message-${profileId}-${location.id}`} />
    </form>
  );
}
