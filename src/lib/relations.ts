export function getSingle<T>(value?: T | T[] | null): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}
