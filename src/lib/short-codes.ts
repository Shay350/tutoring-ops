import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type ShortCodeTable = "intakes" | "students" | "sessions";

export function buildShortCode(prefix: string, length = 6): string {
  const token = randomUUID().replace(/-/g, "").slice(0, length).toUpperCase();
  return `${prefix.toUpperCase()}-${token}`;
}

export async function generateUniqueShortCode(
  supabase: SupabaseClient,
  table: ShortCodeTable,
  prefix: string,
  attempts = 5
): Promise<string> {
  for (let i = 0; i < attempts; i += 1) {
    const code = buildShortCode(prefix);
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("short_code", code)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to verify short code for ${table}.`);
    }

    if (!data) {
      return code;
    }
  }

  throw new Error(`Unable to generate unique short code for ${table}.`);
}
