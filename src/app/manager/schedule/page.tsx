import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getDefaultLocationId } from "@/lib/locations";
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

import OperatingHoursForm from "./operating-hours-form";
import RecurringSessionForm from "./recurring-session-form";
import WeekCalendar from "./week-calendar";

type SearchParams = { week?: string | string[] };

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function ManagerSchedulePage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const weekParam = Array.isArray(resolvedSearchParams?.week)
    ? resolvedSearchParams?.week[0]
    : resolvedSearchParams?.week;
  const anchorDate = weekParam ? parseDateKey(weekParam) : new Date();
  const weekStart = getWeekStart(anchorDate ?? new Date());
  const weekDates = getWeekDates(weekStart);

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, status, tutor_id, student_id, students(id, full_name)"
    )
    .gte("session_date", weekDates[0])
    .lte("session_date", weekDates[6])
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const sessionRows = sessions ?? [];
  const tutorIds = Array.from(
    new Set(sessionRows.map((session) => session.tutor_id).filter(Boolean))
  );

  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select("student_id, tutor_id, students(id, full_name)")
    .eq("status", "active");

  const assignmentTutorIds = Array.from(
    new Set((assignmentRows ?? []).map((row) => row.tutor_id).filter(Boolean))
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

  const sessionsByDate = sessionRows.reduce<
    Record<string, typeof sessionRows>
  >((acc, session) => {
    const key = session.session_date ?? "";
    if (!key) {
      return acc;
    }
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(session);
    return acc;
  }, {});

  const assignmentOptions = (assignmentRows ?? []).map((assignment) => {
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

  let defaultLocationId: string | null = null;
  try {
    defaultLocationId = await getDefaultLocationId(supabase);
  } catch {
    defaultLocationId = null;
  }

  const operatingHoursQuery = supabase
    .from("operating_hours")
    .select("weekday, is_closed, open_time, close_time")
    .order("weekday", { ascending: true });

  const { data: operatingHoursData, error: operatingHoursError } =
    defaultLocationId
      ? await operatingHoursQuery.eq("location_id", defaultLocationId)
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
          <Link
            href={`/manager/schedule?week=${prevWeek}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Previous week
          </Link>
          <Link
            href={`/manager/schedule?week=${nextWeek}`}
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
