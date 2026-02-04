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
