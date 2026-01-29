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
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

  type SessionRow = NonNullable<typeof sessions>[number];

  const sessionsByStudent = (sessions ?? []).reduce<Record<string, SessionRow[]>>(
    (acc, session) => {
    if (!session) {
      return acc;
    }
    const studentId = session.student_id;
    if (!studentId) {
      return acc;
    }
      if (!acc[studentId]) {
        acc[studentId] = [];
      }
      acc[studentId].push(session as SessionRow);
      return acc;
    },
    {}
  );

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
                  const student = Array.isArray(assignment.students)
                    ? assignment.students[0]
                    : assignment.students;
                  const hasLog = latestSession
                    ? Array.isArray(latestSession.session_logs)
                      ? latestSession.session_logs.length > 0
                      : Boolean(latestSession.session_logs)
                    : false;

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {student?.full_name ?? "Student"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {student?.status ?? "active"}
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
                          <Link
                            href={`/tutor/sessions/${latestSession.id}/log`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" })
                            )}
                            data-testid={`student-log-${latestSession.id}`}
                          >
                            {hasLog ? "Edit log" : "Log session"}
                          </Link>
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
