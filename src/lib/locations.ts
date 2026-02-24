import type { SupabaseClient } from "@supabase/supabase-js";

export type LocationOption = {
  id: string;
  name: string;
  active: boolean;
};

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

export async function listLocations(
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<LocationOption[]> {
  const activeOnly = options?.activeOnly ?? false;

  let query = supabase
    .from("locations")
    .select("id, name, active")
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Unable to load locations.");
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    active: Boolean(row.active),
  }));
}

export async function getLocationIdForIntake(
  supabase: SupabaseClient,
  intakeId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("intakes")
    .select("location_id")
    .eq("id", intakeId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load intake location.");
  }

  if (data?.location_id) {
    return String(data.location_id);
  }

  return getDefaultLocationId(supabase);
}

export async function getLocationIdForStudent(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("intake_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    throw new Error("Unable to load student location.");
  }

  if (!student?.intake_id) {
    return getDefaultLocationId(supabase);
  }

  return getLocationIdForIntake(supabase, String(student.intake_id));
}
