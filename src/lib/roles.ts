export const ROLE_PATHS = {
  customer: "/customer",
  tutor: "/tutor",
  manager: "/manager",
} as const;

export type Role = keyof typeof ROLE_PATHS;

export function isRole(value: string | null | undefined): value is Role {
  return typeof value === "string" && value in ROLE_PATHS;
}

export function roleToPath(role: Role): (typeof ROLE_PATHS)[Role] {
  return ROLE_PATHS[role];
}

export function resolveRolePath(
  role: string | null | undefined,
  fallback = "/login"
): string {
  return isRole(role) ? ROLE_PATHS[role] : fallback;
}
