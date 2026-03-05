import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("VS11 selector contract", () => {
  it("keeps stable selectors for admin governance flows", () => {
    const forms = readSource("src/app/admin/governance-forms.tsx");
    expect(forms).toContain('data-testid="admin-invite-email"');
    expect(forms).toContain('data-testid="admin-invite-role"');
    expect(forms).toContain('data-testid="admin-invite-submit"');
    expect(forms).toContain('data-testid={`admin-role-select-${profile.id}`}');
    expect(forms).toContain('data-testid={`admin-role-submit-${profile.id}`}');
    expect(forms).toContain('data-testid={`admin-role-confirm-${profile.id}`}');
    expect(forms).toContain('data-testid={`admin-membership-assign-submit-${profileId}`}');
    expect(forms).toContain('data-testid={`admin-membership-remove-${profileId}-${location.id}`}');
  });

  it("keeps stable selectors for manager/admin boundary pages", () => {
    const managerInvites = readSource("src/app/manager/invites/page.tsx");
    const managerLocations = readSource("src/app/manager/locations/page.tsx");
    const adminSchedule = readSource("src/app/admin/schedule/page.tsx");
    const adminStudents = readSource("src/app/admin/students/page.tsx");
    const operationalStudents = readSource("src/app/manager/students/page.tsx");

    expect(managerInvites).toContain('data-testid="manager-invite-boundary"');
    expect(managerInvites).toContain('data-testid="manager-invite-role"');
    expect(managerLocations).toContain('data-testid="manager-locations-boundary"');
    expect(managerLocations).toContain('data-testid="locations-list"');
    expect(adminSchedule).toContain('data-testid="admin-schedule-entry"');
    expect(adminStudents).toContain('testId="admin-students-entry"');
    expect(operationalStudents).toContain("data-testid={testId}");
  });
});
