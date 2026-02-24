import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDefaultLocationId(
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase.rpc("default_location_id");

  if (error) {
    throw new Error("Unable to load default location.");
  }

  if (!data) {
    throw new Error("Default location missing. Apply the VS10 DB migration.");
  }

  return String(data);
}

