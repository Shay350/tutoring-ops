import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function TutorStudentsPage() {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, student_id, status, students(id, full_name, status)")
    .eq("status", "active");

  const studentIds = assignments?.map((assignment) => assignment.student_id) ?? [];

  const { data: sessions } = studentIds.length
    ? await supabase
        .from("sessions")
        .select("id, session_date, status, student_id, session_logs(id)")
        .in("student_id", studentIds)
        .order("session_date", { ascending: false })
    : { data: [] };

  const sessionsByStudent = (sessions ?? []).reduce<
    Record<string, typeof sessions>
  >((acc, session) => {
    if (!acc[session.student_id]) {
      acc[session.student_id] = [];
    }
    acc[session.student_id].push(session);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tutor</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Assigned students
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recent session</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments && assignments.length > 0 ? (
                assignments.map((assignment) => {
                  const studentSessions =
                    sessionsByStudent[assignment.student_id] ?? [];
                  const latestSession = studentSessions[0];
                  const hasLog = latestSession
                    ? Array.isArray(latestSession.session_logs)
                      ? latestSession.session_logs.length > 0
                      : Boolean(latestSession.session_logs)
                    : false;

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.students?.full_name ?? "Student"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {assignment.students?.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {latestSession
                          ? formatDate(latestSession.session_date)
                          : "—"}
                      </TableCell>
                      <TableCell>{studentSessions.length}</TableCell>
                      <TableCell>
                        {latestSession ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            data-testid={`student-log-${latestSession.id}`}
                          >
                            <Link href={`/tutor/sessions/${latestSession.id}/log`}>
                              {hasLog ? "Edit log" : "Log session"}
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No sessions yet
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm">
                    No assigned students yet.
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
