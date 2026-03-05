import type { Role } from "@/lib/roles";

export const ADMIN_GOVERNANCE_ERROR = {
  confirmationRequired: {
    code: "CONFIRMATION_REQUIRED",
    message: "Confirm this role change before saving.",
  },
  selfDemotionBlocked: {
    code: "SELF_DEMOTION_BLOCKED",
    message: "You cannot remove your own admin role.",
  },
  lastAdminDemotionBlocked: {
    code: "LAST_ADMIN_DEMOTION_BLOCKED",
    message: "At least one admin must remain.",
  },
  invalidRoleAssignment: {
    code: "INVALID_ROLE_ASSIGNMENT",
    message: "Only manager and tutor profiles can be assigned to locations.",
  },
} as const;

export type GovernanceErrorCode =
  | (typeof ADMIN_GOVERNANCE_ERROR)[keyof typeof ADMIN_GOVERNANCE_ERROR]["code"]
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "DB_ERROR";

export type GovernanceResult =
  | { ok: true }
  | {
      ok: false;
      code: GovernanceErrorCode;
      message: string;
    };

export function canAssignLocationRole(role: string | null | undefined): boolean {
  return role === "manager" || role === "tutor";
}

export function validateRoleChangeSafeguards(input: {
  actorId: string;
  targetId: string;
  currentRole: Role;
  nextRole: Role;
  confirmed: boolean;
  activeAdminCount: number;
}): GovernanceResult {
  if (!input.confirmed) {
    return { ok: false, ...ADMIN_GOVERNANCE_ERROR.confirmationRequired };
  }

  const isDemotingAdmin = input.currentRole === "admin" && input.nextRole !== "admin";

  if (isDemotingAdmin && input.actorId === input.targetId) {
    return { ok: false, ...ADMIN_GOVERNANCE_ERROR.selfDemotionBlocked };
  }

  if (isDemotingAdmin && input.activeAdminCount <= 1) {
    return { ok: false, ...ADMIN_GOVERNANCE_ERROR.lastAdminDemotionBlocked };
  }

  return { ok: true };
}
