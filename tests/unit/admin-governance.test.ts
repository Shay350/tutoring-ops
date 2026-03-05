import { describe, expect, it } from "vitest";

import {
  ADMIN_GOVERNANCE_ERROR,
  canAssignLocationRole,
  validateRoleChangeSafeguards,
} from "../../src/lib/admin-governance";

describe("admin governance safeguards", () => {
  it("requires explicit confirmation", () => {
    const result = validateRoleChangeSafeguards({
      actorId: "admin-1",
      targetId: "manager-1",
      currentRole: "manager",
      nextRole: "tutor",
      confirmed: false,
      activeAdminCount: 2,
    });

    expect(result).toEqual({ ok: false, ...ADMIN_GOVERNANCE_ERROR.confirmationRequired });
  });

  it("blocks self-demotion from admin", () => {
    const result = validateRoleChangeSafeguards({
      actorId: "admin-1",
      targetId: "admin-1",
      currentRole: "admin",
      nextRole: "manager",
      confirmed: true,
      activeAdminCount: 2,
    });

    expect(result).toEqual({ ok: false, ...ADMIN_GOVERNANCE_ERROR.selfDemotionBlocked });
  });

  it("blocks demotion when target is the last active admin", () => {
    const result = validateRoleChangeSafeguards({
      actorId: "admin-2",
      targetId: "admin-1",
      currentRole: "admin",
      nextRole: "manager",
      confirmed: true,
      activeAdminCount: 1,
    });

    expect(result).toEqual({ ok: false, ...ADMIN_GOVERNANCE_ERROR.lastAdminDemotionBlocked });
  });

  it("allows valid confirmed role changes", () => {
    const result = validateRoleChangeSafeguards({
      actorId: "admin-2",
      targetId: "admin-1",
      currentRole: "admin",
      nextRole: "manager",
      confirmed: true,
      activeAdminCount: 2,
    });

    expect(result).toEqual({ ok: true });
  });

  it("limits assignable location roles to manager and tutor", () => {
    expect(canAssignLocationRole("manager")).toBe(true);
    expect(canAssignLocationRole("tutor")).toBe(true);
    expect(canAssignLocationRole("admin")).toBe(false);
    expect(canAssignLocationRole("customer")).toBe(false);
  });
});
