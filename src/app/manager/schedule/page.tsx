import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getDefaultLocationId, listLocationsForManager } from "@/lib/locations";
import type { OperatingHoursRow } from "@/lib/operating-hours";
import { normalizeOperatingHours } from "@/lib/operating-hours";
import {
  addDaysUtc,
  formatDateKey,
  getWeekDates,
  getWeekStart,
  parseDateKey,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import LocationFilter from "./location-filter";
import OperatingHoursForm from "./operating-hours-form";
import RecurringSessionForm from "./recurring-session-form";
import WeekCalendar from "./week-calendar";

type SearchParams = { week?: string | string[]; location?: string | string[] };

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function ManagerSchedulePage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const weekParam = Array.isArray(resolvedSearchParams?.week)
    ? resolvedSearchParams?.week[0]
    : resolvedSearchParams?.week;
  const locationParam = Array.isArray(resolvedSearchParams?.location)
    ? resolvedSearchParams?.location[0]
    : resolvedSearchParams?.location;

  const anchorDate = weekParam ? parseDateKey(weekParam) : new Date();
  const weekStart = getWeekStart(anchorDate ?? new Date());
  const weekDates = getWeekDates(weekStart);

  const locations = await listLocationsForManager(supabase, user.id);

  let defaultLocationId: string | null = null;
  try {
    defaultLocationId = await getDefaultLocationId(supabase);
  } catch {
    defaultLocationId = null;
  }

  const locationIds = new Set(locations.map((location) => location.id));
  const selectedLocationId = locationParam && locationIds.has(locationParam)
    ? locationParam
    : defaultLocationId && locationIds.has(defaultLocationId)
      ? defaultLocationId
      : locations[0]?.id ?? null;

  let sessionsQuery = supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, status, tutor_id, student_id, location_id, students(id, full_name)"
    )
    .gte("session_date", weekDates[0])
    .lte("session_date", weekDates[6]);

  if (selectedLocationId) {
    sessionsQuery = sessionsQuery.eq("location_id", selectedLocationId);
  }

  const { data: sessions } = await sessionsQuery
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const sessionRows = sessions ?? [];
  const tutorIds = Array.from(
    new Set(sessionRows.map((session) => session.tutor_id).filter(Boolean))
  );

  const { data: assignmentRowsRaw } = await supabase
    .from("assignments")
    .select("student_id, tutor_id, students(id, full_name, intake_id)")
    .eq("status", "active");

  const intakeIds = Array.from(
    new Set(
      (assignmentRowsRaw ?? [])
        .map((row) => row.students?.[0]?.intake_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: intakeRows } = intakeIds.length
    ? await supabase.from("intakes").select("id, location_id").in("id", intakeIds)
    : { data: [] };

  const intakeLocationById = (intakeRows ?? []).reduce<Record<string, string>>(
    (acc, intake) => {
      if (intake.id && intake.location_id) {
        acc[intake.id] = intake.location_id;
      }
      return acc;
    },
    {}
  );

  const assignmentRows = (assignmentRowsRaw ?? []).filter((row) => {
    if (!selectedLocationId) {
      return true;
    }
    const intakeId = row.students?.[0]?.intake_id;
    if (!intakeId) {
      return false;
    }
    return intakeLocationById[intakeId] === selectedLocationId;
  });

  const assignmentTutorIds = Array.from(
    new Set(assignmentRows.map((row) => row.tutor_id).filter(Boolean))
  );

  const profileIds = Array.from(new Set([...tutorIds, ...assignmentTutorIds]));
  const { data: tutorProfiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };

  const tutorNames = (tutorProfiles ?? []).reduce<Record<string, string>>(
    (acc, profile) => {
      if (profile.id) {
        acc[profile.id] = profile.full_name ?? "Tutor";
      }
      return acc;
    },
    {}
  );

  const sessionsByDate = sessionRows.reduce<Record<string, typeof sessionRows>>(
    (acc, session) => {
      const key = session.session_date ?? "";
      if (!key) {
        return acc;
      }
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(session);
      return acc;
    },
    {}
  );

  const assignmentOptions = assignmentRows.map((assignment) => {
    const studentName = assignment.students?.[0]?.full_name ?? "Student";
    const tutorName = tutorNames[assignment.tutor_id ?? ""] ?? "Tutor";
    return {
      value: `${assignment.student_id}|${assignment.tutor_id}`,
      label: `${studentName} — ${tutorName}`,
    };
  });

  const prevWeek = formatDateKey(addDaysUtc(weekStart, -7));
  const nextWeek = formatDateKey(addDaysUtc(weekStart, 7));
  const capacityPerSlot = Math.max(Object.keys(tutorNames).length, 1);

  const operatingHoursQuery = supabase
    .from("operating_hours")
    .select("weekday, is_closed, open_time, close_time")
    .order("weekday", { ascending: true });

  const { data: operatingHoursData, error: operatingHoursError } =
    selectedLocationId
      ? await operatingHoursQuery.eq("location_id", selectedLocationId)
      : await operatingHoursQuery;

  const operatingHours = normalizeOperatingHours(
    (operatingHoursData ?? []) as OperatingHoursRow[]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Master schedule
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LocationFilter
            locations={locations}
            selectedLocationId={selectedLocationId}
          />
          <Link
            href={`/manager/schedule?week=${prevWeek}${selectedLocationId ? `&location=${selectedLocationId}` : ""}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Previous week
          </Link>
          <Link
            href={`/manager/schedule?week=${nextWeek}${selectedLocationId ? `&location=${selectedLocationId}` : ""}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Next week
          </Link>
        </div>
      </div>

      <RecurringSessionForm
        assignments={assignmentOptions}
        defaultStartDate={weekDates[0]}
        defaultEndDate={weekDates[6]}
      />

      <OperatingHoursForm
        hours={operatingHours}
        locationId={selectedLocationId}
        disabledReason={
          operatingHoursError
            ? "Operating hours are not available yet (apply VS8 DB migration to enable editing)."
            : undefined
        }
      />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Week overview</h2>
          <Badge variant="secondary">
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </Badge>
        </div>

        <WeekCalendar
          weekDates={weekDates}
          sessionsByDate={sessionsByDate}
          tutorNames={tutorNames}
          operatingHours={operatingHours}
          capacityPerSlot={capacityPerSlot}
        />
      </div>
    </div>
  );
}
