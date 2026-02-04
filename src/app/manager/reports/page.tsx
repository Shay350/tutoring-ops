import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatHours } from "@/lib/format";
import { computeDurationHours, getMonthRange, normalizeMonth } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";


type SearchParams = { month?: string | string[] };

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type SessionRow = {
  id: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  billed_to_membership: boolean | null;
  student_id: string | null;
  tutor_id: string | null;
  students?: { full_name: string | null }[] | null;
};

type StudentSummary = {
  studentId: string;
  studentName: string;
  sessionCount: number;
  totalHours: number;
  billedCount: number;
  lastSessionDate: string | null;
};

type TutorSummary = {
  tutorId: string;
  tutorName: string;
  sessionCount: number;
  totalHours: number;
  activeStudents: number;
};

export default async function ManagerReportsPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawMonth = Array.isArray(resolvedSearchParams?.month)
    ? resolvedSearchParams?.month[0]
    : resolvedSearchParams?.month;

  const requestedMonth = normalizeMonth(rawMonth);
  const monthRange = getMonthRange(rawMonth);

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, status, billed_to_membership, student_id, tutor_id, students(full_name)"
    )
    .gte("session_date", monthRange.startDate)
    .lte("session_date", monthRange.endDate)
    .neq("status", "canceled")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const sessionRows = (sessions ?? []) as SessionRow[];
  const tutorIds = Array.from(
    new Set(sessionRows.map((session) => session.tutor_id).filter(Boolean))
  ) as string[];

  const { data: tutorProfiles } = tutorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", tutorIds)
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

  const studentSummaryMap = new Map<string, StudentSummary>();
  const tutorSummaryMap = new Map<
    string,
    TutorSummary & { studentIds: Set<string> }
  >();

  for (const session of sessionRows) {
    if (!session.student_id || !session.tutor_id) {
      continue;
    }

    const studentName = session.students?.[0]?.full_name ?? "Student";
    const hours = computeDurationHours(session.start_time, session.end_time);
    const billedCount = session.billed_to_membership ? 1 : 0;
    const sessionDate = session.session_date ?? null;

    const studentEntry = studentSummaryMap.get(session.student_id) ?? {
      studentId: session.student_id,
      studentName,
      sessionCount: 0,
      totalHours: 0,
      billedCount: 0,
      lastSessionDate: null,
    };

    studentEntry.sessionCount += 1;
    studentEntry.totalHours += hours;
    studentEntry.billedCount += billedCount;
    if (
      sessionDate &&
      (!studentEntry.lastSessionDate || sessionDate > studentEntry.lastSessionDate)
    ) {
      studentEntry.lastSessionDate = sessionDate;
    }

    studentSummaryMap.set(session.student_id, studentEntry);

    const tutorName = tutorNames[session.tutor_id] ?? "Tutor";
    const tutorEntry = tutorSummaryMap.get(session.tutor_id) ?? {
      tutorId: session.tutor_id,
      tutorName,
      sessionCount: 0,
      totalHours: 0,
      activeStudents: 0,
      studentIds: new Set<string>(),
    };

    tutorEntry.sessionCount += 1;
    tutorEntry.totalHours += hours;
    tutorEntry.studentIds.add(session.student_id);

    tutorSummaryMap.set(session.tutor_id, tutorEntry);
  }

  const studentSummaries = Array.from(studentSummaryMap.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName)
  );

  const tutorSummaries = Array.from(tutorSummaryMap.values())
    .map((entry) => ({
      tutorId: entry.tutorId,
      tutorName: entry.tutorName,
      sessionCount: entry.sessionCount,
      totalHours: entry.totalHours,
      activeStudents: entry.studentIds.size,
    }))
    .sort((a, b) => a.tutorName.localeCompare(b.tutorName));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Manager</p>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                name="month"
                type="month"
                defaultValue={monthRange.month}
                data-testid="reports-month"
                required
              />
            </div>
            <Button type="submit">Load</Button>
            <div className="text-sm text-muted-foreground">
              {monthRange.label}
            </div>
          </form>
          {rawMonth && !requestedMonth ? (
            <p className="text-sm text-amber-700">
              Invalid month provided. Showing {monthRange.label} instead.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Totals exclude canceled sessions.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href={`/manager/reports/export/sessions?month=${monthRange.month}`}
              data-testid="export-sessions"
            >
              Export sessions CSV
            </a>
            <a
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href={`/manager/reports/export/session-logs?month=${monthRange.month}`}
              data-testid="export-logs"
            >
              Export session logs CSV
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="reports-student-table">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Total hours</TableHead>
                <TableHead>Billed sessions</TableHead>
                <TableHead>Last session</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentSummaries.length > 0 ? (
                studentSummaries.map((summary) => (
                  <TableRow key={summary.studentId}>
                    <TableCell className="font-medium">
                      {summary.studentName}
                    </TableCell>
                    <TableCell>{summary.sessionCount}</TableCell>
                    <TableCell>{formatHours(summary.totalHours)}</TableCell>
                    <TableCell>{summary.billedCount}</TableCell>
                    <TableCell>{formatDate(summary.lastSessionDate)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    No sessions for this month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tutor summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="reports-tutor-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tutor</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Total hours</TableHead>
                <TableHead>Active students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tutorSummaries.length > 0 ? (
                tutorSummaries.map((summary) => (
                  <TableRow key={summary.tutorId}>
                    <TableCell className="font-medium">
                      {summary.tutorName}
                    </TableCell>
                    <TableCell>{summary.sessionCount}</TableCell>
                    <TableCell>{formatHours(summary.totalHours)}</TableCell>
                    <TableCell>{summary.activeStudents}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No sessions for this month.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
