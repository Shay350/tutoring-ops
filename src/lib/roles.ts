export const ROLES = ["customer", "tutor", "manager"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string | null | undefined): value is Role {
  if (!value) return false;
  return ROLES.includes(value as Role);
}

export function roleToPath(role: Role): `/${Role}` {
  return `/${role}`;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "customer":
      return "Customer";
    case "tutor":
      return "Tutor";
    case "manager":
      return "Manager";
  }
}
