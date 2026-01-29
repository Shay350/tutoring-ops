import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeRange } from "@/lib/format";
import {
  addDaysUtc,
  formatDateKey,
  getWeekDates,
  getWeekStart,
  parseDateKey,
} from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import RecurringSessionForm from "./recurring-session-form";

type SearchParams = { week?: string | string[] };

export default async function ManagerSchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const weekParam = Array.isArray(searchParams.week)
    ? searchParams.week[0]
    : searchParams.week;
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

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Week overview</h2>
          <Badge variant="secondary">
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </Badge>
        </div>

        {weekDates.map((dateKey) => {
          const rows = sessionsByDate[dateKey] ?? [];
          return (
            <Card key={dateKey}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{formatDate(dateKey)}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {rows.length} sessions
                </Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Tutor</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">
                            {formatTimeRange(
                              session.start_time,
                              session.end_time
                            )}
                          </TableCell>
                          <TableCell>
                            {tutorNames[session.tutor_id ?? ""] ?? "Tutor"}
                          </TableCell>
                          <TableCell>
                            {session.students?.[0]?.full_name ?? "Student"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {session.status ?? "scheduled"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm">
                          No sessions scheduled.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
