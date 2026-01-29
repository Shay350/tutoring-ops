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
import { formatDate, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerHistoryPage() {
  const supabase = await createClient();

  const [studentsResult, sessionsResult, snapshotsResult] = await Promise.all([
    supabase.from("students").select("id, full_name"),
    supabase
      .from("sessions")
      .select(
        "id, session_date, status, student_id, students(id, full_name), session_logs(id, customer_summary, topics, updated_at)"
      )
      .order("session_date", { ascending: false }),
    supabase
      .from("progress_snapshots")
      .select("id, student_id, sessions_completed, last_session_at, notes, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const students = studentsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const snapshots = snapshotsResult.data ?? [];

  const latestSnapshots = snapshots.reduce<Record<string, typeof snapshots[number]>>(
    (acc, snapshot) => {
      if (!acc[snapshot.student_id]) {
        acc[snapshot.student_id] = snapshot;
      }
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Session history
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="progress-snapshot">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Sessions completed</TableHead>
                <TableHead>Last session</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => {
                  const snapshot = latestSnapshots[student.id];

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.full_name}
                      </TableCell>
                      <TableCell>
                        {snapshot?.sessions_completed ?? "—"}
                      </TableCell>
                      <TableCell>
                        {formatDate(snapshot?.last_session_at ?? null)}
                      </TableCell>
                      <TableCell>
                        {snapshot?.notes ? (
                          <span className="text-sm text-muted-foreground">
                            {snapshot.notes}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No students yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="history-list">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length > 0 ? (
                sessions.map((session) => {
                  const studentName = session.students?.[0]?.full_name ?? "Student";
                  const log = Array.isArray(session.session_logs)
                    ? session.session_logs[0]
                    : session.session_logs ?? null;
                  const summary = log?.customer_summary;

                  return (
                    <TableRow key={session.id} data-testid="history-item">
                      <TableCell className="font-medium">
                        {formatDate(session.session_date)}
                      </TableCell>
                      <TableCell>{studentName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {session.status ?? "Scheduled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {summary ? (
                          <div className="text-sm text-muted-foreground">
                            {summary}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Awaiting tutor summary.
                          </span>
                        )}
                        {log?.updated_at ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Updated {formatDateTime(log.updated_at)}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    No sessions yet.
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
