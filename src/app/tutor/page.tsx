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

export default async function TutorDashboard() {
  const supabase = await createClient();

  const [assignmentsResult, sessionsResult] = await Promise.all([
    supabase
      .from("assignments")
      .select("student_id, status")
      .eq("status", "active"),
    supabase
      .from("sessions")
      .select(
        "id, session_date, status, student_id, students(id, full_name), session_logs(id)"
      )
      .order("session_date", { ascending: true }),
  ]);

  const assignments = assignmentsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const sessionsToday = sessions.filter(
    (session) => session.session_date === todayKey
  );
  const logsToFinish = sessions.filter((session) => {
    const hasLog = Array.isArray(session.session_logs)
      ? session.session_logs.length > 0
      : Boolean(session.session_logs);

    return (
      Boolean(session.session_date) &&
      session.session_date <= todayKey &&
      !hasLog
    );
  });

  const studentCount = new Set(
    assignments.map((assignment) => assignment.student_id)
  ).size;

  const stats = [
    {
      label: "Sessions today",
      value: String(sessionsToday.length),
      detail: "Based on scheduled sessions",
    },
    {
      label: "Students",
      value: String(studentCount),
      detail: "Active assignments",
    },
    {
      label: "Logs to finish",
      value: String(logsToFinish.length),
      detail: "Sessions without a log",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tutor dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Today&apos;s focus
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900">
                {item.value}
              </div>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Log</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length > 0 ? (
                sessions.map((session) => {
                  const hasLog = Array.isArray(session.session_logs)
                    ? session.session_logs.length > 0
                    : Boolean(session.session_logs);

                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {formatDate(session.session_date)}
                      </TableCell>
                      <TableCell>
                        {session.students?.[0]?.full_name ?? "Student"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {session.status ?? "scheduled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tutor/sessions/${session.id}/log`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                          data-testid={`session-log-${session.id}`}
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
    </div>
  );
}
