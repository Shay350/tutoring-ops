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

type SearchParams = { week?: string | string[] };

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function TutorSchedulePage({
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
      "id, short_code, session_date, start_time, end_time, status, students(id, full_name), session_logs(id)"
    )
    .gte("session_date", weekDates[0])
    .lte("session_date", weekDates[6])
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const sessionRows = sessions ?? [];
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

  const prevWeek = formatDateKey(addDaysUtc(weekStart, -7));
  const nextWeek = formatDateKey(addDaysUtc(weekStart, 7));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tutor</p>
          <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tutor/schedule?week=${prevWeek}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Previous week
          </Link>
          <Link
            href={`/tutor/schedule?week=${nextWeek}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Next week
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Week overview
          </h2>
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
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Log</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((session) => {
                        const hasLog = Array.isArray(session.session_logs)
                          ? session.session_logs.length > 0
                          : Boolean(session.session_logs);

                        const sessionCode = session.short_code ?? session.id;

                        return (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium">
                              {formatTimeRange(
                                session.start_time,
                                session.end_time
                              )}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/tutor/sessions/${sessionCode}/log`}
                                className="font-medium text-sky-700 hover:underline"
                                data-testid="session-row"
                              >
                                {session.students?.[0]?.full_name ?? "Student"}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {session.status ?? "scheduled"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/tutor/sessions/${sessionCode}/log`}
                                className={cn(
                                  buttonVariants({ variant: "outline", size: "sm" })
                                )}
                                data-testid={`schedule-log-${session.id}`}
                              >
                                {hasLog ? "Edit log" : "Start log"}
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm">
                          No sessions scheduled yet.
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
