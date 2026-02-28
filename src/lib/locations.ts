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

export async function listManagerLocationIds(
  supabase: SupabaseClient,
  managerId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("profile_locations")
    .select("location_id")
    .eq("profile_id", managerId);

  if (error) {
    throw new Error("Unable to load manager locations.");
  }

  return new Set(
    (data ?? [])
      .map((row) => row.location_id)
      .filter((value): value is string => Boolean(value))
  );
}

export async function listLocationsForManager(
  supabase: SupabaseClient,
  managerId: string,
  options?: { activeOnly?: boolean }
): Promise<LocationOption[]> {
  const [locations, locationIds] = await Promise.all([
    listLocations(supabase, options),
    listManagerLocationIds(supabase, managerId),
  ]);

  return locations.filter((location) => locationIds.has(location.id));
}

export async function requireManagerLocationAccess(
  supabase: SupabaseClient,
  managerId: string,
  locationId: string
): Promise<void> {
  if (!locationId) {
    throw new Error("Missing location context.");
  }

  const allowedLocationIds = await listManagerLocationIds(supabase, managerId);

  if (!allowedLocationIds.has(locationId)) {
    throw new Error("You do not have access to this location.");
  }
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
