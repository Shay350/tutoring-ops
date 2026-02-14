import { Badge } from "@/components/ui/badge";
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
import { formatDateKey } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerSchedulePage() {
  const supabase = await createClient();
  const todayKey = formatDateKey(new Date());

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, student_id, session_date, start_time, end_time, status, students(id, full_name)"
    )
    .gte("session_date", todayKey)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  const sessionRows = sessions ?? [];

  const studentIds = Array.from(
    new Set(
      sessionRows
        .map((session) => session.student_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: memberships } = studentIds.length
    ? await supabase
        .from("memberships")
        .select("student_id, hours_remaining")
        .in("student_id", studentIds)
    : { data: [] };

  const hoursRemainingByStudent = (memberships ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      const remaining = Number(row.hours_remaining);
      if (row.student_id && Number.isFinite(remaining)) {
        acc[row.student_id] = Math.max(0, Math.floor(remaining));
      }
      return acc;
    },
    {}
  );

  const shownCountByStudent: Record<string, number> = {};
  const visibleSessions = sessionRows.filter((session) => {
    const studentId = session.student_id;
    if (!studentId) {
      return true;
    }

    const limit = hoursRemainingByStudent[studentId];
    if (limit === undefined) {
      return true;
    }

    const current = shownCountByStudent[studentId] ?? 0;
    if (current >= limit) {
      return false;
    }

    shownCountByStudent[studentId] = current + 1;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Upcoming sessions
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="upcoming-sessions">
              {visibleSessions.length > 0 ? (
                visibleSessions.map((session) => (
                  <TableRow key={session.id} data-testid="upcoming-session-row">
                    <TableCell className="font-medium">
                      {formatDate(session.session_date)}
                    </TableCell>
                    <TableCell>
                      {formatTimeRange(session.start_time, session.end_time)}
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
                    No upcoming sessions yet.
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
