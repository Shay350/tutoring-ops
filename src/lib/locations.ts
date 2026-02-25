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

export async function getIntakeLocationId(
  supabase: SupabaseClient,
  intakeId: string
): Promise<string | null> {
  if (!intakeId) {
    return null;
  }

  const { data, error } = await supabase
    .from("intakes")
    .select("location_id")
    .eq("id", intakeId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load intake location.");
  }

  return data?.location_id ?? null;
}

export async function getStudentLocationId(
  supabase: SupabaseClient,
  studentId: string
): Promise<string | null> {
  if (!studentId) {
    return null;
  }

  const { data, error } = await supabase
    .from("students")
    .select("intake_id")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load student location.");
  }

  if (!data?.intake_id) {
    return null;
  }

  return getIntakeLocationId(supabase, data.intake_id);
}
