export function isUuid(value?: string | null): boolean {
  if (!value) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function normalizeShortCode(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

export function deriveShortCodeCandidates(value?: string | null): string[] {
  const normalized = normalizeShortCode(value).replace(/[^A-Z0-9-]/g, "");
  if (!normalized) {
    return [];
  }

  const withoutRoleSuffix = normalized.replace(/(MANAGER|TUTOR|CUSTOMER)$/, "");

  return Array.from(
    new Set(
      [normalized, withoutRoleSuffix].filter(
        (candidate) => candidate.length > 0
      )
    )
  );
}
